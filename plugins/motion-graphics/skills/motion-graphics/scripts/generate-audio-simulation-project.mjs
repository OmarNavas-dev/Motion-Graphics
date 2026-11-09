#!/usr/bin/env node
// P6: editable synchronized audio and deterministic 2D simulation JSON.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createAudioSimulationProject} from './compat/src/audio-simulation-p6.mjs';
import {validateProject} from './compat/server-utils.mjs';

export function generateAudioSimulationWorkflow(options={}){
 return validateProject(createAudioSimulationProject(options));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2),flag=(name,fallback)=>{const at=args.indexOf('--'+name);return at<0?fallback:args[at+1];};
  const project=generateAudioSimulationWorkflow({kind:flag('kind','all'),format:flag('format','horizontal'),seconds:Number(flag('seconds','4'))});
  const output=flag('output',''),json=JSON.stringify(project,null,2)+'\n';
  if(output){fs.writeFileSync(output,json);console.log('P6: '+project.scenes.length+' simulaciones y '+project.soundDesign.cues.length+' cues · '+output);}
  else process.stdout.write(json);
 }catch(error){console.error(error.message);process.exitCode=1;}
}
