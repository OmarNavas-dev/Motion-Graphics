// P1 contract shared by Motion Graphics authoring and Motion Studio rendering.
// Measurements are leads for image inspection, not autonomous artistic approval.
import {createHash} from 'node:crypto';

export const VISUAL_ITERATION_SCHEMA = 'motion-studio.visual-iteration/1';
export const VISUAL_REVISION_SCHEMA = 'motion-studio.visual-revision/1';
export const projectFingerprint = project => createHash('sha256').update(JSON.stringify(project?.project ?? project)).digest('hex');
const round = n => Number(Number(n).toFixed(3));

function sceneAt(project, seconds) {
  let start = 0;
  for (const scene of project.scenes ?? []) {
    const end = start + scene.duration;
    if (seconds < end || end === (project.scenes ?? []).reduce((sum, item) => sum + item.duration, 0))
      return {id:scene.id,start,end};
    start = end;
  }
  return null;
}

const hex = value => /^#[\da-f]{6}$/i.test(value ?? '') ? value : null;
const luminance = color => {
  const rgb = [1,3,5].map(i => parseInt(color.slice(i,i+2),16)/255)
    .map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
};
export const contrastRatio = (a,b) => {
  if (!hex(a) || !hex(b)) return null;
  const x=luminance(a),y=luminance(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
};

export function createVisualDefectReport(project, audits={}, {jobId=null,sourceJobId=null,attempt=1,stage='post-render'}={}) {
  const root=project?.project ?? project;
  if(!Array.isArray(root?.scenes))throw Error('El informe requiere un proyecto con escenas.');
  const defects=[];
  const add=(code,severity,seconds,summary,detail={},options={})=>{
    const scene=seconds===null?null:sceneAt(root,seconds);
    const frame=audits.contactSheet?.frames?.reduce((best,item)=>
      scene && item.scene===scene.id && (!best || Math.abs(item.seconds-seconds)<Math.abs(best.seconds-seconds))?item:best,null);
    defects.push({id:`D${String(defects.length+1).padStart(3,'0')}`,code,severity,
      sceneId:options.sceneId??scene?.id??null,seconds:seconds===null?null:round(seconds),
      localSeconds:scene&&seconds!==null?round(seconds-scene.start):null,
      summary,detail,frame:frame?{seconds:frame.seconds,file:frame.file}:null,
      autoFixable:code==='LOW_TEXT_CONTRAST',reviewRequired:true});
  };
  const visual=audits.visualAudit, pacing=audits.pacingAudit;
  for(const error of (audits.runtimeErrors??[]).slice(0,25)){
    const sceneId=/^([A-Za-z][\w-]*)\s+@\d/.exec(error)?.[1]??null;
    const reportedSeconds=/@\s*([\d.]+)/.exec(error)?.[1]??null;
    add(/GSAP target .* not found/i.test(error)?'MISSING_GSAP_TARGET':'RUNTIME_ERROR','error',null,
      String(error).slice(0,700),{reportedTimeSeconds:reportedSeconds===null?null:Number(reportedSeconds)}, {sceneId});
  }
  for (const segment of visual?.metrics?.frozenSegments??[]) {
    const midpoint=(segment.startSeconds+segment.endSeconds)/2;
    add('STATIC_INTERVAL','warning',midpoint,'Intervalo casi inmóvil; comprobar si es una pausa intencional.',
      {startSeconds:round(segment.startSeconds),endSeconds:round(segment.endSeconds)});
  }
  for (const segment of visual?.metrics?.lowContrastSegments??[]) {
    add('LOW_FRAME_CONTRAST','warning',(segment.startSeconds+segment.endSeconds)/2,
      'Fotogramas de bajo contraste; revisar legibilidad y escena oscura intencional.',segment);
  }
  for (const change of (visual?.metrics?.largeVisualChanges??[]).slice(0,25))
    add('ABRUPT_VISUAL_CHANGE','info',change.seconds,'Cambio fuerte entre fotogramas; verificar si es un corte planeado.',change);
  for (const flash of (pacing?.flashSuspects??[]).slice(0,25))
    add('FLASH_SUSPECT','warning',flash.first,'Dos cambios visuales demasiado próximos; inspeccionar riesgo de destello.',flash);
  for (const gap of (pacing?.deadGaps??[]).slice(0,25))
    add('PACING_GAP','info',(gap.start+gap.end)/2,'Pausa prolongada de movimiento; revisar intención narrativa.',gap);
  if (audits.expectedAudio && visual?.video && !visual.video.audioPresent)
    add('MISSING_AUDIO','error',null,'Se esperaba audio, pero el MP4 no contiene pista de audio.');
  if (root.loop && audits.loopAudit && audits.loopAudit.seamlessByHeuristic===false) {
    const duration=root.scenes.reduce((sum,scene)=>sum+scene.duration,0);
    add('LOOP_DISCONTINUITY','warning',Math.max(0,duration-.001),
      'Salto entre los fotogramas de cierre e inicio del bucle.',audits.loopAudit);
  }
  for (const error of (audits.contactSheet?.errors??[]).slice(0,25))
    add('FRAME_CAPTURE_FAILED','error',Number.isFinite(error.seconds)?error.seconds:null,
      'No se pudo capturar un fotograma para inspección.',{error:error.error});
  if(stage==='post-render'&&!visual) add('VISUAL_AUDIT_UNAVAILABLE','error',null,'No se pudo medir el MP4; inspección incompleta.');
  if(stage==='post-render'&&!audits.contactSheet?.captured)
    add('FRAME_EVIDENCE_UNAVAILABLE','error',null,'No hay fotogramas de evidencia; inspección incompleta.');
  for (const scene of root.scenes) {
    const background=hex(scene.authored?.background?.color);
    if(!background || scene.authored?.background?.color2)continue;
    for (const layer of scene.authored?.layers??[]) {
      if(layer.type!=='text' || !hex(layer.color))continue;
      const ratio=contrastRatio(layer.color,background);
      if(ratio!==null && ratio<4.5) {
        const offset=root.scenes.slice(0,root.scenes.indexOf(scene)).reduce((sum,s)=>sum+s.duration,0);
        add('LOW_TEXT_CONTRAST','warning',offset+scene.duration/2,
          `Texto ${layer.id} sin contraste suficiente con su fondo sólido.`,
          {layerId:layer.id,foreground:layer.color,background,ratio:round(ratio)}, {sceneId:scene.id});
      }
    }
  }
  return {schema:VISUAL_ITERATION_SCHEMA,jobId,sourceJobId,attempt,stage,projectHash:projectFingerprint(root),
    defects,counts:{error:defects.filter(d=>d.severity==='error').length,
      warning:defects.filter(d=>d.severity==='warning').length,
      info:defects.filter(d=>d.severity==='info').length},
    approval:'PENDING_VISUAL_REVIEW',
    limitation:'La inspección de píxeles no juzga anatomía, composición, estilo ni pausas intencionales. Los defectos requieren revisión humana o visual por modelo.'};
}

export function applySafeVisualCorrections(project,report) {
  if (report?.schema!==VISUAL_ITERATION_SCHEMA || !Array.isArray(report.defects))throw Error('Informe P1 inválido.');
  if(report.projectHash!==projectFingerprint(project))throw Error('El informe corresponde a otro JSON. No aplicar correcciones cruzadas.');
  const wrapped=Boolean(project.project), result=structuredClone(project), root=wrapped?result.project:result;
  const applied=[],unresolved=[];
  for (const defect of report.defects) {
    if(defect.code!=='LOW_TEXT_CONTRAST' || !defect.autoFixable){unresolved.push(defect.id);continue;}
    const scene=root.scenes?.find(s=>s.id===defect.sceneId);
    const layer=scene?.authored?.layers?.find(l=>l.id===defect.detail?.layerId);
    const background=scene?.authored?.background?.color;
    if(!layer || layer.type!=='text' || !hex(background) || scene.authored.background.color2 ||
       layer.color!==defect.detail.foreground || background!==defect.detail.background) {
      unresolved.push(defect.id);continue;
    }
    const next=contrastRatio('#ffffff',background)>=contrastRatio('#000000',background)?'#ffffff':'#000000';
    if(contrastRatio(next,background)<4.5){unresolved.push(defect.id);continue;}
    layer.color=next;
    scene.approved=false; // A visible change always requires renewed scene approval.
    applied.push({defectId:defect.id,sceneId:scene.id,layerId:layer.id,property:'color',before:defect.detail.foreground,after:next});
  }
  return {project:result,manifest:{schema:VISUAL_ITERATION_SCHEMA,sourceJobId:report.jobId,
    projectHashBefore:report.projectHash,projectHashAfter:projectFingerprint(result),applied,unresolved,
    approval:'PENDING_VISUAL_REVIEW'}};
}

export function compareVisualReports(before,after) {
  if(before?.schema!==VISUAL_ITERATION_SCHEMA || after?.schema!==VISUAL_ITERATION_SCHEMA)
    throw Error('No se pueden comparar informes P1 incompatibles.');
  const count = report => report.counts.error + report.counts.warning;
  return {before:count(before),after:count(after),delta:count(after)-count(before),
    improvedByHeuristic:count(after)<count(before),
    artisticApproval:false,note:'Menos alertas no demuestra mayor calidad artística. Comparar fotogramas de ambos renders.'};
}

export function validateIterationRequest(previous,project,{maxAttempts=3}={}) {
  if(!previous || !['completado','error'].includes(previous.status) || previous.visualDefects?.schema!==VISUAL_ITERATION_SCHEMA)
    throw Error('El render de origen no existe o todavía no produjo su informe P1.');
  if(!Number.isInteger(previous.attempt) || previous.attempt<1 || previous.attempt>=maxAttempts)
    throw Error('Límite de tres renders por revisión. Inicia un proyecto nuevo para otra ronda.');
  if(projectFingerprint(project)===previous.projectHash)
    throw Error('El JSON es idéntico al anterior. Corrige y aprueba una escena antes de repetir.');
  return {sourceJobId:previous.id,attempt:previous.attempt+1};
}

// Only explicitly evidenced, bounded scene edits are accepted from a vision model.
// The caller must additionally run its full JSON and browser preflight validators.
export function applyVisionRevisionPlan(project,report,plan,{validateCustomScene}={}) {
  if(report?.schema!==VISUAL_ITERATION_SCHEMA ||
     report.projectHash!==projectFingerprint(project))throw Error('El informe no corresponde al proyecto.');
  if(plan?.schema!==VISUAL_REVISION_SCHEMA || plan.projectHash!==report.projectHash ||
     plan.sourceJobId!==report.jobId || !Array.isArray(plan.scenes) ||
     plan.scenes.length<1 || plan.scenes.length>3)throw Error('Plan de revisión visual inválido.');
  const next=structuredClone(project), root=next.project??next, seen=new Set(),applied=[];
  const allowedMotion=new Set(['auto','static','push','pull','pan-left','pan-right','rise','drift']);
  const allowedTransition=new Set(['cut','fade','dip','flash']);
  const numericBounds={x:[-200,200],y:[-200,200],width:[1,200],height:[1,200],
    opacity:[0,1],size:[8,180],rotate:[-360,360],scale:[.1,5]};
  for(const entry of plan.scenes){
    const scene=root.scenes.find(s=>s.id===entry?.sceneId);
    if(!scene||seen.has(scene.id)||!['customScene','authoredLayers','motion'].includes(entry.type)||
       !Number.isFinite(entry.confidence)||entry.confidence<.7||entry.confidence>1||
       typeof entry.observation!=='string'||entry.observation.trim().length<12||
       entry.observation.length>800||!Number.isFinite(entry.localSeconds)||
       entry.localSeconds<0||entry.localSeconds>scene.duration)
      throw Error('Propuesta sin escena, confianza o evidencia temporal válida.');
    seen.add(scene.id);
    if(entry.type==='customScene'){
      if(!scene.customScene?.html||typeof validateCustomScene!=='function')
        throw Error('La revisión de código requiere la escena original y validador ejecutable.');
      const data=entry.customScene;
      if(!data||Object.keys(data).some(k=>!['html','css','script'].includes(k))||
         typeof data.html!=='string'||typeof data.css!=='string'||typeof data.script!=='string')
        throw Error('El reemplazo HTML/CSS/GSAP está incompleto.');
      const validated=validateCustomScene(data,scene);
      if(!validated?.html||JSON.stringify(validated)===JSON.stringify(scene.customScene))
        throw Error('El código corregido está vacío o no cambió.');
      scene.customScene=validated;
    } else if(entry.type==='authoredLayers'){
      if(!scene.authored?.layers?.length||!Array.isArray(entry.layerEdits)||
         !entry.layerEdits.length||entry.layerEdits.length>12)throw Error('Capas no editables.');
      const ids=new Set();
      for(const edit of entry.layerEdits){
        const layer=scene.authored.layers.find(l=>l.id===edit.layerId);
        if(!layer||ids.has(layer.id))throw Error('ID de capa inexistente o repetido.');
        ids.add(layer.id);
        for(const key of Object.keys(edit)){
          if(key==='layerId')continue;
          if(key==='color'){
            if(layer.type!=='text'||!hex(edit.color))throw Error('El color debe ser hexadecimal de texto.');
          }else if(numericBounds[key]){
            const [min,max]=numericBounds[key];
            if(!Number.isFinite(edit[key])||edit[key]<min||edit[key]>max)
              throw Error('Coordenada de capa fuera de límites.');
          }else throw Error('No se permite modificar '+key+' en una propuesta visual.');
          layer[key]=edit[key];
        }
        if(Object.keys(edit).length<2)throw Error('La revisión no contiene modificaciones.');
      }
    } else {
      if(!allowedMotion.has(entry.motion)||!allowedTransition.has(entry.transition)||
         !Number.isFinite(entry.motionStrength)||entry.motionStrength<0||entry.motionStrength>100)
        throw Error('Movimiento fuera del contrato.');
      if(scene.motion===entry.motion&&scene.transition===entry.transition&&
         scene.motionStrength===entry.motionStrength)throw Error('La revisión no cambió el movimiento.');
      scene.motion=entry.motion;scene.transition=entry.transition;scene.motionStrength=entry.motionStrength;
    }
    scene.approved=false;
    applied.push({sceneId:scene.id,type:entry.type,confidence:entry.confidence,
      localSeconds:entry.localSeconds,observation:entry.observation.trim()});
  }
  if(projectFingerprint(project)===projectFingerprint(next))throw Error('El plan no modificó el JSON.');
  return {project:next,manifest:{schema:VISUAL_REVISION_SCHEMA,projectHashBefore:report.projectHash,
    projectHashAfter:projectFingerprint(next),sourceJobId:report.jobId,applied,
    approval:'PENDING_VISUAL_REVIEW'}};
}
