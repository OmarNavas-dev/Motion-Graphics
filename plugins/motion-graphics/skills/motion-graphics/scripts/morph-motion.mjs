// Geometry that genuinely changes shape, with frame-independent evaluation.
// Paths are authored as polygon point rings; no DOM or animation clocks required.
const finite = n => Number.isFinite(n);
const clamp = t => Math.max(0, Math.min(1, t));
export const easeInOut = t => { const v = clamp(t); return v * v * (3 - 2 * v); };

function checkRing(points, name) {
  if (!Array.isArray(points) || points.length < 3 || points.some(p => !finite(p.x) || !finite(p.y)))
    throw new Error(`${name} requiere al menos 3 puntos {x,y} finitos`);
}

/** Uniform arclength resampling avoids mismatched SVG point counts. */
export function resampleClosedPath(points, count = 64) {
  checkRing(points, 'points');
  if (!Number.isInteger(count) || count < 3 || count > 2048) throw new Error('count fuera de rango');
  const segments = points.map((p, i) => {
    const q = points[(i + 1) % points.length];
    return { p, q, length: Math.hypot(q.x - p.x, q.y - p.y) };
  });
  const perimeter = segments.reduce((s, v) => s + v.length, 0);
  if (perimeter < 1e-9) throw new Error('La geometría tiene perímetro cero');
  const result = [];
  for (let i = 0; i < count; i++) {
    let distance = i * perimeter / count;
    for (const seg of segments) {
      if (distance <= seg.length || seg === segments[segments.length - 1]) {
        const t = seg.length ? Math.min(1, distance / seg.length) : 0;
        result.push({ x: seg.p.x + (seg.q.x - seg.p.x) * t, y: seg.p.y + (seg.q.y - seg.p.y) * t });
        break;
      }
      distance -= seg.length;
    }
  }
  return result;
}

function perimeterSquared(points) {
  return points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length];
    return sum + Math.hypot(p.x - q.x, p.y - q.y);
  }, 0);
}

function aligned(target, reference) {
  const n = reference.length;
  let best = target, score = Infinity;
  for (const reverse of [false, true]) {
    const ring = reverse ? [...target].reverse() : target;
    for (let offset = 0; offset < n; offset++) {
      let cost = 0;
      for (let i = 0; i < n; i++) {
        const a = reference[i], b = ring[(i + offset) % n];
        cost += (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
      }
      if (cost < score) { score = cost; best = ring.slice(offset).concat(ring.slice(0, offset)); }
    }
  }
  return best;
}

export function morphPolygon(from, to, { points = 48, align = true } = {}) {
  const start = resampleClosedPath(from, points), rawEnd = resampleClosedPath(to, points);
  const end = align ? aligned(rawEnd, start) : rawEnd;
  return t => {
    const k = easeInOut(t);
    return start.map((p, i) => ({ x: p.x + (end[i].x - p.x) * k, y: p.y + (end[i].y - p.y) * k }));
  };
}

export function polygonPath(points, precision = 2) {
  checkRing(points, 'points');
  if (!Number.isInteger(precision) || precision < 0 || precision > 6) throw new Error('Precisión inválida');
  return 'M' + points.map(p => `${p.x.toFixed(precision)},${p.y.toFixed(precision)}`).join(' L') + ' Z';
}

/** Time-local morph with optional meaningful hold and final state. */
export function morphTrack(from, to, { start = 0, end = 1, points = 48 } = {}) {
  if (!(end > start)) throw new Error('Intervalo inválido');
  const sample = morphPolygon(from, to, { points });
  return time => polygonPath(sample((time - start) / (end - start)));
}

/** Changes a vector object's silhouette at fixed center; not whole-object scale. */
export function pulseDeform(points, { center, amount = .08, cycles = 1 } = {}) {
  checkRing(points, 'points');
  if (!finite(amount) || !finite(cycles) || cycles < 0) throw new Error('Pulso inválido');
  const pivot = center ?? { x: points.reduce((s,p)=>s+p.x,0)/points.length, y: points.reduce((s,p)=>s+p.y,0)/points.length };
  return t => {
    const phase = Math.sin(2 * Math.PI * cycles * clamp(t));
    return points.map((p,i) => {
      const ux = p.x - pivot.x, uy = p.y - pivot.y;
      const local = 1 + amount * phase * (0.75 + .25 * Math.sin(i * 2.4));
      return { x: pivot.x + ux * local, y: pivot.y + uy * (2 - local) };
    });
  };
}

export function geometryHealth(points) {
  checkRing(points, 'points');
  return { perimeter: perimeterSquared(points), bbox: {
    left: Math.min(...points.map(p=>p.x)), top: Math.min(...points.map(p=>p.y)),
    right: Math.max(...points.map(p=>p.x)), bottom: Math.max(...points.map(p=>p.y))
  } };
}
