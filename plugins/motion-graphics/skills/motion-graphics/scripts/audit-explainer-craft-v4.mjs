import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {storyboardPartForSelector,storyboardPartMoves} from './storyboard-art.mjs';

const simpleSelector=/^[.#][\w-]+$/;
const findSelectors=(html,sel)=>{
  if(!simpleSelector.test(sel||''))return false;
  const key=sel.slice(1);
  if(sel[0]==='#')return [...html.matchAll(/\bid\s*=\s*(["'])(.*?)\1/gs)].some(m=>m[2]===key);
  return [...html.matchAll(/\bclass\s*=\s*(["'])(.*?)\1/gs)].some(m=>m[2].split(/\s+/).includes(key));
};
const issue=(severity,code,scene,message)=>({severity,code,scene,message});

export function auditExplainerCraft(project,{storyboard=null}={}){
 const issues=[];const add=(severity,code,scene,message)=>issues.push(issue(severity,code,scene,message));
 if(!Array.isArray(project?.scenes)||!project.scenes.length)add('error','NO_SCENES','(global)','El proyecto no contiene escenas.');
 if(!storyboard)add('warning','STORYBOARD_NOT_PROVIDED','(global)','No se pudo comprobar la planificación previa.');
 const idsAcrossScenes=new Map();
 for(const scene of project?.scenes||[]){
  const id=scene.id||'(sin ID)',html=String(scene.customScene?.html||''),gsap=String(scene.customScene?.script||'');
  const parts=scene.authored?.source==='storyboard-art/v1' && scene.authored.layers?.length;
  if(!html.trim()&&!parts)add('error','NO_GEOMETRY',id,'Falta HTML/SVG.');
  if(!gsap.trim()&&!parts)add('warning','NO_ANIMATION',id,'No hay GSAP; confirmar que el plano es intencionalmente estático.');
  const ids=[...html.matchAll(/\bid\s*=\s*(["'])(.*?)\1/gs)].map(m=>m[2]);
  const local=new Set();for(const svgId of ids){
   if(local.has(svgId))add('error','DUPLICATE_SVG_ID',id,`ID ${svgId} repetido dentro de la escena.`);
   local.add(svgId);if(!idsAcrossScenes.has(svgId))idsAcrossScenes.set(svgId,[]);idsAcrossScenes.get(svgId).push(id);
  }
  for(const match of html.matchAll(/url\(\s*['"]?#([^)'"\s]+)['"]?\s*\)/g))
   if(!local.has(match[1]))add('error','UNRESOLVED_SVG_REFERENCE',id,`url(#${match[1]}) sin ID local.`);
  for(const action of scene.direction?.actions||[]){
   if(!simpleSelector.test(action.selector||''))continue;
   if(parts){
    if(!storyboardPartForSelector(scene.authored,action.selector))
     add('error','ACTION_SELECTOR_MISSING',id,`${action.selector} no existe en las capas.`);
    else if(!storyboardPartMoves(scene.authored,action.selector,action.at,action.at+action.duration))
     add('error','ACTION_NOT_ANIMATED',id,`${action.selector} no cambia durante la acción.`);
   }else if(!findSelectors(html,action.selector))add('error','ACTION_SELECTOR_MISSING',id,`${action.selector} no existe.`);
   else if(!gsap.includes(action.selector))add('error','ACTION_NOT_ANIMATED',id,`${action.selector} figura en dirección, pero no en GSAP.`);
  }
  if(scene.approved===true)add('warning','REQUIRES_VISUAL_PROOF',id,'approved=true no puede aceptarse sin evidencia real de render.');
  if(/<clipPath\b/i.test(html)&&/(?:translate|fromTo|\.to\()/i.test(gsap))add('warning','CLIP_MOTION_VISUAL_REVIEW',id,'Revisar fotogramas inicio/máximo/contacto/fin; las máscaras no garantizan la salida centrada.');
  if(/\b(?:scale|zoom)\b/i.test(gsap)&&(html.includes('ms-top-captions')||html.includes('fixed-note')))
   add('warning','CAMERA_SAFE_AREA_REVIEW',id,'Verificar que zoom y escala no recorten subtítulos ni etiquetas.');
  if(html.includes('ms-top-captions')&&!/ms-cap-|cap-word/.test(gsap))
   add('warning','CAPTION_TIMING_NOT_FOUND',id,'Hay subtítulos superiores, pero no se detectó sincronización explícita por palabra.');
  if(scene.duration>15&&!scene.direction?.shots?.length)add('warning','LONG_SCENE_WITHOUT_SHOTS',id,'Escena extensa sin planificación de planos.');
 }
 // Some projects scope SVG IDs per scene, so cross-scene duplicates are advisory.
 for(const [key,scenes] of idsAcrossScenes)if(new Set(scenes).size>1)
  add('warning','CROSS_SCENE_SVG_ID','(global)',`ID ${key} aparece en ${new Set(scenes).size} escenas; verificar aislamiento del DOM.`);
 if(!Array.isArray(project?.wordTimings)||!project.wordTimings.length)
  add('warning','WORD_TIMINGS_UNVERIFIED','(global)','No hay reloj global por palabra verificable en la raíz del proyecto.');
 add('warning','RENDER_REVIEW_REQUIRED','(global)','La geometría, el contacto, la cámara y la semejanza con referencias requieren inspección de MP4 real.');
 return {schema:'motion-studio.explainer-craft-audit/v4',pass:!issues.some(x=>x.severity==='error'),visualApproved:false,
  status:issues.some(x=>x.severity==='error')?'CODIGO_PENDIENTE':'VISUAL_PENDIENTE',
  counts:{errors:issues.filter(x=>x.severity==='error').length,warnings:issues.filter(x=>x.severity==='warning').length},issues};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);if(!args[0])throw Error('Uso: audit-explainer-craft-v4.mjs proyecto.json [--storyboard storyboard.json]');
  const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
  const i=args.indexOf('--storyboard');const report=auditExplainerCraft(read(args[0]),{storyboard:i>=0?read(args[i+1]):null});
  process.stdout.write(JSON.stringify(report,null,2)+'\n');process.exitCode=report.pass?0:2;
 }catch(e){console.error(e.message);process.exitCode=1;}
}
