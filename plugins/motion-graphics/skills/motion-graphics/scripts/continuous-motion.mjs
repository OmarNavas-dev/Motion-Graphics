// Motion Studio authoring helpers. Inspired by deterministic, time-indexed
// animation techniques; this is an independent implementation.
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const finite = (v, name) => {
  if (!Number.isFinite(v)) throw new Error(`${name} debe ser finito`);
  return v;
};

/** Damped unit-step response, sampled at arbitrary times. */
export function spring(t, { frequency = 14, damping = 1 } = {}) {
  finite(t, 't');
  if (!(frequency > 0) || !(damping > 0)) throw new Error('frequency y damping deben ser positivos');
  if (t <= 0) return 0;
  if (damping < 1 - 1e-6) {
    const wd = frequency * Math.sqrt(1 - damping ** 2);
    return 1 - Math.exp(-damping * frequency * t) *
      (Math.cos(wd * t) + damping * frequency / wd * Math.sin(wd * t));
  }
  if (damping > 1 + 1e-6) {
    const q = frequency * Math.sqrt(damping * damping - 1);
    const r1 = -damping * frequency + q;
    const r2 = -damping * frequency - q;
    return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
  }
  return 1 - Math.exp(-frequency * t) * (1 + frequency * t);
}

/** Keys: {time, value, frequency?, damping?}; output is independent of call order. */
export function springTrack(initial, keys, defaults = {}) {
  finite(initial, 'initial');
  if (!Array.isArray(keys)) throw new Error('keys debe ser una lista');
  let previousTime = -Infinity;
  let previousValue = initial;
  const deltas = keys.map((key, i) => {
    const time = finite(key.time, `keys[${i}].time`);
    const value = finite(key.value, `keys[${i}].value`);
    if (time < previousTime) throw new Error('Las claves deben ordenarse por tiempo');
    const delta = value - previousValue;
    previousValue = value;
    previousTime = time;
    return { time, delta, frequency: key.frequency ?? defaults.frequency ?? 14,
      damping: key.damping ?? defaults.damping ?? 1 };
  });
  return t => initial + deltas.reduce((sum, k) =>
    sum + k.delta * spring(t - k.time, k), 0);
}

/** C2 smoothstep for unambiguous in/out poses and camera keys. */
export function smoothstep(t) {
  const u = clamp(t);
  return u * u * u * (u * (u * 6 - 15) + 10);
}

/** Piecewise camera path; no persistent state or frame-rate dependence. */
export function cameraPath(keys) {
  if (!Array.isArray(keys) || !keys.length) throw new Error('La cámara necesita claves');
  let last = -Infinity;
  for (const [i, k] of keys.entries()) {
    for (const p of ['time', 'x', 'y', 'zoom']) finite(k[p], `camara[${i}].${p}`);
    if (k.zoom <= 0 || k.time <= last) throw new Error('Claves de cámara inválidas');
    last = k.time;
  }
  return t => {
    if (t <= keys[0].time) return { ...keys[0] };
    if (t >= keys[keys.length - 1].time) return { ...keys[keys.length - 1] };
    const i = keys.findIndex(k => k.time > t);
    const a = keys[i - 1], b = keys[i];
    const u = smoothstep((t - a.time) / (b.time - a.time));
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u,
      zoom: a.zoom + (b.zoom - a.zoom) * u };
  };
}

/** Vertical parabolic trajectory between two contact positions. */
export function contactArc({ start, end, t0, t1, lift = 0 }) {
  if (!(t1 > t0) || lift < 0) throw new Error('Intervalo o altura de arco inválidos');
  for (const p of [start.x, start.y, end.x, end.y, lift]) finite(p, 'arco');
  return t => {
    const u = clamp((t - t0) / (t1 - t0));
    return { x: start.x + (end.x - start.x) * u,
      y: start.y + (end.y - start.y) * u - 4 * lift * u * (1 - u) };
  };
}

/** Uniform diagnostics without requiring a browser. */
export function inspectMotion(track, { start = 0, end, fps = 30, maxStep = Infinity } = {}) {
  if (!(end > start) || !(fps > 0) || !(maxStep > 0)) throw new Error('Parámetros de inspección inválidos');
  const issues = [];
  let previous = track(start);
  let largestStep = 0;
  const total = Math.ceil((end - start) * fps);
  for (let i = 1; i <= total; i++) {
    const t = Math.min(end, start + i / fps);
    const current = track(t);
    const dx = current.x - previous.x, dy = current.y - previous.y;
    const distance = Math.hypot(dx, dy);
    if (!Number.isFinite(distance)) issues.push({ time: t, kind: 'nonfinite' });
    else if (distance > maxStep) issues.push({ time: t, kind: 'large-step', distance });
    largestStep = Math.max(largestStep, distance);
    previous = current;
  }
  return { fps, frames: total + 1, largestStep, issues };
}
