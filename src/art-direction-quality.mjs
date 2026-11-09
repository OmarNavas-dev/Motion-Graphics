// Deterministic pre-render art-direction gate. These are storyboard signals,
// not a substitute for watching the resulting video against its references.
const getScenes = project => Array.isArray(project?.scenes) ? project.scenes : [];
const hasAction = scene => (scene.direction?.actions?.length ?? 0) > 0;
const hasShots = scene => (scene.direction?.shots?.length ?? 0) > 0;
const getHtml = scene => String(scene.customScene?.html ?? '');
const getScript = scene => String(scene.customScene?.script ?? '');

export function auditArtDirection(project, {requiresReferences=false}={}) {
  const scenes=getScenes(project), findings=[];
  const add=(scene,code,severity,message,repair)=>findings.push({scene,code,severity,message,repair});
  if (!scenes.length) add('proyecto','NO_SCENES','error','No existen escenas.','Crear escenas completas.');
  if (scenes.length>=3 && scenes.slice(0,-1).every(scene=>!scene.transition || scene.transition==='cut'))
    add('proyecto','ALL_HARD_CUTS','error','Todas las uniones son cortes directos.',
      'Diseñar raccord de objetos, cámara o movimiento en al menos dos uniones y animarlo de verdad.');
  const hasReferenceEvidence=Boolean(project.references?.length)||/REFERENCIA_VIDEO:\s*\S+/i.test(project.creativeBrief??'');
  if (requiresReferences && !hasReferenceEvidence)
    add('proyecto','REFERENCES_NOT_BOUND','error','Se exigió fidelidad a referencias, pero el JSON no registra su procedencia.',
      'Anotar REFERENCIA_VIDEO: nombre-real.mp4 y reglas de escena en creativeBrief, y comparar con capturas reales; references solo admite imágenes locales.');
  if (scenes.length>=3 && scenes.every(scene=>!hasAction(scene)))
    add('proyecto','NO_SEMANTIC_ACTION_PLAN','error','Ninguna escena declara acciones físicas verificables.',
      'Definir direction.actions para cada acontecimiento: actor, verbo, objetivo y tiempo; enlazarlo con GSAP.');
  if (scenes.length>=3 && scenes.every(scene=>!hasShots(scene)))
    add('proyecto','NO_CAMERA_SHOT_PLAN','warning','No existe una planificación ejecutable de encuadres.',
      'Definir direction.shots y comprobar los encuadres de apertura, clímax y salida.');
  if (scenes.length>=3 && scenes.every(scene=>scene.approved===false))
    add('proyecto','ALL_SCENES_UNAPPROVED','warning','Ninguna escena está aprobada visualmente.',
      'Renderizar fotogramas críticos, corregir defectos y solicitar revisión antes de marcar approved:true.');

  const heroCounts=new Map();
  for (const scene of scenes) {
    const html=getHtml(scene),script=getScript(scene),id=scene.id||'sin-id';
    if (!html.trim()) continue;
    const activeTokens=[...html.matchAll(/class\s*=\s*["']([^"']+)["']/g)]
      .flatMap(match=>match[1].split(/\s+/))
      .filter(token=>/^(?:earth|globe|planet|car|boat|person|character|ocean|wave|city|machine|vehicle)$/i.test(token));
    const hero=activeTokens[0]?.toLowerCase();
    if (hero) heroCounts.set(hero,[...(heroCounts.get(hero)||[]),id]);
    const movements=(script.match(/\b(?:tl|gsap)\s*\.\s*(?:fromTo|to|from)\s*\(/g)||[]).length;
    if (movements < 2 && scene.duration>=3)
      add(id,'LOW_MOTION_DENSITY','warning','Pocas acciones animadas para la duración de la escena.',
        'Crear cambios progresivos y acciones principales en el reloj GSAP, evitando movimiento decorativo sin causa.');
  }
  for (const [hero,ids] of heroCounts) {
    if (ids.length>=3 && ids.length/scenes.length>=0.5)
      add('proyecto','REPEATED_HERO','warning',`El objeto «${hero}» domina ${ids.length} escenas (${ids.join(', ')}).`,
        'Variar los acontecimientos y los planos; usar ese protagonista solo cuando su acción cambie el significado.');
  }
  const errors=findings.filter(x=>x.severity==='error');
  return {schema:'motion-studio.art-direction/1',readyForVisualReview:errors.length===0,
    findings,summary:{scenes:scenes.length,errors:errors.length,warnings:findings.length-errors.length},
    limitations:'No acredita fluidez, comprensión o parecido con referencias sin inspeccionar fotogramas y MP4 reales.'};
}
