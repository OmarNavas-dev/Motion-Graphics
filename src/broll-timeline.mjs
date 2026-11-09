// P2 contract shared by Motion Graphics authoring and Motion Studio rendering.
// Clip times are local to their scene; narration word anchors use the global clock.
const validId = /^[A-Za-z][\w-]{0,59}$/;
const safeImage = /^user-assets\/[0-9a-f-]{36}\.(?:png|jpg|jpeg|webp)$/;
const safeColor = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const round = value => Math.round(value * 1000) / 1000;
const bounded = (n, min, max) => finite(n) && n >= min && n <= max;

export function normalizeBroll(raw, scenes, words = []) {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > 120) throw Error('P2: máximo 120 planos B-roll.');
  const byScene = new Map();
  let seconds = 0;
  for (const scene of scenes) {
    if (byScene.has(scene.id)) throw Error('P2: identificadores de escena duplicados.');
    byScene.set(scene.id, {scene, start: seconds});
    seconds += scene.duration;
  }
  const ids = new Set();
  return raw.map((clip, index) => {
    if (!clip || typeof clip !== 'object' || Array.isArray(clip)) throw Error(`P2: plano ${index + 1} inválido.`);
    if (!validId.test(clip.id) || ids.has(clip.id)) throw Error('P2: ID de plano B-roll inválido o repetido.');
    ids.add(clip.id);
    const target = byScene.get(clip.sceneId);
    if (!target) throw Error(`P2: escena no encontrada para ${clip.id}.`);
    const duration = clip.duration;
    if (!bounded(duration, 0.1, 60)) throw Error(`P2: duración inválida en ${clip.id}.`);
    let at = clip.at;
    let narration;
    if (clip.narration !== undefined) {
      const cue = clip.narration;
      if (!cue || !Number.isInteger(cue.wordIndex) || cue.wordIndex < 0 ||
        !['start', 'end'].includes(cue.edge) || !bounded(cue.offset, -5, 5) ||
        !words[cue.wordIndex]) throw Error(`P2: anclaje de narración inválido en ${clip.id}.`);
      const word = words[cue.wordIndex];
      if (typeof cue.phrase !== 'string' || !cue.phrase.trim() ||
        !word.text.toLocaleLowerCase().includes(cue.phrase.trim().toLocaleLowerCase()))
        throw Error(`P2: el anclaje ${clip.id} no coincide con la palabra real.`);
      const anchoredAt = word[cue.edge] + cue.offset - target.start;
      if (at !== undefined && (!finite(at) || Math.abs(at - anchoredAt) > 0.051))
        throw Error(`P2: ${clip.id} no coincide con el tiempo de narración.`);
      at = anchoredAt;
      narration = {wordIndex: cue.wordIndex, edge: cue.edge, offset: cue.offset, phrase: cue.phrase.trim()};
    }
    if (!bounded(at, 0, target.scene.duration) || at + duration > target.scene.duration + 0.001)
      throw Error(`P2: ${clip.id} termina fuera de su escena.`);
    if (!['overlay', 'cutaway'].includes(clip.kind)) throw Error(`P2: tipo de plano inválido en ${clip.id}.`);
    if (!Array.isArray(clip.objects) || !clip.objects.length || clip.objects.length > 32)
      throw Error(`P2: ${clip.id} necesita de 1 a 32 objetos.`);
    if (clip.background !== undefined && !safeColor.test(clip.background))
      throw Error(`P2: color de fondo inválido en ${clip.id}.`);
    if (clip.kind === 'cutaway' && !clip.background && !clip.objects.some(obj => obj.type === 'image' && obj.width === 100 && obj.height === 100))
      throw Error(`P2: un cutaway necesita fondo o imagen de cuadro completo (${clip.id}).`);
    const objectIds = new Set();
    const objects = clip.objects.map(obj => {
      if (!obj || !validId.test(obj.id) || objectIds.has(obj.id)) throw Error(`P2: ID de objeto inválido en ${clip.id}.`);
      objectIds.add(obj.id);
      if (!['shape', 'image', 'text'].includes(obj.type)) throw Error(`P2: objeto no ejecutable ${obj.id}.`);
      for (const coordinate of ['x', 'y', 'width', 'height']) if (!bounded(obj[coordinate], 0, 100))
        throw Error(`P2: ${obj.id}.${coordinate} fuera de 0–100%.`);
      if (obj.width < 0.1 || obj.height < 0.1) throw Error(`P2: ${obj.id} necesita tamaño positivo.`);
      if (obj.type === 'image' && !safeImage.test(obj.asset || '')) throw Error(`P2: imagen no autorizada en ${obj.id}.`);
      if (obj.type === 'text' && (typeof obj.text !== 'string' || !obj.text.trim() || obj.text.length > 240))
        throw Error(`P2: texto inválido en ${obj.id}.`);
      if (obj.type !== 'image' && !safeColor.test(obj.color || '')) throw Error(`P2: color inválido en ${obj.id}.`);
      if (obj.shape !== undefined && !['rect', 'circle'].includes(obj.shape)) throw Error(`P2: forma inválida en ${obj.id}.`);
      if (obj.fontSize !== undefined && !bounded(obj.fontSize, 12, 140)) throw Error(`P2: fuente inválida en ${obj.id}.`);
      return {id: obj.id, type: obj.type, x: obj.x, y: obj.y, width: obj.width, height: obj.height,
        ...(obj.type === 'image' ? {asset: obj.asset} : {color: obj.color}),
        ...(obj.type === 'text' ? {text: obj.text.trim(), fontSize: obj.fontSize ?? 42} : {}),
        ...(obj.type === 'shape' ? {shape: obj.shape ?? 'rect'} : {})};
    });
    if (clip.motion !== undefined && !['static', 'rise', 'zoom', 'slide-left'].includes(clip.motion))
      throw Error(`P2: movimiento desconocido en ${clip.id}.`);
    return {id: clip.id, sceneId: clip.sceneId, at: round(at), duration: round(duration),
      globalAt: round(target.start + at), kind: clip.kind, objects,
      motion: clip.motion ?? 'rise', ...(clip.background ? {background: clip.background} : {}),
      ...(narration ? {narration} : {})};
  });
}

export function brollAudit(project) {
  const clips = normalizeBroll(project.broll, project.scenes, project.wordTimings ?? []);
  return {clips: clips.length, seconds: round(clips.reduce((n, clip) => n + clip.duration, 0)),
    anchored: clips.filter(clip => clip.narration).length,
    alphaSafe: clips.every(clip => clip.kind === 'overlay' || clip.kind === 'cutaway')};
}
