// Shared authoring contract. Metadata describes intent; only authored code animates it.
import {normalizeMotionCheckpoints,normalizeNarrationCue} from './motion-sequence.mjs';
const finite = (n) => typeof n === "number" && Number.isFinite(n);
const str = (v, max = 800) =>
  String(v ?? "")
    .trim()
    .slice(0, max);
const list = (v, max, label) => {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > max)
    throw Error(`${label}: se admite una lista de hasta ${max} elementos.`);
  return v;
};
const id = (v) => {
  const s = str(v, 60);
  if (!/^[A-Za-z][\w-]*$/.test(s))
    throw Error("Identificador de actor o acción inválido.");
  return s;
};
const states = (v) => {
  if (v === undefined) return {};
  if (
    !v ||
    typeof v !== "object" ||
    Array.isArray(v) ||
    Object.keys(v).length > 80
  )
    throw Error("Estado de continuidad inválido.");
  return Object.fromEntries(
    Object.entries(v).map(([k, value]) => [id(k), str(value, 600)]),
  );
};
export function normalizeActors(raw) {
  const seen = new Set();
  return list(raw, 80, "Actores").map((a) => {
    const key = id(a?.id);
    if (seen.has(key)) throw Error(`Actor duplicado: ${key}.`);
    seen.add(key);
    return {
      id: key,
      name: str(a.name, 100),
      appearance: str(a.appearance, 1600),
      parts: list(a.parts, 40, "Partes").map((p) => str(p, 100)),
      initialState: str(a.initialState, 600),
    };
  });
}
export function normalizeWordTimings(raw, total) {
  let previous = -Infinity;
  return list(raw, 15000, "Palabras").map((w, index) => {
    const text = str(w?.text ?? w?.word ?? w?.w, 160),
      start = w?.start ?? w?.s,
      end = w?.end ?? w?.e;
    if (
      !text ||
      !finite(start) ||
      !finite(end) ||
      start < 0 ||
      end <= start ||
      start < previous ||
      end > total + 0.05
    ) {
      throw Error(
        `Palabra ${index + 1}: texto o tiempos globales inválidos; no se reescalan automáticamente.`,
      );
    }
    previous = start;
    return {
      text,
      start,
      end,
      emphasis: w.emphasis === true || w.box === true,
    };
  });
}
export function normalizeDirection(raw, duration) {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw))
    throw Error("Ficha explicativa inválida.");
  const normalizeTransform = value => {
    if(!value || typeof value!=='object' || Array.isArray(value))throw Error('Movimiento de acción requiere from/to numéricos.');
    const allowed=new Set(['scale','x','y','rotation','opacity']);
    const out={};
    for(const [key,num] of Object.entries(value)){
      if(!allowed.has(key)||!finite(num))throw Error('Transformación inválida: '+key);
      if(['x','y'].includes(key)&&Math.abs(num)>10000)throw Error('Desplazamiento fuera de límites.');
      if(key==='scale'&&(num<0.05||num>10))throw Error('Escala fuera de límites.');
      if(key==='opacity'&&(num<0||num>1))throw Error('Opacidad fuera de límites.');
      out[key]=num;
    }
    return out;
  };
  const normalizeMotion=motion=>{
    if(!motion || typeof motion!=='object')throw Error('Movimiento de acción inválido.');
    return {from:normalizeTransform(motion.from),to:normalizeTransform(motion.to),
      ease:['none','power1.inOut','power2.inOut','power2.out','sine.inOut'].includes(motion.ease)?motion.ease:'power2.inOut'};
  };
  const actions = list(raw.actions, 80, "Acciones").map((a, i) => {
    if (
      !finite(a?.at) ||
      !finite(a?.duration) ||
      a.at < 0 ||
      a.duration <= 0 ||
      a.at + a.duration > duration + 0.001
    ) {
      throw Error(`Acción ${i + 1}: el intervalo debe caber en la escena.`);
    }
    return {
      id: id(a.id || `action-${i + 1}`),
      actor: a.actor ? id(a.actor) : "",
      at: a.at,
      duration: a.duration,
      description: str(a.description),
      result: str(a.result),
      selector: str(a.selector, 160),
      ...(a.motion===undefined?{}:{motion:normalizeMotion(a.motion)}),
      ...(a.checkpoints===undefined?{}:{checkpoints:normalizeMotionCheckpoints(a.checkpoints,a.duration)}),
      ...(a.narration===undefined?{}:{narration:normalizeNarrationCue(a.narration,a.duration)}),
    };
  });
  if (new Set(actions.map((a) => a.id)).size !== actions.length)
    throw Error("Acciones con identificadores duplicados.");
  const shots = list(raw.shots, 20, "Planos").map((s) => {
    if (
      !finite(s?.at) ||
      !finite(s?.duration) ||
      s.at < 0 ||
      s.duration <= 0 ||
      s.at + s.duration > duration + 0.001
    )
      throw Error("Plano fuera de la duración de la escena.");
    return {
      at: s.at,
      duration: s.duration,
      ...(finite(s.x)?{x:s.x}:{}),
      ...(finite(s.y)?{y:s.y}:{}),
      scale: ["wide", "medium", "close", "macro"].includes(s.scale)
        ? s.scale
        : "medium",
      target: str(s.target, 160),
      purpose: str(s.purpose, 400),
      ...(s.fixed===true?{fixed:true}:{}),
    };
  });
  return {
    objective: str(raw.objective),
    before: states(raw.before),
    after: states(raw.after),
    actions,
    shots,
    holdReason: str(raw.holdReason, 400),
    materials: str(raw.materials),
    lighting: str(raw.lighting),
    transition: str(raw.transition, 400),
    ...(raw.cameraTarget && /^\.[a-zA-Z][\w-]*$/.test(raw.cameraTarget)?{cameraTarget:raw.cameraTarget}:{}),
  };
}
export function wordsForScene(project, index) {
  const start = project.scenes
      .slice(0, index)
      .reduce((s, c) => s + c.duration, 0),
    end = start + project.scenes[index].duration;
  return (project.wordTimings || [])
    .filter((w) => w.end > start && w.start < end)
    .map((w) => ({ ...w, start: w.start - start, end: w.end - start }));
}
export function parseWordSrt(source, total) {
  const blocks = String(source)
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .trim()
    .split(/\n\s*\n/);
  const time = (s) => {
    const m = s.match(/^(\d+):(\d{2}):(\d{2})[,.](\d{3})$/);
    if (!m || +m[2] > 59 || +m[3] > 59) throw Error("Tiempo SRT inválido.");
    return +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000;
  };
  const words = blocks.map((b) => {
    const lines = b.split("\n"),
      i = lines.findIndex((l) => l.includes("-->"));
    if (i < 0) throw Error("Bloque SRT sin tiempos.");
    const match = lines[i].match(/^(\S+)\s+-->\s+(\S+)(?:\s.*)?$/);
    if (!match) throw Error("Intervalo SRT inválido.");
    const text = lines
      .slice(i + 1)
      .join(" ")
      .replace(/<[^>]*>/g, "")
      .trim();
    if (text.split(/\s+/).length !== 1)
      throw Error(
        "Este SRT contiene frases. Se necesitan tiempos por palabra; no se repartirán por caracteres.",
      );
    return { text, start: time(match[1]), end: time(match[2]) };
  });
  return normalizeWordTimings(words, total);
}
export function inspectExplainer(project) {
  const warnings = [],
    known = new Set((project.actors || []).map((a) => a.id));
  let prior = Object.fromEntries((project.actors || [])
    .filter((actor) => actor.initialState)
    .map((actor) => [actor.id, actor.initialState]));
  project.scenes.forEach((scene, index) => {
    const d = scene.direction,
      add = (code, message) =>
        warnings.push({ scene: scene.id, index, code, message });
    if (scene.captionMode === "global" && !(project.wordTimings || []).length && project.showText !== false)
      add("words-missing", "La pista global no tiene tiempos por palabra.");
    if (!d) {
      if (scene.customScene || scene.authored)
        add(
          "direction-missing",
          "Falta una ficha de objetivo, acciones y continuidad.",
        );
      return;
    }
    if (!d.objective)
      add("objective-missing", "Indica qué debe entender el espectador.");
    if (!d.actions?.length && !d.holdReason)
      add("action-missing", "No hay acciones ni una pausa justificada.");
    for (const action of d.actions || []) {
      if (action.actor && !known.has(action.actor))
        add("unknown-actor", `El actor ${action.actor} no está definido.`);
      if (!action.result)
        add(
          "result-missing",
          `La acción ${action.id} no describe su consecuencia.`,
        );
    }
    const intervals = (d.actions || [])
      .map((a) => [a.at, a.at + a.duration])
      .sort((a, b) => a[0] - b[0]);
    let cursor = 0,
      largest = 0;
    for (const [a, b] of intervals) {
      largest = Math.max(largest, a - cursor);
      cursor = Math.max(cursor, b);
    }
    largest = Math.max(largest, scene.duration - cursor);
    if (largest > Math.max(2, scene.duration * 0.45) && !d.holdReason)
      add(
        "long-hold",
        `Hay ${largest.toFixed(1)} s sin acción declarada; explica la pausa o revisa la acción. La cámara ambiental no cuenta como consecuencia.`,
      );
    for (const [actor, state] of Object.entries(d.before || {}))
      if (prior[actor] && prior[actor] !== state && !d.transition)
        add(
          "continuity",
          `Revisa ${actor}: el estado inicial difiere del último estado final declarado.`,
        );
    prior = { ...prior, ...d.after };
    if (!d.shots?.length)
      add("shots-missing", "Falta indicar foco y propósito de los planos.");
  });
  return warnings;
}
