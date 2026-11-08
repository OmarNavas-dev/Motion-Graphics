#!/usr/bin/env node
// Valida el contrato de preproducción entre planos ANTES de construir el JSON.
import fs from 'node:fs';

export function validateShotPlan(plan){
 const errors=[];
 if(!plan||!Array.isArray(plan.scenes)||!plan.scenes.length)return ['Faltan escenas en el plan.'];
 const seen=new Set();let previous=null;
 const text=(v)=>typeof v==='string'&&v.trim().length>0;
 if(!Number.isFinite(plan.duration)||plan.duration<=0)errors.push('Duración total inválida.');
 for(const [index,s] of plan.scenes.entries()){
  const name=`Plano ${index+1} (${s?.id??'sin id'})`;
  if(!s||!text(s.id)||seen.has(s.id))errors.push(name+': ID ausente o repetido.');else seen.add(s.id);
  if(!Number.isFinite(s?.start)||!Number.isFinite(s?.end)||s.end<=s.start)errors.push(name+': tiempos inválidos.');
  else if(previous&&Math.abs(s.start-previous.end)>.05)errors.push(name+': hueco o solapamiento respecto al plano anterior.');
  for(const k of ['visualGoal','location','lighting','narration','entryFrame','exitFrame'])if(!text(s?.[k]))errors.push(name+': falta '+k+'.');
  if(!s?.camera||!text(s.camera.shot)||!text(s.camera.movement)||!text(s.camera.from)||!text(s.camera.to))errors.push(name+': falta planificación de cámara.');
  if(!s?.action||!text(s.action.anticipation)||!text(s.action.main)||!text(s.action.contact)||!text(s.action.recovery))errors.push(name+': falta una fase de la acción. Usar "no aplica" si realmente no hay acción corporal.');
  if(!Array.isArray(s?.actors)||!Array.isArray(s?.props))errors.push(name+': actores y objetos deben ser listas (pueden estar vacías).');
  for(const [kind,items] of [['actor',s?.actors],['objeto',s?.props]])if(Array.isArray(items))for(const item of items)if(!text(item.id)||!text(item.startState)||!text(item.endState))errors.push(name+': '+kind+' sin identidad o estados de entrada/salida.');
  if(previous){
   if(!previous.transition||previous.transition.to!==s.id||!text(previous.transition.type)||!text(previous.transition.continuity))errors.push(name+': enlace con plano anterior incompleto.');
   // Si una identidad reaparece consecutivamente en el mismo espacio sin corte
   // temporal, el estado debe coincidir o justificarse en la continuidad.
   if(previous.location===s.location && !/salto temporal|elipsis|cambio de tiempo/i.test(previous.transition?.continuity??'')){
    for(const kind of ['actors','props'])for(const item of (previous[kind]??[])){
     const cur=(s[kind]??[]).find(x=>x.id===item.id);
     if(cur&&cur.startState!==item.endState)errors.push(name+`: ${item.id} cambia de estado entre planos (${item.endState} → ${cur.startState}).`);
    }
   }
  }
  previous=s;
 }
 if(previous?.transition?.to!==null)errors.push('Último plano: transition.to debe ser null.');
 if(Number.isFinite(plan.duration)&&Math.abs((previous?.end??0)-plan.duration)>.05)errors.push('La duración del plan no coincide con el final del último plano.');
 return errors;
}

if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const file=process.argv[2];if(!file){process.stderr.write('Uso: node validate-shot-plan.mjs plan.json\n');process.exit(2);}
 try{const plan=JSON.parse(fs.readFileSync(file,'utf8')),errors=validateShotPlan(plan);
  if(errors.length){process.stderr.write(errors.join('\n')+'\n');process.exit(1);}
  process.stdout.write(`Plan válido: ${plan.scenes.length} planos, ${plan.duration}s.\n`);
 }catch(e){process.stderr.write(e.message+'\n');process.exit(1);}
}
