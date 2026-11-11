import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const SCHEMA='motion-studio.storyboard/v3';
const number=x=>typeof x==='number'&&Number.isFinite(x);
const txt=x=>typeof x==='string'?x.trim():'';
const norm=x=>txt(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const near=(a,b,eps=.1)=>number(a)&&number(b)&&Math.abs(a-b)<=eps;
const physical=s=>/^[.#][\w-]+$/.test(s||'')&&!/^(?:\.camera|\.world|\.L-(?:bg|mid|fg)|\.dvj-)/.test(s);
const generic=/^(?:mostrar (?:causa|accion|informacion|el mecanismo|proceso|cambio)|explicar (?:el|la|que)|cambio visible|transformacion material|movimiento del elemento|resultado visible|dar contexto|mostrar mediante)/i;
const issue=(severity,code,message,scene='(global)')=>({severity,code,message,scene});
const load=p=>JSON.parse(fs.readFileSync(path.resolve(p),'utf8').replace(/^\uFEFF/,''));

export function selectorExists(html,sel){
 if(!/^[.#][\w-]+$/.test(sel||''))return false;
 const name=sel.slice(1);
 if(sel[0]==='.')return [...String(html||'').matchAll(/\bclass\s*=\s*(["'])(.*?)\1/gs)]
   .some(m=>m[2].split(/\s+/).includes(name));
 return [...String(html||'').matchAll(/\bid\s*=\s*(["'])(.*?)\1/gs)].some(m=>m[2]===name);
}

export function auditProjectCraftSurface(project){
 const issues=[],scenes=project?.scenes||[];
 if(!scenes.length)return [issue('error','PROJECT_EMPTY','El proyecto no contiene escenas.')];
 for(const s of scenes){
  const code=String(s.customScene?.script||''),html=String(s.customScene?.html||'');
  for(const a of s.direction?.actions||[]){
   if(!physical(a.selector))continue;
   if(!selectorExists(html,a.selector))issues.push(issue('error','ACTION_TARGET_MISSING',a.selector+' no existe en el HTML.',s.id));
   else if(!code.includes(a.selector))issues.push(issue('error','ACTION_NOT_EXECUTED',a.selector+' se describe pero no se anima en el código.',s.id));
  }
  if(s.duration>=5.5&&(s.direction?.shots||[]).length===1&&['narrative','mechanism'].includes(s.direction?.visualMode))
   issues.push(issue('warning','LONG_SINGLE_SHOT','Revisar progresión visual: escena larga con un único plano.',s.id));
 }
 if(scenes.length>=6){
  const purposes=scenes.flatMap(s=>(s.direction?.shots||[]).map(x=>norm(x.purpose))).filter(Boolean);
  const counts=new Map();for(const p of purposes)counts.set(p,(counts.get(p)||0)+1);
  const max=Math.max(0,...counts.values());
  if(purposes.length>=6&&max>=Math.max(5,Math.ceil(purposes.length*.65)))
   issues.push(issue('error','REPEATED_SHOT_PURPOSE','Se repite el mismo propósito en '+max+' de '+purposes.length+' planos: planificación genérica.'));
  const motions=scenes.flatMap(s=>(s.direction?.actions||[]).map(a=>a.motion).filter(m=>m?.from&&m?.to));
  if(motions.length>=6){
   const signatures=new Map();
   for(const motion of motions){
    const key=JSON.stringify(motion);
    signatures.set(key,(signatures.get(key)||0)+1);
   }
   const repeated=Math.max(...signatures.values());
   if(repeated>=Math.max(6,Math.ceil(motions.length*.7)))
    issues.push(issue('error','TEMPLATE_ACTION_MOTIONS','Se repite una misma trayectoria de acción en '+repeated+' de '+motions.length+' acciones diferentes.'));
  }
  const lines=scenes.map(s=>String(s.customScene?.script||'').split(/[\r\n]/).find(line=>/tl\.(?:fromTo|to)\([^\n]*?\.camera\b/.test(line))||'');
  if(lines.every(Boolean)){
   const signatures=lines.map(s=>s.replace(/\s+/g,''));
   const unique=new Set(signatures);
   const period=[1,2,3].find(p=>signatures.every((s,i)=>s===signatures[i%p]));
   if(period&&scenes.length>=Math.max(8,period*3))
    issues.push(issue('error','CYCLIC_CAMERA_PRESET','La cámara repite un ciclo de '+period+' movimientos en '+scenes.length+' escenas.'));
   else if(unique.size<=2&&scenes.length>=8)
    issues.push(issue('warning','REPEATED_CAMERA','Hay '+unique.size+' patrones de cámara; comprobar que es una decisión narrativa.'));
  }
 }
 return issues;
}

export function auditStoryboardV3(storyboard,project=null){
 const issues=[],add=(code,message,scene='(storyboard)')=>issues.push(issue('error',code,message,scene));
 if(!storyboard||typeof storyboard!=='object')add('STORYBOARD_MISSING','Falta storyboard.json preparado antes de construir las escenas.');
 else {
  if(storyboard.schema!==SCHEMA)add('SCHEMA_INVALID','Se requiere '+SCHEMA+'.');
  if(!number(storyboard.duration)||storyboard.duration<=0)add('DURATION_INVALID','La duración total no es válida.');
  if(!txt(storyboard.source?.narration))add('NARRATION_SOURCE_MISSING','Especificar el origen del reloj de voz/SRT.');
  if(number(storyboard.source?.audioDuration)&&!near(storyboard.source.audioDuration,storyboard.duration,.15))
   add('AUDIO_DURATION_MISMATCH','La duración de audio y storyboard no coincide.');
  if(!txt(storyboard.styleBible?.materials)||!txt(storyboard.styleBible?.cameraGrammar)||!txt(storyboard.styleBible?.identity))
   add('STYLE_BIBLE_MISSING','Falta definir materiales, lenguaje de cámara e identidad persistente.');
  const scenes=Array.isArray(storyboard.scenes)?storyboard.scenes:[];
  const shots=Array.isArray(storyboard.shots)?storyboard.shots:[];
  if(!scenes.length)add('STORYBOARD_SCENES_MISSING','Sin escenas.');
  if(!shots.length)add('STORYBOARD_SHOTS_MISSING','Sin planos.');
  const map=new Map(),shotCounts=new Map(),shotEnds=new Map();
  let cursor=0;
  for(const s of scenes){
   if(!txt(s.id)||map.has(s.id))add('SCENE_ID_INVALID','ID duplicado o vacío.',s.id);
   map.set(s.id,s);
   if(!number(s.start)||!number(s.end)||s.end<=s.start)add('SCENE_TIME_INVALID','Límites de escena inválidos.',s.id);
   else {if(!near(s.start,cursor,.12))add('SCENE_GAP','Hueco o solapamiento temporal.',s.id);cursor=s.end;}
   if(!txt(s.visualMode))add('VISUAL_MODE_MISSING','Escoger lenguaje visual según contenido.',s.id);
   if(!txt(s.incoming)||!txt(s.outgoing))add('CONTINUITY_MISSING','Sin estado de entrada y salida.',s.id);
   if(!Array.isArray(s.actors)||!Array.isArray(s.props))add('ELEMENTS_MISSING','Declarar actores y objetos.',s.id);
  }
  if(number(storyboard.duration)&&!near(cursor,storyboard.duration,.15))add('SCENE_COVERAGE','Escenas no cubren la duración.');
  const ids=new Set(),purposes=new Map();
  for(const shot of shots){
   const id=shot.sceneId,s=map.get(id);
   if(!txt(shot.id)||ids.has(shot.id))add('SHOT_ID_INVALID','ID de plano duplicado o vacío.',id);
   ids.add(shot.id);
   if(!s){add('SHOT_SCENE_NOT_FOUND','Plano sin escena correspondiente.',id);continue;}
   shotCounts.set(id,(shotCounts.get(id)||0)+1);
   if(!number(shot.start)||!number(shot.end)||shot.start<s.start-.08||shot.end>s.end+.08||shot.end<=shot.start)
    add('SHOT_TIME_INVALID','Plano fuera de tiempo.',id);
   else {
    if(!near(shot.start,shotEnds.get(id)??s.start,.15))add('SHOT_GAP','Hueco o solapamiento entre planos.',id);
    shotEnds.set(id,shot.end);
   }
   const purpose=norm(shot.visualPurpose);
   if(purpose.length<28||generic.test(purpose))add('SHOT_PURPOSE_GENERIC','Describir acción observable específica.',id);
   purposes.set(purpose,(purposes.get(purpose)||0)+1);
   if(!txt(shot.framing)||!txt(shot.camera?.motion)||!txt(shot.camera?.reason))
    add('CAMERA_UNPLANNED','Indicar encuadre, movimiento y motivo.',id);
   if(!txt(shot.raccord))add('RACCORD_MISSING','Explicar continuidad o corte motivado.',id);
   const phases=Array.isArray(shot.phases)?shot.phases:[];
   if(!phases.length)add('PHASES_MISSING','Sin estados verificables.',id);
   const kinds=new Set(phases.map(p=>p.kind)),actors=new Set();
   for(const ph of phases){
    if(!number(ph.start)||!number(ph.end)||ph.end<=ph.start||ph.start<shot.start-.08||ph.end>shot.end+.08)
     add('PHASE_TIME_INVALID','Fase '+ph.kind+' fuera de plano.',id);
    if(txt(ph.change).length<9)add('PHASE_CHANGE_GENERIC','Fase '+ph.kind+' sin cambio concreto.',id);
    if(physical(ph.selector))actors.add(ph.selector);
    else if(['cause','contact','reaction','result'].includes(ph.kind))
     add('PHASE_SELECTOR_MISSING','Fase '+ph.kind+' sin selector físico.',id);
   }
   if(kinds.has('contact')&&['narrative','mechanism'].includes(s.visualMode)){
    if(!kinds.has('cause')||!kinds.has('result'))add('CONTACT_CAUSALITY_INCOMPLETE','Falta causa o consecuencia.',id);
    if(actors.size<2)add('CONTACT_PARTICIPANTS_MISSING','Contacto exige dos participantes de geometría.',id);
   }
   if(project?.wordTimings?.length){
    const anchor=shot.speechAnchor;
    if(!txt(anchor?.text)||!number(anchor?.at))add('SPEECH_ANCHOR_MISSING','Sin palabra exacta y tiempo global SRT.',id);
    else if(!project.wordTimings.some(w=>norm(w.text)===norm(anchor.text)&&Math.abs(w.start-anchor.at)<=.5))
     add('SPEECH_ANCHOR_NOT_FOUND','Ancla no coincide con wordTimings.',id);
   }
   if(project){
    const target=project.scenes?.find(sc=>sc.id===id);
    if(target)for(const ph of phases){
     if(!physical(ph.selector)||ph.kind==='hold')continue;
     if(!selectorExists(target.customScene?.html,ph.selector))add('PHASE_TARGET_MISSING',ph.selector+' falta en HTML.',id);
     else if(!String(target.customScene?.script||'').includes(ph.selector))
      add('PHASE_NOT_EXECUTED',ph.selector+' no aparece en código GSAP.',id);
    }
   }
  }
  for(const s of scenes){
   if(!shotCounts.get(s.id))add('SCENE_WITHOUT_SHOT','Escena sin plano.',s.id);
   else if(!near(shotEnds.get(s.id),s.end,.15))add('SHOT_COVERAGE_MISSING','Plano final no llega al cierre.',s.id);
  }
  if(shots.length>=6&&Math.max(...purposes.values())>=Math.max(5,Math.ceil(shots.length*.65)))
   add('TEMPLATE_STORYBOARD','Un propósito literal se repite en la mayoría de los planos.');
  if(project){
   if(project.scenes?.length!==scenes.length)add('SCENE_COUNT_CHANGED','Escenas del JSON difieren del storyboard.');
   let start=0;
   for(const s of project.scenes||[]){
    const sb=map.get(s.id);
    if(!sb)add('SCENE_NOT_PLANNED','Escena nueva no planificada.',s.id);
    else {
     if(!near(start,sb.start,.16)||!near(start+s.duration,sb.end,.16))add('SCENE_TIMING_CHANGED','Tiempo del JSON difiere del storyboard.',s.id);
     if((s.direction?.shots||[]).length!==(shotCounts.get(s.id)||0))add('SHOTS_NOT_EXECUTED','Cantidad de planos no coincide.',s.id);
    }
    start+=s.duration||0;
   }
   if(!near(start,storyboard.duration,.2))add('PROJECT_DURATION_CHANGED','Duración total diferente.');
  }
 }
 if(project)issues.push(...auditProjectCraftSurface(project));
 const errors=issues.filter(i=>i.severity==='error');
 return {schema:'motion-studio.storyboard-audit/v3',pass:errors.length===0,visualApproved:false,issues,
  summary:{scenes:project?.scenes?.length??storyboard?.scenes?.length??0,
   shots:storyboard?.shots?.length??0,errors:errors.length,warnings:issues.length-errors.length},
  note:'La auditoría no verifica anatomía, fluidez ni semejanza con referencias; se necesita render revisado.'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2),get=k=>{const i=args.indexOf('--'+k);return i>=0?args[i+1]:null;};
  if(!get('storyboard')&&!get('project'))throw Error('Uso: audit-storyboard-v3.mjs --storyboard storyboard.json [--project proyecto.json]');
  const report=auditStoryboardV3(get('storyboard')?load(get('storyboard')):null,get('project')?load(get('project')):null);
  console.log(JSON.stringify(report,null,2));process.exitCode=report.pass?0:1;
 }catch(e){console.error(e.message);process.exitCode=2;}
}
