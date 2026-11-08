// Generic scene mechanics planning contract. No topic-specific templates.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const label=v=>typeof v==='string'&&v.trim().length>0;
const kinds=new Set(['translate','rotate','deform','flow','contact','hinge','walk','light','draw','morph','hold']);

export function validateMechanics(plan){
  const errors=[],warnings=[];
  if(!Array.isArray(plan?.actions)||!plan.actions.length)return {ok:false,errors:['Faltan acciones mecánicas'],warnings};
  const names=new Set();
  for(const [i,a] of plan.actions.entries()){
    const name=`Acción ${i+1}`;
    if(!label(a.id)||names.has(a.id))errors.push(`${name}: id ausente o repetido`);
    names.add(a.id);
    if(!kinds.has(a.kind))errors.push(`${name}: tipo de movimiento no admitido`);
    if(!label(a.actor)||!label(a.cause)||!label(a.visibleResult))
      errors.push(`${name}: actor, causa y resultado visible obligatorios`);
    if(!Number.isFinite(a.start)||!Number.isFinite(a.end)||a.end<=a.start||a.start<0)
      errors.push(`${name}: intervalo temporal inválido`);
    if(['contact','hinge','walk','flow'].includes(a.kind)){
      if(!label(a.anchor))errors.push(`${name}: falta ancla geométrica`);
      if(!label(a.support))errors.push(`${name}: falta soporte o límite físico`);
    }
    if(!label(a.startState)||!label(a.endState))
      errors.push(`${name}: falta estado geométrico inicial o final`);
    if(['contact','hinge','walk'].includes(a.kind)&&!label(a.contactAt))
      warnings.push(`${name}: especificar evento de contacto y cómo se mantiene`);
    if(a.kind==='translate' && /contrae|deforma|abre|cierra|dobla|golpea/i.test(a.visibleResult||''))
      warnings.push(`${name}: traslación posiblemente insuficiente para el resultado descrito`);
    if(a.kind==='hold'&&a.startState!==a.endState)
      errors.push(`${name}: hold no debe cambiar el estado del objeto`);
  }
  return {ok:errors.length===0,errors,warnings};
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  try{const f=process.argv[2];if(!f)throw new Error('Uso: node validate-mechanics.mjs mechanics.json');
    const r=validateMechanics(JSON.parse(fs.readFileSync(f,'utf8')));console.log(JSON.stringify(r,null,2));process.exitCode=r.ok?0:1;
  }catch(e){console.error(e.message);process.exitCode=1;}
}
