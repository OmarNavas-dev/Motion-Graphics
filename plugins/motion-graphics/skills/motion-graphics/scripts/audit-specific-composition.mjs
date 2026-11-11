import fs from 'node:fs';
import path from 'node:path';

const generic=/^(?:mostrar|ilustrar|representar|visualizar|explicar)\s+(?:mediante|una?|el|la|cómo|como)\b|mostrar mediante una acci[oó]n visible|escena (?:sobre|de)|animaci[oó]n de/i;
const splitClasses=html=>[...html.matchAll(/class\s*=\s*["']([^"']+)["']/g)].flatMap(m=>m[1].split(/\s+/)).filter(Boolean);
const hasSelector=(html,selector)=>{
 if(!/^[.#][\w-]+$/.test(selector||''))return false;
 const id=selector.slice(1);
 return selector[0]==='.'?splitClasses(html).includes(id):new RegExp('\\bid\\s*=\\s*["\']'+id+'["\']').test(html);
};
const structure=html=>html.replace(/(?:id|class)\s*=\s*["'][^"']+["']/g,'').replace(/>[^<]+</g,'><').replace(/#[0-9a-fA-F]{3,8}/g,'').replace(/\s+/g,' ').trim();
const modes=new Set(['narrative','mechanism','scientific-diagram','data-viz','symbolic','typographic','documentary']);

export function auditSpecificComposition(project,plan) {
 const issues=[],scenes=project.scenes||[],records=plan?.scenes||[];
 if(plan?.schema!=='motion-studio.composition-plan/1')issues.push({scene:'proyecto',code:'PLAN_SCHEMA',message:'Falta composition-plan.json con esquema correcto.'});
 const byId=new Map(records.map(r=>[r.sceneId,r]));
 const structures=new Map();
 const layouts=new Map();
 const events=Array.isArray(plan?.visualEvents)?plan.visualEvents:[];
 if(!events.length)issues.push({scene:'proyecto',code:'NO_VISUAL_EVENTS',message:'Falta un mapa de acontecimientos visuales independiente de las oraciones.'});
 const ids=new Set(scenes.map(s=>s.id));
 const coveredEvents=new Set();
 for(const ev of events){
  if(!ev.id||!ev.action||!ev.outcome||!Array.isArray(ev.sceneIds)||!ev.sceneIds.length)
   issues.push({scene:'proyecto',code:'INCOMPLETE_EVENT',message:'Acontecimiento sin acción, consecuencia o escena asignada.'});
  for(const id of ev.sceneIds||[]){
   if(!ids.has(id))issues.push({scene:id,code:'EVENT_SCENE_MISSING',message:'Un acontecimiento apunta a una escena inexistente.'});
   coveredEvents.add(id);
  }
 }
 for(const s of scenes){
  const id=s.id||'(sin id)',html=s.customScene?.html||'',r=byId.get(id);
  const add=(code,message)=>issues.push({scene:id,code,message});
  if(!r){add('MISSING_SCENE_BRIEF','Falta ficha de composición específica.');continue;}
  if(events.length&&!coveredEvents.has(id))add('SCENE_WITHOUT_EVENT','Escena sin acontecimiento visual justificado.');
  if(!modes.has(r.visualMode))add('UNKNOWN_VISUAL_MODE','Indicar un visualMode adecuado al tema (narrativo, mecanismo, diagrama, datos, simbólico, tipográfico o documental).');
  if(!r.layoutIntent?.trim()||r.layoutIntent.trim().length<14)add('NO_LAYOUT_INTENT','Explicar por qué este encuadre organiza los objetos de esa manera.');
  for(const field of ['setting','subject','cause','physicalAction','visibleResult','visualMotif','nextContinuity']){
   if(typeof r[field]!=='string'||r[field].trim().length<12||generic.test(r[field].trim()))add('GENERIC_BRIEF',`Campo ${field} ausente o genérico.`);
  }
  if(!Array.isArray(r.objects)||!r.objects.length)add('NO_SCENE_OBJECTS','Falta inventario de objetos con selector existente.');
  for(const o of r.objects||[]){
   if(!o.name?.trim()||!hasSelector(html,o.selector))add('OBJECT_NOT_DRAWN',`Objeto ${o.name||'?'} sin selector existente ${o.selector||'?'}.`);
  }
  const essential=r.essentialElements??r.essentialActors;
  if(!Array.isArray(essential)||!essential.length)add('MISSING_ESSENTIALS','Falta inventario de sujetos, conceptos o elementos esenciales, separado de decoración.');
  for(const actor of essential||[]){
   if(!(actor.role||actor.concept)?.trim()||!hasSelector(html,actor.selector))add('ESSENTIAL_NOT_DRAWN',`Elemento esencial ${actor.role||actor.concept||'?'} ausente: ${actor.selector||'?'}.`);
  }
  if(!r.visualEvidence?.start||!r.visualEvidence?.end)add('NO_BEFORE_AFTER_EVIDENCE','Faltan descripciones de lo que se comprobará en fotogramas inicial/final.');
  if(r.placeholderPrimary===true){
   if(!['symbolic','scientific-diagram','data-viz','typographic'].includes(r.visualMode)||!r.symbolicJustification?.trim())
    add('PLACEHOLDER_AS_SCENE','Un signo, tarjeta o icono no puede sustituir sin justificación al acontecimiento principal.');
  }
  if(!r.shotPurpose||r.shotPurpose.trim().length<18)add('NO_SHOT_PURPOSE','Falta el propósito concreto del encuadre y por qué es adecuado.');
  if(!r.visualQuestion?.trim()||r.visualQuestion.trim().length<15)add('NO_VISUAL_QUESTION','Falta la pregunta visual que debe responder esta composición sin subtítulos.');
  if(r.layoutIntent){
   const key=r.layoutIntent.toLowerCase().replace(/\s+/g,' ').trim(),prior=layouts.get(key);
   if(prior&&!(r.continuityReason||'').trim())add('REUSED_LAYOUT_UNJUSTIFIED',`Se repite el mismo diseño de ${prior} sin justificación de continuidad.`);
   else layouts.set(key,id);
  }
  if(!Array.isArray(r.states)||r.states.length<2||r.states.some(x=>!x.timeLabel||!x.visibleState))add('NO_VISUAL_STATES','Declarar estados inicial y final comprobables.');
  if(generic.test(s.direction?.objective||'')||!(s.direction?.objective||'').trim())add('GENERIC_OBJECTIVE','El objetivo de direction es genérico.');
  if(!/<(?:path|rect|circle|ellipse|polygon|polyline|line|text|image)\b/i.test(html)&&splitClasses(html).length<3)add('THIN_COMPOSITION','La composición carece de geometría identificable.');
  const sig=structure(html);
  if(sig.length>80&&structures.has(sig))add('DUPLICATE_LAYOUT',`La estructura visual replica exactamente a ${structures.get(sig)}.`);
  else structures.set(sig,id);
 }
 for(const r of records)if(!scenes.some(s=>s.id===r.sceneId))issues.push({scene:r.sceneId,code:'ORPHAN_BRIEF',message:'Ficha sin escena correspondiente.'});
 return {schema:'motion-studio.composition-audit/1',pass:issues.length===0,scenes:scenes.length,issues,
 limitations:'Un plan específico y selectores existentes no prueban acabado visual. Inspeccionar fotogramas renderizados antes de aprobar.'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 try{
  const [projectPath,planPath]=process.argv.slice(2);
  if(!projectPath||!planPath)throw Error('Uso: node audit-specific-composition.mjs proyecto.json composition-plan.json');
  const report=auditSpecificComposition(JSON.parse(fs.readFileSync(projectPath,'utf8')),JSON.parse(fs.readFileSync(planPath,'utf8')));
  console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=2;
 }catch(e){console.error(e.message);process.exitCode=1;}
}
