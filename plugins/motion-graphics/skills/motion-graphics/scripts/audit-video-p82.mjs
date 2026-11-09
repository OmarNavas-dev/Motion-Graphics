#!/usr/bin/env node
// P8.2: use the exact same objective FFmpeg loop and pacing audits as Motion Studio.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditLoopSeam} from './compat/src/loop-quality-audit.mjs';
import {auditRenderedPacing} from './compat/src/pacing-quality-audit.mjs';

export async function auditVideoP82(video,{fps=10}={}){
 if(typeof video!=='string'||!video.trim())throw Error('Indica un archivo de video real para auditar.');
 const [loop,pacing]=await Promise.all([auditLoopSeam(video),auditRenderedPacing(video,{fps})]);
 return {video,loop,pacing,passedTechnical:loop.cycle.passed&&pacing.flashWindows.length===0,
  artisticApproval:false,warning:'La aprobación artística requiere revisar fotogramas, narrativa y referencias con una persona.'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const video=process.argv[2];const report=await auditVideoP82(video);
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.passedTechnical?0:2;
 }catch(error){console.error(error.message);process.exitCode=1;}
}
