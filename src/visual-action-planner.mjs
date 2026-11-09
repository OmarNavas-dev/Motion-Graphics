const actionTypes = new Set(['establish', 'descend', 'construct', 'install', 'inspect', 'transfer', 'compare', 'rise', 'close', 'follow', 'resolve', 'reveal']);
const shotScales = new Set(['wide', 'medium', 'close']);
const cameras = new Set(['static', 'push', 'pull', 'pan-left', 'pan-right', 'rise', 'drift']);
const cameraCycle = ['push', 'rise', 'pan-left', 'drift', 'pull', 'pan-right'];
const fallbackActions = ['establish', 'follow', 'inspect', 'construct', 'compare', 'resolve'];
const explicitActionFor = (text) => {
  if (/mose|barrera|compuerta|cierra|cerrar/.test(text)) return 'close';
  if (/cargas?|peso|distribu|repart|soporta|sostienen|lleva las cargas/.test(text)) return 'transfer';
  if (/debajo|interior|corte transversal|secci[oó]n/.test(text)) return 'descend';
  if (/hund|subsid|desciend|baja el suelo|erosiona|compar/.test(text)) return 'compare';
  if (/marea|inund|sube el mar|agua (?:sube|entra)|crec(?:e|ió)|aumenta/.test(text)) return 'rise';
  if (/cimiento|plataforma|coloc|instala|apoya|asienta/.test(text)) return 'install';
  if (/\b(?:clavaron|clavan|clavar|construyeron|construye|construir|levantaron|hincaron|ensamblaron)\b/.test(text)) return 'construct';
  if (/madera|ox[ií]geno|descompon|sumergid|material|veta|examina|inspeccion/.test(text)) return 'inspect';
  if (/pilotes?|estacas?|postes?/.test(text)) return 'construct';
  if (/cruza|recorre|navega|entra|sale|viaja|persigue|sigue/.test(text)) return 'follow';
  if (/equilibrio|protecci[oó]n constante|conclusi[oó]n|al final/.test(text)) return 'resolve';
  return null;
};

const clean = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max).trim();
const subjectFor = (scene, project = {}) => clean(scene.visualQuery || scene.title || scene.scriptExcerpt || project.name || 'el elemento principal', 120);
const motionFor = (scene, index, previous) => {
  const requested = scene.motion;
  let camera = cameras.has(requested) ? requested : cameraCycle[index % cameraCycle.length];
  if (camera === previous?.camera && !cameras.has(requested)) camera = cameraCycle[(index + 1) % cameraCycle.length];
  return camera;
};
const shotFor = (actionType, index) => actionType === 'inspect' ? 'close' :
  ['establish', 'resolve'].includes(actionType) ? 'wide' : index % 3 === 1 ? 'close' : 'medium';
const actionText = (actionType, subject) => {
  const actions = {
    establish: `Abre con un plano general de «${subject}»; presenta el lugar y orienta la mirada hacia el detalle que se explicará.`,
    descend: `Desciende desde la superficie hasta «${subject}» y revela en corte la relación que queda oculta bajo ella.`,
    construct: `Sigue la construcción de «${subject}»: las piezas aparecen en secuencia y encajan en su posición final.`,
    install: `Acércate a «${subject}» mientras se coloca; termina mostrando cómo queda apoyado sobre la estructura.`,
    inspect: `Haz un acercamiento a «${subject}» y recorre su textura antes de sostener el detalle importante.`,
    transfer: `Muestra cómo «${subject}» lleva la carga desde el apoyo superior hasta las capas firmes que la reciben.`,
    compare: `Compara «${subject}» antes y después, manteniendo el mismo encuadre para hacer visible el cambio descrito.`,
    rise: `Acompaña el ascenso de «${subject}» hasta el nivel señalado por la narración y deja visible su efecto.`,
    close: `Sigue el cierre de «${subject}» pieza a pieza y termina con la barrera asentada en su posición de protección.`,
    follow: `Sigue «${subject}» en un desplazamiento continuo; deja que el movimiento revele el siguiente elemento del relato.`,
    resolve: `Retírate de «${subject}» hasta recuperar el contexto completo y cerrar con el resultado descrito en el guion.`,
    reveal: `Revela «${subject}» por capas: primero la silueta, luego el detalle que sostiene esta escena.`,
  };
  return actions[actionType] || actions.reveal;
};
const makeBeats = (subject, action) => [
  {at: 0, duration: 0.18, action: `Establece ${subject} en el encuadre.`},
  {at: 0.18, duration: 0.64, action},
  {at: 0.82, duration: 0.18, action: 'Sostén el resultado y prepara el corte siguiente.'},
];

export function createVisualActionPlan(scene = {}, project = {}, index = 0, previous = undefined) {
  const evidence = clean(scene.scriptExcerpt || '', 240);
  const source = `${evidence} ${scene.title || ''} ${scene.visualQuery || ''} ${scene.visualPlan || ''}`.toLowerCase();
  const inferredAction = explicitActionFor(source);
  let actionType = inferredAction || fallbackActions[index % fallbackActions.length];
  if (!inferredAction && previous?.actionType === actionType) {
    const alternates = {
      establish: ['follow', 'reveal'], descend: ['inspect', 'reveal'], construct: ['install', 'inspect'],
      install: ['transfer', 'reveal'], inspect: ['follow', 'compare'], transfer: ['inspect', 'compare'],
      compare: ['follow', 'resolve'], rise: ['follow', 'compare'], close: ['follow', 'resolve'],
      follow: ['inspect', 'reveal'], resolve: ['establish', 'follow'], reveal: ['inspect', 'follow'],
    };
    actionType = alternates[actionType]?.[index % 2] || 'reveal';
  }
  const subject = subjectFor(scene, project);
  const requestedAction = clean(scene.visualPlan, 320);
  const scriptTokens = evidence.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const requestedTokens = requestedAction.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const overlapsScript = requestedTokens.length > 0 && scriptTokens.some((token) => token.length > 3 && requestedTokens.includes(token));
  const action = requestedAction && overlapsScript ? requestedAction : actionText(actionType, subject);
  const camera = motionFor(scene, index, previous);
  const shotScale = shotFor(actionType, index);
  return {
    version: 1,
    subject,
    evidence,
    actionType,
    action,
    shotScale,
    camera,
    confidence: evidence ? 'grounded' : 'fallback',
    beats: makeBeats(subject, action),
  };
}

