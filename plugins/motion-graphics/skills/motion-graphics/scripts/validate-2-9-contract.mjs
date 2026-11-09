import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const STYLE_IDS=Object.freeze('paper-world ink-line weather-widget data-story swiss-kinetic particle-field growing-city explainer-diagram time-travel editor-ui motion-app-ui design-app-ui audio-app-ui swiss-grid editorial-paper midnight-grid paper-cut risograph blueprint graphite-ui poster-pop'.split(' '));
export const SOUND_KINDS=Object.freeze('whoosh impact click pop riser chime pad wind'.split(' '));
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const simpleClass=s=>typeof s==='string'&&/^\.[A-Za-z][\w-]*$/.test(s);
const names=new Set(STYLE_IDS),kinds=new Set(SOUND_KINDS),transforms=new Set(['x','y','scale','rotation','opacity']);
export function validateStudio29(raw){
 const errors=[],warnings=[];
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {passed:false,errors:['JSON inválido.'],warnings};
 const project=raw.project||raw,scenes=project.scenes||[];
 if(!Array.isArray(scenes)||!scenes.length)return {passed:false,errors:['No hay escenas.'],warnings};
 const total=scenes.reduce((n,s)=>n+(finite(s.duration)?s.duration:0),0);
 function checkStyle(style,context){if(style!==undefined&&style!==''&&!names.has(style))errors.push('stylePreset desconocido: '+context);}
 checkStyle(project.stylePreset,'proyecto');
 for(const [i,scene] of scenes.entries()){
  const label='escena '+(i+1);checkStyle(scene.stylePreset,label);
  if(!finite(scene.duration)||scene.duration<=0)errors.push('Duración inválida: '+label);
  const dir=scene.direction||{},html=scene.customScene?.html||'';
  const hasClass=selector=>simpleClass(selector)&&[...html.matchAll(/\bclass\s*=\s*["']([^"']+)["']/g)].some(m=>m[1].split(/\s+/).includes(selector.slice(1)));
  if(dir.cameraTarget!==undefined&&!hasClass(dir.cameraTarget))errors.push('Objetivo de cámara ausente: '+label);
  for(const shot of dir.shots||[])if(!finite(shot.at)||shot.at<0||!finite(shot.duration)||shot.duration<=0||shot.at+shot.duration>scene.duration+.01)errors.push('Plano fuera de rango: '+label);
  for(const action of dir.actions||[]){
   if(!action.motion)continue;
   if(!hasClass(action.selector))errors.push('Acción sin selector: '+label);
   if(!finite(action.at)||!finite(action.duration)||action.at<0||action.duration<=0||action.at+action.duration>scene.duration+.01)errors.push('Acción fuera de rango: '+label);
   for(const key of ['from','to']){
    const obj=action.motion[key];
    if(!obj||typeof obj!=='object'||Array.isArray(obj)||Object.entries(obj).some(([k,v])=>!transforms.has(k)||!finite(v)))errors.push('Transformación inválida: '+label);
   }
  }
 }
 const brand=project.brandProfile;
 if(brand!==undefined){
  if(!brand||typeof brand!=='object'||Array.isArray(brand))errors.push('brandProfile inválido.');
  else{
   for(const [k,v] of Object.entries(brand.colors||{}))if(!['background','ink','accent'].includes(k)||typeof v!=='string'||!/^#[0-9a-f]{6}$/i.test(v))errors.push('Color inválido: '+k);
   for(const key of ['motionRules','avoid'])if(brand[key]!==undefined&&(!Array.isArray(brand[key])||brand[key].length>12))errors.push('Demasiadas reglas: '+key);
  }
 }
 const sfx=project.soundDesign;
 if(sfx?.enabled===true){
  if(!Array.isArray(sfx.cues)||sfx.cues.length>150)errors.push('Lista de sonidos inválida.');
  else for(const [i,c] of sfx.cues.entries())if(!kinds.has(c.type)||!finite(c.at)||c.at<0||!finite(c.duration)||c.duration<=0||c.duration>10||c.at+c.duration>total+.001||!finite(c.gain??.2)||(c.gain??.2)<0||(c.gain??.2)>1)errors.push('Cue inválido: '+i);
 }
 if(project.loop===true)warnings.push('Cierre visual del loop requiere revisión del MP4.');
 if(!project.audioAsset&&!project.voiceClips?.length)warnings.push('No se puede certificar sincronía sin audio.');
 warnings.push('El JSON válido no certifica calidad artística del MP4.');
 return {passed:errors.length===0,stylePreset:project.stylePreset||null,sceneCount:scenes.length,durationSeconds:total,errors,warnings};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const file=process.argv[2];if(!file)throw Error('Uso: node validate-2-9-contract.mjs proyecto.json');
 const report=validateStudio29(JSON.parse(fs.readFileSync(file,'utf8')));
 console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
}
