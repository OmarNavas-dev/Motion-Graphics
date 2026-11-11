import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateShotPlan} from './validate-shot-plan.mjs';
import {validateBeats} from './validate-beats.mjs';
import {validateMechanics} from './validate-mechanics.mjs';

const str=x=>typeof x==='string'?x.trim():'';
const placeholder=/^(?:transformaci[oó]n material de\b|animaci[oó]n de\b|movimiento del elemento\b|cambio visible tras la acci[oó]n\b|cambio verificable en\b)/i;
const specific=x=>str(x).length>=14&&!placeholder.test(str(x));
const physical=x=>str(x)&&!/^(\.camera|\.world|#camera|\.L-bg|\.L-mid|\.L-fg|\.dvj-)/i.test(str(x));
const selExists=(html,sel)=>{
  if(!/^[.#][\w-]+$/.test(sel||''))return false;
  const id=sel.slice(1);
  if(sel[0]==='.')return [...String(html||'').matchAll(/\bclass\s*=\s*(["'])(.*?)\1/gs)]
    .some(m=>m[2].split(/\s+/).includes(id));
  return [...String(html||'').matchAll(/\bid\s*=\s*(["'])(.*?)\1/gs)].some(m=>m[2]===id);
};
const near=(a,b,e=.2)=>Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Math.abs(Number(a)-Number(b))<=e;
const load=v=>v&&typeof v==='object'?v:(typeof v==='string'&&fs.existsSync(v)?JSON.parse(fs.readFileSync(v,'utf8')):null);
const problem=(code,message,scene='(plan)')=>({code,message,scene,severity:'error'});

export function auditProjectPlanningSurface(project){
 const issues=[],scenes=project?.scenes||[];
 for(const s of scenes){
  if(!str(s.customScene?.html))continue; // authored-layer scenes use a different contract
  const d=s.direction||{},id=s.id;
  if(!str(d.visualMode))issues.push(problem('VISUAL_MODE_MISSING','Falta visualMode: no se define el lenguaje visual ni las pruebas.',id));
  if(!specific(d.objective))issues.push(problem('OBJECTIVE_GENERIC','El objetivo no es un acontecimiento específico.',id));
  if(!Array.isArray(d.shots)||!d.shots.length)issues.push(problem('SHOTS_MISSING','Sin planos ni tiempos documentados.',id));
  for(const [i,a] of (d.actions||[]).entries()){
   if(!specific(a.action||a.description))issues.push(problem('GENERIC_ACTION','Acción '+(i+1)+' sin verbo ejecutable y específico.',id));
   if(!specific(a.result||a.visibleResult))issues.push(problem('GENERIC_RESULT','Acción '+(i+1)+' sin consecuencia visual concreta.',id));
   if(!selExists(s.customScene?.html,a.selector))issues.push(problem('ACTION_SELECTOR_ABSENT','Selector '+(a.selector||'(ausente)')+' inexistente.',id));
  }
 }
 if(/profundidad|2\.5d|estratific|parallax/i.test(String(project.creativeBrief||''))&&scenes.length>=3){
  const flat=scenes.filter(s=>{
   const code=String(s.customScene?.script||'');
   return /\.camera\b/.test(code)&&!(/\.L-bg\b/.test(code)&&/\.L-mid\b/.test(code)&&/\.L-fg\b/.test(code));
  }).length;
  if(flat/scenes.length>=.7)issues.push(problem('DEPTH_PLAN_NOT_EXECUTED',
   'El brief promete profundidad pero '+flat+' de '+scenes.length+' escenas solo animan cámara general.'));
 }
 return {issues,pass:!issues.some(x=>x.severity==='error')};
}

/** The plan must exist before code, then agree with the generated project. */
export function auditProductionPlanning(project,{plan,beats,mechanics}={}){
 const issues=[...auditProjectPlanningSurface(project).issues],warnings=[];
 const add=(c,m,s)=>issues.push(problem(c,m,s));
 const spans=new Map();let total=0;
 for(const scene of project.scenes||[]){
  spans.set(scene.id,{start:total,end:total+scene.duration,scene});total+=scene.duration;
 }
 const shots=load(plan),sheet=load(beats),motion=load(mechanics);
 if(!shots)add('SHOT_PLAN_ABSENT','Falta plan.json: no escribir SVG todavía.');
 if(!sheet)add('BEAT_PLAN_ABSENT','Falta beats.json sincronizado con la voz.');
 if(!motion)add('MECHANICS_PLAN_ABSENT','Falta mechanics.json para contacto y consecuencia.');
 if(shots){
  for(const msg of validateShotPlan(shots))add('SHOT_PLAN_INVALID',msg);
  if(!near(shots.duration,total,.05))add('DURATION_MISMATCH','El plan y el proyecto tienen duraciones distintas.');
  const grouped=new Map();
  for(const shot of shots.scenes||[]){
   const id=shot.sceneId||(spans.has(shot.id)?shot.id:'');
   const span=spans.get(id);
   if(!span){add('SHOT_SCENE_NOT_FOUND','Plano '+shot.id+' sin sceneId válido.');continue;}
   if(shot.start<span.start-.05||shot.end>span.end+.05)add('SHOT_OUTSIDE_SCENE','Plano '+shot.id+' fuera del tiempo de '+id,id);
   grouped.set(id,[...(grouped.get(id)||[]),shot]);
  }
  for(const [id,span] of spans){
   const p=grouped.get(id)||[],q=span.scene.direction?.shots||[];
   if(p.length!==q.length){add('SHOT_COUNT_NOT_EXECUTED',id+': '+p.length+' planos preparados, '+q.length+' ejecutados.',id);continue;}
   for(let i=0;i<p.length;i++)if(!near(p[i].start-span.start,q[i].at,.3)||!near(p[i].end-p[i].start,q[i].duration,.3))
    add('SHOT_TIMING_NOT_EXECUTED',id+': el plano '+(i+1)+' no conserva su tiempo.',id);
  }
 }
 if(sheet){
  const check=validateBeats(sheet);
  for(const msg of check.errors)add('BEAT_PLAN_INVALID',msg);
  for(const msg of check.warnings)warnings.push({code:'BEAT_WARNING',message:msg});
  if(!near(total,sheet.duration,.05))add('BEAT_DURATION_MISMATCH','Beat sheet y proyecto tienen duraciones diferentes.');
  const covered=new Set();
  for(const beat of sheet.beats||[]){
   const span=spans.get(beat.scene);
   if(!span){add('BEAT_SCENE_NOT_FOUND','Beat '+beat.id+' sin escena válida.');continue;}
   covered.add(beat.scene);
   if(beat.at<span.start-.05||beat.at>=span.end+.05)add('BEAT_OUTSIDE_SCENE','Beat '+beat.id+' fuera de '+beat.scene,beat.scene);
   if(!Number.isFinite(beat.speechAt)&&beat.narration!=='silencio deliberado'){
    if(project.narrationMode==='single'||project.narrationMode==='clips')
     add('BEAT_SPEECH_ANCHOR_MISSING','Beat '+beat.id+' sin segundo de palabra real del SRT.',beat.scene);
    else warnings.push({code:'SPEECH_ANCHOR_UNVERIFIED',message:'Beat '+beat.id+' sin ancla de palabra del SRT.'});
   }
  }
  for(const id of spans.keys())if(!covered.has(id))add('SCENE_WITHOUT_BEAT','Escena '+id+' sin acontecimiento sincronizado.',id);
 }
 if(motion){
  const check=validateMechanics(motion);
  for(const msg of check.errors)add('MECHANICS_PLAN_INVALID',msg);
  for(const msg of check.warnings)warnings.push({code:'MECHANICS_WARNING',message:msg});
  const planned=new Map();
  for(const a of motion.actions||[]){
   const id=a.sceneId||a.scene,span=spans.get(id);
   if(!span){add('MECHANICS_SCENE_NOT_FOUND','Acción '+a.id+' sin sceneId.');continue;}
   if(a.start<span.start-.05||a.end>span.end+.05)add('MECHANICS_OUTSIDE_SCENE','Acción '+a.id+' fuera del tiempo.',id);
   if(['contact','hinge'].includes(a.kind)&&(!Number.isFinite(a.contactAtTime)||a.contactAtTime<a.start||a.contactAtTime>a.end))
    add('CONTACT_TIME_MISSING','Acción '+a.id+' sin instante global válido de contacto.',id);
   if(!selExists(span.scene.customScene?.html,a.selector))add('MECHANICS_SELECTOR_ABSENT','Acción '+a.id+' sin selector físico en HTML.',id);
   if(!specific(a.cause)||!specific(a.visibleResult))add('MECHANICS_GENERIC','Acción '+a.id+' sin causa y resultado específico.',id);
   planned.set(id,[...(planned.get(id)||[]),a]);
  }
  for(const [id,span] of spans)for(const a of (span.scene.direction?.actions||[]).filter(x=>physical(x.selector))){
   const start=span.start+Number(a.at),end=start+Number(a.duration);
   if(!(planned.get(id)||[]).some(p=>p.selector===a.selector&&p.start<=end+.2&&p.end>=start-.2))
    add('ACTION_NOT_PLANNED',id+': '+a.selector+' se mueve sin mecanismo planificado para ese tiempo.',id);
  }
 }
 return {schema:'motion-studio.production-planning/2.31',pass:!issues.length,
  errors:issues,warnings,duration:total,scenes:spans.size,visualApproved:false};
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 try{
  const args=process.argv.slice(2),get=k=>{const i=args.indexOf('--'+k);return i>=0?args[i+1]:null;};
  if(!get('project'))throw Error('Uso: node scripts/audit-production-planning-2.31.mjs --project proyecto.json --plan plan.json --beats beats.json --mechanics mechanics.json');
  const project=JSON.parse(fs.readFileSync(get('project'),'utf8'));
  const report=auditProductionPlanning(project,{plan:get('plan'),beats:get('beats'),mechanics:get('mechanics')});
  console.log(JSON.stringify(report,null,2));process.exitCode=report.pass?0:1;
 }catch(e){console.error(e.message);process.exitCode=2;}
}
