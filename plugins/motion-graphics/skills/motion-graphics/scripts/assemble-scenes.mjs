import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {addCaptions} from './add-captions.mjs';
import {validateProject as bundledValidate} from './compat/server-utils.mjs';

export function assembleScenes(base,records,{timing,validate=bundledValidate}={}) {
 const p=structuredClone(base.project??base);
 if(!Array.isArray(records)||!records.length)throw Error('Faltan escenas.');
 const used=new Set();
 p.scenes=records.map((record,i)=>{
  const old=p.scenes?.[i]??{};
  const id=record.id??old.id??'scene-'+String(i+1).padStart(2,'0');
  if(used.has(id))throw Error('Id duplicado: '+id);used.add(id);
  if(!Number.isFinite(record.duration)||record.duration<.5||record.duration>60)throw Error(id+': duracion invalida.');
  const c=record.customScene;
  if(!c?.html?.trim() && !record.authored?.layers?.length)throw Error(id+': falta HTML completo o composición por capas.');
  const title=record.title??old.title??'';
  const excerpt=record.scriptExcerpt??old.scriptExcerpt;
  if(typeof excerpt!=='string')throw Error(id+': indicar scriptExcerpt explicitamente. No asignar guion por saltos de linea.');
  return {...old,...record,id,title,scriptExcerpt:excerpt,duration:record.duration,approved:false,
   customScene:c?.html?.trim()?{html:c.html,css:c.css??'',script:c.script??''}:undefined};
 });
 let result=base.project?{...base,project:p}:p;
 if(timing)result=addCaptions(result,timing);
 const q=result.project??result,normalized=validate(q);
 for(const [i,s] of q.scenes.entries()){
  if(s.customScene)for(const field of ['html','css','script']){
   if(normalized.scenes[i]?.customScene?.[field]!==s.customScene[field])throw Error(s.id+': el importador alteraria '+field);
  }
  if(s.authored?.source==='storyboard-art/v1' &&
   JSON.stringify(normalized.scenes[i]?.authored)!==JSON.stringify(s.authored))
   throw Error(s.id+': el importador alteraría el arte del storyboard.');
 }
 return result;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){try{
 const a=process.argv.slice(2),opt=k=>{const i=a.indexOf(k);return i<0?undefined:a[i+1];};
 const [basePath,modulePath,out]=a;if(!out)throw Error('Uso: node assemble-scenes.mjs base.json escenas.mjs salida.json [--words palabras.json] [--repo MOTION_STUDIO]');
 if(fs.existsSync(out))throw Error('Destino existente; elegir otro.');
 const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
 // The module is reviewed authoring code, not an untrusted JSON attachment.
 const records=(await import(pathToFileURL(path.resolve(modulePath)).href)).default;
 let validate=bundledValidate;if(opt('--repo'))({validateProject:validate}=await import(pathToFileURL(path.resolve(opt('--repo'),'server-utils.mjs')).href));
 const result=assembleScenes(read(basePath),records,{timing:opt('--words')?read(opt('--words')):undefined,validate});
 fs.writeFileSync(out,JSON.stringify(result,null,2));console.log('Proyecto ensamblado. Ejecutar validacion de subtitulos y revision de navegador antes de entregar.');
}catch(e){console.error(e.message);process.exitCode=1;}}

