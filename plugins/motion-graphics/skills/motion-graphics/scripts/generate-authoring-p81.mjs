#!/usr/bin/env node
// P8.1: generate strict brand files, quantitative build briefs and eight-part prompts.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createBrandKit,createMotionBrief,createMotionPrompt} from './compat/src/authoring-workflows-p81.mjs';
export function authorP81(kind,input){
 if(kind==='brand-intake')return createBrandKit(input.brand??input);
 if(kind==='motion-brief-writer')return createMotionBrief(input);
 if(kind==='motion-prompt-writer')return createMotionPrompt(input);
 throw Error('P8.1: flujo de autoría no admitido.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2),flag=key=>{const i=args.indexOf('--'+key);return i<0?undefined:args[i+1];};
  const input=flag('input');if(!input)throw Error('Uso: --kind brand-intake|motion-brief-writer|motion-prompt-writer --input entrada.json [--out DIR]');
  const result=authorP81(flag('kind')||'motion-brief-writer',JSON.parse(await fs.readFile(input,'utf8')));
  if(!result.ready){console.error('Faltan datos: '+result.questions.join(' | '));process.exitCode=2;}
  else if(flag('out')){
   const directory=path.resolve(flag('out'));await fs.mkdir(directory,{recursive:true});
   await fs.writeFile(path.join(directory,'authoring.json'),JSON.stringify(result,null,2)+'\n');
   for(const [filename,content]of Object.entries(result.files||{}))await fs.writeFile(path.join(directory,filename),content);
   if(result.buildPrompt)await fs.writeFile(path.join(directory,'motion-build-brief.md'),result.buildPrompt+'\n');
   if(result.prompt)await fs.writeFile(path.join(directory,'motion-brief.md'),result.prompt+'\n');
   console.log('P8.1: '+directory);
  }else process.stdout.write(JSON.stringify(result,null,2)+'\n');
 }catch(error){console.error(error.message);process.exitCode=1;}
}
