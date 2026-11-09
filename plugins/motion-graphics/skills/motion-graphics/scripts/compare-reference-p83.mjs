#!/usr/bin/env node
// P8.3: compare user-supplied, licensed reference and actual rendered MP4.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compareReferenceVideos} from './compat/src/reference-alignment-p83.mjs';
import {assessReferenceRevision} from './compat/src/reference-revision-gate-p8.mjs';

export async function compareP83({project,reference,rendered,framesPerScene=3}){
 return compareReferenceVideos(project?.project??project,reference,rendered,{framesPerScene});
}
export async function compareBeforeAfterP8({project,reference,before,after}){
 const [oldResult,newResult]=await Promise.all([
  compareP83({project,reference,rendered:before}),compareP83({project,reference,rendered:after}),
 ]);
 return {comparison:assessReferenceRevision(oldResult,newResult),before:oldResult,after:newResult};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2),get=key=>{const i=args.indexOf('--'+key);return i<0?null:args[i+1];};
  if(!get('project')||!get('reference')||!(get('rendered')||get('after')))
   throw Error('Uso: --project proyecto.json --reference ejemplo.mp4 --rendered salida.mp4 [--before antiguo.mp4 --after nuevo.mp4] [--out informe.json]');
  const project=JSON.parse(await fs.readFile(get('project'),'utf8'));
  const report=get('before')?await compareBeforeAfterP8({project,reference:get('reference'),before:get('before'),after:get('after')||get('rendered')}):
   await compareP83({project,reference:get('reference'),rendered:get('rendered')||get('after')});
  if(get('out'))await fs.writeFile(get('out'),JSON.stringify(report,null,2)+'\n');
  else process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(get('before')&&!report.comparison.passed)process.exitCode=2;
 }catch(error){console.error(error.message);process.exitCode=1;}
}