export function normalizeVisualActionPlan(raw, scene = {}, project = {}, index = 0, previous = undefined) {
  const valid = raw && typeof raw === 'object' && raw.version === 1 &&
    actionTypes.has(raw.actionType) && cameras.has(raw.camera) && shotScales.has(raw.shotScale) &&
    typeof raw.action === 'string' && raw.action.trim();
  if (!valid) return createVisualActionPlan(scene, project, index, previous);
  const subject = clean(raw.subject || subjectFor(scene, project), 120);
  const evidence = clean(raw.evidence || scene.scriptExcerpt || '', 240);
  const action = clean(raw.action, 320);
  const requestedBeats = (Array.isArray(raw.beats) ? raw.beats : makeBeats(subject, action)).slice(0, 3)
    .map((beat, beatIndex) => ({
      at: Math.max(0, Math.min(0.99, Number(beat?.at) || 0)),
      duration: Math.max(0.01, Math.min(1, Number(beat?.duration) || 0.1)),
      action: clean(beat?.action, 320) || `Ejecuta el beat ${beatIndex + 1} de ${subject}.`,
    })).sort((a, b) => a.at - b.at);
  let beatEnd = 0;
  const stable = value => Math.round(value * 1e9) / 1e9;
  const beats = requestedBeats.map((beat, beatIndex) => {
    const at = stable(Math.min(0.99, Math.max(beatEnd, beat.at)));
    const nextAt = requestedBeats[beatIndex + 1]?.at ?? 1;
    const maxDuration = Math.max(0.01, Math.min(1 - at, nextAt - at || 1 - at));
    const duration = stable(Math.min(beat.duration, maxDuration));
    beatEnd = stable(Math.min(1, at + duration));
    return {...beat, at, duration};
  }).filter((beat) => beat.at + beat.duration <= 1.001);
  return {
    version: 1,
    subject,
    evidence,
    actionType: raw.actionType,
    action,
    shotScale: raw.shotScale,
    camera: raw.camera,
    confidence: raw.confidence === 'fallback' ? 'fallback' : evidence ? 'grounded' : 'fallback',
    beats: beats.length ? beats : makeBeats(subject, action),
  };
}

export function ensureDistinctVisualActionPlan(plan, priorPlans = [], index = 0) {
  const prior = Array.isArray(priorPlans) ? priorPlans : [priorPlans];
  if (!prior.some((candidate) => candidate?.action === plan?.action)) return plan;
  const variations = [
    `Reencuadra en plano ${plan.shotScale}, recorre el elemento de izquierda a derecha y termina en un detalle cercano.`,
    'Muestra primero el contexto y desplaza la cámara hasta el punto de contacto del mismo elemento.',
    'Haz un barrido lateral y detente en una relación espacial que el plano anterior no mostraba.',
    'Cambia de escala durante la toma y termina con un encuadre abierto del mismo elemento.',
  ];
  const action = clean(`${clean(plan.action, 205)} Toma ${index + 1}: ${variations[index % variations.length]}`, 320);
  return {...plan, action, beats:makeBeats(plan.subject, action)};
}

export function createVisualActionPlans(scenes = [], project = {}) {
  const plans = [];
  for (const [index, scene] of scenes.entries()) {
    const normalized = normalizeVisualActionPlan(scene.visualActionPlan, scene, project, index, plans[index - 1]);
    plans.push(ensureDistinctVisualActionPlan(normalized, plans, index));
  }
  return plans;
}

export function visualActionProgress(plan, progress = 0) {
  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  const beat = plan?.beats?.[1] || {at: 0.18, duration: 0.64};
  const start = Math.max(0, Math.min(0.99, Number(beat.at) || 0));
  const duration = Math.max(0.01, Math.min(1 - start, Number(beat.duration) || 0.64));
  const local = Math.max(0, Math.min(1, (p - start) / duration));
  return local * local * (3 - 2 * local);
}

export function visualCameraOffset(plan, progress = 0, strength = 40) {
  const t = Math.max(0, Math.min(1, Number(progress) || 0));
  const amount = Math.max(0, Math.min(1, Number(strength) || 0));
  const ease = t * t * (3 - 2 * t);
  const camera = plan?.camera || 'static';
  if (amount === 0 || t === 0) return {x: 0, y: 0, z: 0};
  if (camera === 'push') return {x: 0, y: 0, z: -0.18 * amount * ease};
  if (camera === 'pull') return {x: 0, y: 0, z: 0.18 * amount * ease};
  if (camera === 'pan-left') return {x: 0.15 * amount * ease, y: 0, z: 0};
  if (camera === 'pan-right') return {x: -0.15 * amount * ease, y: 0, z: 0};
  if (camera === 'rise') return {x: 0, y: -0.14 * amount * ease, z: 0};
  if (camera === 'drift') return {x: 0.1 * amount * Math.sin(Math.PI * t), y: -0.06 * amount * ease, z: -0.035 * amount * ease};
  return {x: 0, y: 0, z: 0};
}
