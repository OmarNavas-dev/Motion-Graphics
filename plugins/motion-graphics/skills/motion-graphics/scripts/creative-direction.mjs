// Creative direction is portable data, not a fixed style preset.
const isText = v => typeof v === 'string' && v.trim().length > 0;
const hex = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

export function validateCreativeDirection(brief) {
  const errors = [];
  if (!brief || typeof brief !== 'object') return ['Falta creative-direction.json'];
  for (const key of ['topic', 'audience', 'visualThesis', 'narrativePromise'])
    if (!isText(brief[key])) errors.push(`Falta ${key}`);
  if (!brief.look || !hex(brief.look.background) || !hex(brief.look.foreground) || !hex(brief.look.accent))
    errors.push('LOOK requiere background, foreground y accent hexadecimales');
  for (const key of ['typography', 'materials', 'light']) if (!isText(brief.look?.[key])) errors.push(`LOOK requiere ${key}`);
  if (!brief.moves || !isText(brief.moves.pace) || !isText(brief.moves.transitions) ||
      !isText(brief.moves.camera) || !isText(brief.moves.easing)) errors.push('MOVES incompleto: pace, transitions, camera, easing');
  if (!Array.isArray(brief.references)) errors.push('references debe ser una lista');
  else for (const [i, r] of brief.references.entries()) {
    if (!['LOOK', 'MOVES', 'BOTH'].includes(r.role) || !isText(r.source) || !isText(r.observation))
      errors.push(`Referencia ${i}: role/source/observation obligatorios`);
    if (!['observed', 'inferred', 'unknown'].includes(r.confidence)) errors.push(`Referencia ${i}: confidence inválida`);
  }
  if (!Array.isArray(brief.motionRules?.must) || !Array.isArray(brief.motionRules?.avoid))
    errors.push('motionRules.must y motionRules.avoid obligatorios');
  return errors;
}

/** Plan scene-first: explain what changes, how it changes and what proves it. */
export function validateExplainerOutline(outline) {
  const errors = [];
  if (!outline || !(outline.duration > 0) || !Array.isArray(outline.shots) || !outline.shots.length)
    return ['Se requiere duration y shots'];
  let end = 0;
  for (const [i, s] of outline.shots.entries()) {
    if (!(Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start) || Math.abs(s.start - end) > .05)
      errors.push(`Plano ${i + 1}: intervalo discontinuo`);
    for (const key of ['claim', 'visualProof', 'action', 'camera', 'bridgeToNext'])
      if (!isText(s[key])) errors.push(`Plano ${i + 1}: falta ${key}`);
    if (!Array.isArray(s.layers) || s.layers.length < 3) errors.push(`Plano ${i + 1}: mínimo tres capas funcionales, no decorativas`);
    if (!Array.isArray(s.beats) || !s.beats.length) errors.push(`Plano ${i + 1}: faltan beats sincronizados`);
    else for (const b of s.beats) if (!Number.isFinite(b.time) || b.time < s.start || b.time > s.end || !isText(b.event))
      errors.push(`Plano ${i + 1}: beat fuera de rango o sin evento`);
    end = s.end;
  }
  if (Math.abs(end - outline.duration) > .05) errors.push('Duración de planos no coincide con el total');
  const first = outline.shots[0];
  if (first?.start > .05 || first?.end > 5 || !isText(first?.visualProof)) errors.push('El gancho inicial necesita prueba visible en los primeros 5 s');
  return errors;
}
