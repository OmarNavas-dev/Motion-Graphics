#!/usr/bin/env node
// Consumes the exact defect report emitted by Motion Studio. Never invents image observations.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {applySafeVisualCorrections} from './visual-iteration.mjs';

export async function repairFromReport(projectFile,defectsFile,{out,manifestFile}={}) {
  if(!out || !manifestFile)throw Error('Se requieren --out y --manifest con archivos nuevos.');
  const [project,report]=await Promise.all([projectFile,defectsFile].map(async file=>
    JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''))));
  const result=applySafeVisualCorrections(project,report);
  if(!result.manifest.applied.length)throw Error(
    'El informe no tiene correcciones seguras automáticas. Edita las escenas según los defectos; no se generó JSON idéntico.');
  await fs.mkdir(path.dirname(out),{recursive:true});
  await fs.mkdir(path.dirname(manifestFile),{recursive:true});
  // Do not overwrite prior projects or reports, even if an output was mistyped.
  const written=[];
  try {
    await fs.writeFile(out,JSON.stringify(result.project,null,2)+'\n',{flag:'wx'});written.push(out);
    await fs.writeFile(manifestFile,JSON.stringify(result.manifest,null,2)+'\n',{flag:'wx'});written.push(manifestFile);
  } catch(error) {
    for(const file of written)await fs.unlink(file).catch(()=>{});
    throw error;
  }
  return result.manifest;
}

if(process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const args=process.argv.slice(2),option=flag=>{const i=args.indexOf(flag);return i<0?null:args[i+1];};
  try {
    if(!args[0] || !args[1])throw Error('Uso: node repair-from-report.mjs proyecto.json defects.json --out corregido.json --manifest cambios.json');
    const result=await repairFromReport(args[0],args[1],{out:option('--out'),manifestFile:option('--manifest')});
    console.log(JSON.stringify({applied:result.applied.length,unresolved:result.unresolved.length,approval:result.approval}));
  } catch(error){console.error(error.message);process.exitCode=1;}
}
