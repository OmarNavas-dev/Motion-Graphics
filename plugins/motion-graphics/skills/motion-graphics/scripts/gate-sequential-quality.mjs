import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {probeVideo} from './video-evidence.mjs';
import {auditStoryboardV3} from './audit-storyboard-v3.mjs';
import {auditCinematicComposition} from './audit-cinematic-composition.mjs';
import {auditProductionPlanning} from './audit-production-planning-2.31.mjs';
import {auditSpecificComposition} from './audit-specific-composition.mjs';
import {auditVisualContinuity} from './audit-visual-continuity.mjs';
import {auditExplainerCraft} from './audit-explainer-craft-v4.mjs';

const names=['Storyboard y composición','Acción causal real','Geometría e identidad','Cámara y continuidad','Inspección visual','Auditoría final'];
const validFile=f=>typeof f==='string'&&f.length>0&&fs.statSync(path.resolve(f),{throwIfNoEntry:false})?.isFile();
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const stageIssues=(report)=>report.issues?.filter(x=>x.severity==='error').map(x=>x.scene+': '+x.code+': '+x.message)||[];

function checkVideoEvidence(project,{reference,render}){
 const reasons=[];
 if(reference!=null){
  try{probeVideo(reference,{decode:true});}
  catch(error){reasons.push('Referencia: '+error.message);}
 }
 try{
  const {duration}=probeVideo(render,{decode:true});
  const expected=project.scenes.reduce((total,scene)=>total+scene.duration,0);
  const tolerance=1/(project.fps??30)+.06;
  if(Math.abs(duration-expected)>tolerance)
   reasons.push('El video de entrega dura '+duration+' s y el proyecto '+expected.toFixed(3)+' s.');
 }catch(error){reasons.push('Render de entrega: '+error.message);}
 return reasons;
}

/**
 * No stage may pass without its own reviewed artifacts. v3 uses one canonical
 * storyboard. Legacy 2.31 remains available only via the explicit flag.
 */
export function gateSequentialQuality(project,evidence={},options={}){
 const scenes=project.scenes||[];
 const legacy=options.legacy2_31===true;
 const planned=legacy
  ?auditProductionPlanning(project,{plan:options.plan,beats:options.beats,mechanics:options.mechanics})
  :auditStoryboardV3(options.storyboard||null,project);
 const cinematic=auditCinematicComposition(project);
 const explainer=auditExplainerCraft(project,{storyboard:options.storyboard||null});
 const craftErrors=explainer.issues.filter(x=>x.severity==='error').map(x=>x.scene+': '+x.code+': '+x.message);
 const generic=scene=>!scene.direction?.objective||scene.direction.objective.trim().length<28;
 const checks=[
  ()=>[
   ...(!scenes.length?['No hay escenas.']:[]),
   ...scenes.filter(generic).map(x=>x.id+': objetivo de escena insuficiente.'),
   ...(legacy?planned.errors.map(x=>x.code+': '+x.message):stageIssues(planned)),
   ...cinematic.issues.filter(x=>x.severity==='error').map(x=>x.code+': '+x.message),
   ...(legacy?[
    ...(!options.compositionPlan?['Falta composition-plan.json.']:auditSpecificComposition(project,options.compositionPlan).issues.map(x=>x.message)),
    ...(!options.continuityPlan?['Falta continuity-plan.json.']:auditVisualContinuity(project,options.continuityPlan).issues.map(x=>x.message))
   ]:[])
  ],
  ()=>[...craftErrors,...scenes.flatMap(s=>{
   const actorActions=(s.direction?.actions||[]).filter(x=>x.selector&&!/^(?:\.camera|\.world|\.L-(?:bg|mid|fg)|\.dvj-)/.test(x.selector));
   if(!actorActions.length)return [s.id+': sin movimiento físico documentado.'];
   return actorActions.filter(a=>!String(s.customScene?.script||'').includes(a.selector))
    .map(a=>s.id+': acción de '+a.selector+' sin cambio programado.');
  })],
  ()=>scenes.flatMap(s=>{
   const faults=[];
   if(!s.customScene?.html?.trim())faults.push(s.id+': sin geometría.');
   if(!s.customScene?.script?.trim())faults.push(s.id+': sin GSAP ejecutable.');
   return faults;
  }),
  ()=>scenes.filter(s=>!(s.direction?.shots||[]).length).map(s=>s.id+': sin plano ni dirección de cámara.'),
  ()=>checkVideoEvidence(project,options),
  ()=>legacy
   ?[...(!validFile(options.plan)?['Sin plan de legado.']:[]),...(!validFile(options.beats)?['Sin beats de legado.']:[]),...(!validFile(options.mechanics)?['Sin mechanics de legado.']:[])]
   :[...stageIssues(planned),...craftErrors],
 ];
 const results=[];
 let blockedAt=null;
 for(let i=0;i<checks.length;i++){
  const stage=evidence.stages?.[String(i+1)]||{};
  const reasons=checks[i]();
  if(stage.reviewerApproved!==true)reasons.push('No hay aprobación visual explícita de esta etapa.');
  if(!stage.notes?.trim())reasons.push('Faltan notas específicas de la revisión.');
  if(!Array.isArray(stage.artifacts)||!stage.artifacts.length||stage.artifacts.some(a=>!validFile(a)))
   reasons.push('Faltan archivos de evidencia verificables.');
  results.push({stage:i+1,name:names[i],status:reasons.length?'blocked':'pass',reasons});
  if(reasons.length){blockedAt=i+1;break;}
 }
 return {schema:'motion-studio.sequential-quality/3',ready:blockedAt===null,visualApproved:blockedAt===null,
  blockedAt,stages:results,planningSchema:planned.schema,
  planningAdvisories:legacy?planned.warnings:planned.issues.filter(x=>x.severity==='warning'),
  craftAdvisories:explainer.issues.filter(x=>x.severity==='warning'),
  cinematicAdvisories:cinematic.issues.filter(x=>x.severity==='warning'),
  note:'Sin render y aprobación explícita, la calidad visual permanece PENDIENTE.'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2),arg=k=>{const i=args.indexOf('--'+k);return i>=0?args[i+1]:undefined};
  if(!args[0])throw Error('Uso: gate-sequential-quality.mjs proyecto.json --storyboard storyboard.json --evidence evidencia.json --render exportado.mp4 [--reference referencia.mp4]');
  const raw=fs.readFileSync(args[0]);
  const result=gateSequentialQuality(JSON.parse(raw.toString('utf8').replace(/^\uFEFF/,'')),arg('evidence')?read(arg('evidence')):{},
   {storyboard:arg('storyboard')?read(arg('storyboard')):null,reference:arg('reference'),render:arg('render'),
    legacy2_31:args.includes('--legacy-2-31'),plan:arg('plan'),beats:arg('beats'),mechanics:arg('mechanics'),
    compositionPlan:arg('composition-plan')?read(arg('composition-plan')):null,
    continuityPlan:arg('continuity-plan')?read(arg('continuity-plan')):null});
  result.projectSha256=crypto.createHash('sha256').update(raw).digest('hex');
  console.log(JSON.stringify(result,null,2));process.exitCode=result.ready?0:2;
 }catch(e){console.error(e.message);process.exitCode=1;}
}
