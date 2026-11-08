// Shared visual beat sheet: deterministic timeline for narration, video and optional SFX.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const text=v=>typeof v==='string'&&v.trim().length>0;
export function validateBeats(plan){
  const errors=[],warnings=[];
  if(!plan||!Number.isFinite(plan.duration)||plan.duration<=0)
    return {ok:false,errors:['duration debe ser positiva'],warnings};
  if(!Array.isArray(plan.beats)||!plan.beats.length)
    return {ok:false,errors:['Se requieren beats con marcas de tiempo'],warnings};
  const ids=new Set();let prev=-Infinity;
  for(const [i,b] of plan.beats.entries()){
    const name=`beat ${i+1}`;
    if(!text(b.id)||ids.has(b.id))errors.push(`${name}: id vacío o duplicado`);
    ids.add(b.id);
    if(!Number.isFinite(b.at)||b.at<0||b.at>=plan.duration||b.at<prev)
      errors.push(`${name}: tiempo inválido o fuera de orden`);
    prev=b.at;
    if(!text(b.scene)||!text(b.visual)||!text(b.cause)||!text(b.effect))
      errors.push(`${name}: falta escena, acción visible, causa o reacción`);
    if(!text(b.subject))errors.push(`${name}: falta sujeto persistente o protagonista visual`);
    if(b.hold!==undefined && (!Number.isFinite(b.hold)||b.hold<0||b.at+b.hold>plan.duration+.001))
      errors.push(`${name}: duración de lectura fuera de límites`);
    if(b.sound!==undefined && typeof b.sound!=='string')errors.push(`${name}: sonido debe ser etiqueta o vacío`);
    if(b.speechAt!==undefined&&(!Number.isFinite(b.speechAt)||Math.abs(b.speechAt-b.at)>.25))
      warnings.push(`${name}: beat separado de la palabra ancla más de 250 ms`);
  }
  const scenes=new Set(plan.beats.map(b=>b.scene));
  if(scenes.size>1){
    for(const [i,b] of plan.beats.entries()) if(i>0&&plan.beats[i-1].scene!==b.scene && !text(b.bridge))
      warnings.push(`beat ${i+1}: corte de escena sin elemento de continuidad o motivo declarado`);
  }
  return {ok:errors.length===0,errors,warnings,count:plan.beats.length};
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  try{const filename=process.argv[2];if(!filename)throw new Error('Uso: node validate-beats.mjs beats.json');
    const r=validateBeats(JSON.parse(fs.readFileSync(filename,'utf8')));console.log(JSON.stringify(r,null,2));process.exitCode=r.ok?0:1;
  }catch(e){console.error(e.message);process.exitCode=1;}
}
