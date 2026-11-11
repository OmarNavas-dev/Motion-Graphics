import fs from 'node:fs';
import path from 'node:path';

const read=(f)=>JSON.parse(fs.readFileSync(f,'utf8'));
const getNode=(html,selector)=>{
 if(!/^[.#][\w-]+$/.test(selector||''))return null;
 for(const m of html.matchAll(/<([\w:-]+)\b([^>]*)>/g)){
  const attrs=m[2],target=selector.slice(1);
  const found=selector[0]==='.'?
   new RegExp('\\bclass\\s*=\\s*["\'][^"\']*\\b'+target+'\\b[^"\']*["\']').test(attrs):
   new RegExp('\\bid\\s*=\\s*["\']'+target+'["\']').test(attrs);
  if(found)return attrs;
 }
 return null;
};
const attr=(attrs,key)=>attrs?.match(new RegExp('\\b'+key+'\\s*=\\s*["\']([^"\']*)["\']'))?.[1];

export function auditVisualContinuity(project,plan){
 const issues=[],scenes=new Map((project.scenes||[]).map(s=>[s.id,s]));
 const add=(scene,code,message)=>issues.push({scene,code,message});
 if(plan?.schema!=='motion-studio.continuity-plan/1')add('proyecto','PLAN_SCHEMA','Falta continuity-plan.json con esquema correcto.');
 if(!Array.isArray(plan?.assets))add('proyecto','ASSET_LIST','Falta inventario de identidades persistentes.');
 const seen=new Set();
 for(const a of plan?.assets||[]){
  if(!a.assetId||!a.appearanceToken||!a.modelToken||!Array.isArray(a.occurrences)||a.occurrences.length<2){
   add('proyecto','INVALID_ASSET','Identidad sin ID, apariencia, modelo o al menos dos apariciones.');continue;
  }
  if(seen.has(a.assetId))add('proyecto','DUPLICATE_ASSET',`Identidad repetida: ${a.assetId}.`);
  seen.add(a.assetId);
  for(const ref of a.occurrences){
   const s=scenes.get(ref.sceneId);
   if(!s){add(ref.sceneId,'SCENE_MISSING','Referencia a escena inexistente.');continue;}
   const attrs=getNode(s.customScene?.html||'',ref.selector);
   if(!attrs){add(ref.sceneId,'ASSET_NOT_DRAWN',`No existe el selector ${ref.selector} de ${a.assetId}.`);continue;}
   if(attr(attrs,'data-dvj-asset')!==a.assetId)add(ref.sceneId,'ASSET_ID_DRIFT',`La identidad de ${a.assetId} no coincide con el SVG.`);
   if(attr(attrs,'data-dvj-appearance')!==a.appearanceToken)add(ref.sceneId,'APPEARANCE_DRIFT',`La apariencia de ${a.assetId} cambió sin justificación.`);
   const model=attr(attrs,'data-dvj-model');
   if(model!==a.modelToken&&!ref.transformationReason?.trim())
    add(ref.sceneId,'MODEL_DRIFT',`El modelo de ${a.assetId} cambia sin una transformación documentada.`);
  }
 }
 if((project.scenes?.length||0)>2&&!(plan?.assets||[]).length&&!plan?.noPersistentAssetsReason?.trim())
  add('proyecto','NO_CONTINUITY_STRATEGY','No hay activos persistentes ni explicación de por qué las escenas son independientes.');
 return {schema:'motion-studio.visual-continuity-audit/1',pass:issues.length===0,issues,
 limitations:'Los tokens documentan identidad, pero no demuestran igualdad de silueta ni proporciones; cotejar fotogramas renderizados.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 try{
  const [projectPath,planPath]=process.argv.slice(2);
  if(!projectPath||!planPath)throw Error('Uso: node audit-visual-continuity.mjs proyecto.json continuity-plan.json');
  const report=auditVisualContinuity(read(projectPath),read(planPath));
  console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=2;
 }catch(e){console.error(e.message);process.exitCode=1;}
}
