#!/usr/bin/env node
// Apply a reviewed vision proposal without losing the original JSON.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {applyVisionRevisionPlan} from './visual-iteration.mjs';
import {validateProject,sanitizeCustomScene} from './compat/server-utils.mjs';

export function applyVerifiedVisionPlan(project,report,plan) {
  const scenes=project.project?.scenes??project.scenes;
  const patched=applyVisionRevisionPlan(project,report,plan,{
    validateCustomScene:(code,scene)=>{
      const index=scenes.findIndex(s=>s.id===scene.id);
      const result=sanitizeCustomScene(code,index+1);
      if(!result?.html)throw Error('No se permite una escena HTML vacía.');
      new vm.Script('(function(tl,S,T0,D,gsap){'+result.script+'\n})');
      const classes=new Set([...result.html.matchAll(/\bclass\s*=\s*["']([^"']+)["']/g)]
        .flatMap(m=>m[1].split(/\s+/)));
      for(const m of result.script.matchAll(/S\s*\+\s*["']\s+(\.[\w-]+)["']/g))
        if(!classes.has(m[1].slice(1)))throw Error('GSAP apunta a '+m[1]+' sin elemento HTML.');
      return result;
    },
  });
  const normalized=validateProject(patched.project.project??patched.project);
  if(normalized.scenes.length!==scenes.length)throw Error('La propuesta alteró el número de escenas.');
  return patched;
}

export async function applyVisionPlanFiles(input,defects,proposal,{out,manifest}={}) {
  if(!out||!manifest||new Set([input,defects,proposal,out,manifest].map(x=>path.resolve(x))).size!==5)
    throw Error('Especifica archivos diferentes para entrada, informe, plan y dos salidas.');
  const [project,report,plan]=await Promise.all([input,defects,proposal].map(async file=>
    JSON.parse(await fs.readFile(file,'utf8'))));
  const result=applyVerifiedVisionPlan(project,report,plan);
  await fs.writeFile(out,JSON.stringify(result.project,null,2)+'\n',{flag:'wx'});
  try{await fs.writeFile(manifest,JSON.stringify(result.manifest,null,2)+'\n',{flag:'wx'});}
  catch(error){await fs.unlink(out).catch(()=>{});throw error;}
  return result;
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const args=process.argv.slice(2),option=name=>args[args.indexOf(name)+1];
  if(args.length<7||!args.includes('--out')||!args.includes('--manifest')){
    console.error('Uso: node apply-vision-plan.mjs proyecto.json defects.json vision-plan.json --out corregido.json --manifest cambios.json');
    process.exitCode=1;
  } else {
    applyVisionPlanFiles(args[0],args[1],args[2],{out:option('--out'),manifest:option('--manifest')})
      .then(r=>console.log(JSON.stringify({applied:r.manifest.applied,approval:r.manifest.approval})))
      .catch(error=>{console.error(error.message);process.exitCode=1;});
  }
}
