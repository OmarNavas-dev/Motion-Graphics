// Original adaptations of motion-design families. These are timed production
// contracts, not rendered assets: use each recipe to build real scene geometry.
export const EFFECTS = Object.freeze([
  ['button-player','UI','button','player','The expanding button remains the same object'],
  ['search-results','UI','query','result cards','The entered query persists into the results'],
  ['card-workspace','UI','card','workspace','The card frame enlarges and becomes the editor'],
  ['tabs-panels','UI','tab strip','detail panel','The selected tab shares its accent with the panel'],
  ['chart-morph','data','one chart','another chart','Data marks change values and topology with matching labels'],
  ['dashboard-zoom','data','dashboard','one KPI','The source KPI stays in world position during the camera move'],
  ['spring-stack','data','one card','ordered stack','Cards have distinct delayed arrivals and a final hold'],
  ['magnetic-dock','data','floating tools','snapped dock','Every item settles into a clear attachment target'],
  ['masked-type','type','hidden title','visible title','Letter reveal is constrained to a geometric mask'],
  ['elastic-type','type','compressed title','readable title','Text deforms briefly then fully stabilizes'],
  ['text-layout','type','headline','composed layout','A line of text becomes multiple labeled layout anchors'],
  ['image-reveal','type','covered illustration','revealed illustration','A moving clip reveals actual imagery underneath'],
  ['perspective-shift','system','flat layers','spatial layers','Depth ordering and parallax are consistent'],
  ['glass-focus','system','multiple objects','one highlighted object','Lens and background remain spatially linked'],
  ['flowing-paths','system','one source','multiple destinations','The same particle follows real connected paths'],
  ['particle-logo','system','scattered marks','composed mark','Particles have deterministic positions and settle']
].map(([id,family,from,to,mechanism]) => Object.freeze({id,family,from,to,mechanism})));

export function getEffect(id) { return EFFECTS.find(e => e.id === id) ?? null; }

export function effectTimeline(id, duration, { entrance = .28, hold = .58 } = {}) {
  if (!getEffect(id)) throw new Error(`Efecto desconocido: ${id}`);
  if (!(duration > 0) || !(entrance > 0 && hold >= entrance && hold <= 1)) throw new Error('Timeline inválida');
  return {
    id, phases: [
      {kind:'anticipation', start:0, end:duration * Math.min(.12,entrance/2)},
      {kind:'transformation', start:duration * Math.min(.12,entrance/2), end:duration * entrance},
      {kind:'evidence-hold', start:duration * entrance, end:duration * hold},
      {kind:'continuity-or-exit', start:duration * hold, end:duration}
    ]
  };
}

export function validateEffectUsage(uses) {
  const problems = [];
  if (!Array.isArray(uses)) return ['effects debe ser una lista'];
  for (const [i,e] of uses.entries()) {
    if (!getEffect(e.id)) problems.push(`Efecto ${i}: tipo inexistente`);
    if (!Number.isFinite(e.start) || !Number.isFinite(e.end) || e.end <= e.start) problems.push(`Efecto ${i}: tiempo incorrecto`);
    if (!e.subjectId || !e.fromState || !e.toState || !e.evidence) problems.push(`Efecto ${i}: identidad, estados y prueba visibles obligatorios`);
    if (e.loop === true && e.narration === true) problems.push(`Efecto ${i}: no reiniciar una acción en medio de la narración`);
  }
  return problems;
}
