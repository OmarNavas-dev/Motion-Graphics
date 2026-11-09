#!/usr/bin/env node
// P5: create one editable character sequence or a five-action acceptance gallery.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CHARACTER_ACTIONS,createCharacterProject,inspectCharacterMotion} from './compat/src/character-motion.mjs';
import {validateProject} from './compat/server-utils.mjs';

export function generateCharacterWorkflow({action='all',format='horizontal',rig,demo=false}={}){
 const project=validateProject(createCharacterProject({action,format,rig,demo}));
 for(const scene of project.scenes){
  const actor=scene.authored.layers.find(l=>l.type==='character')?.actor;
  if(!actor)throw Error('P5: escena sin rig ejecutable.');
  const report=inspectCharacterMotion(actor,{duration:scene.duration,width:1280});
  if(!report.passed)throw Error('P5: contacto inválido en '+scene.id);
 }
 return project;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2),flag=(key,fallback)=>{
    const index=args.indexOf('--'+key);return index<0?fallback:args[index+1];};
  const action=flag('action','all'),filename=flag('rig','');
  if(action!=='all'&&action!=='custom'&&!CHARACTER_ACTIONS.includes(action))
    throw Error('Acciones admitidas: all, custom, '+CHARACTER_ACTIONS.join(', '));
  const rig=filename?JSON.parse(fs.readFileSync(filename,'utf8')):undefined;
  const project=generateCharacterWorkflow({action,format:flag('format','horizontal'),rig,
    demo:args.includes('--demo')});
  const output=flag('output',''),json=JSON.stringify(project,null,2)+'\n';
  if(output){fs.writeFileSync(output,json);console.log('P5: '+project.scenes.length+' escenas con articulaciones y contacto · '+output);}
  else process.stdout.write(json);
 }catch(error){console.error(error.message);process.exitCode=1;}
}
