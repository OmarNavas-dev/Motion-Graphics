#!/usr/bin/env node
// P4: one guided workflow JSON, or a 12-flow illustrative acceptance gallery.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateSpecializedProject,SPECIALIZED_FLOW_IDS} from './compat/src/specialized-workflows.mjs';
import {validateProject} from './compat/server-utils.mjs';

export function generateWorkflowProject({workflow='all',data={},demo=false,format='horizontal',
  duration,compact=false,brandProfile}={}){
  if(workflow!=='all')return validateProject(generateSpecializedProject({workflow,data,demo,
    format,duration,compact,brandProfile}));
  if(!demo)throw Error('P4: la galería completa solo admite --demo; cada producción necesita sus datos.');
  const scenes=SPECIALIZED_FLOW_IDS.flatMap(id=>generateSpecializedProject({workflow:id,data:{},
    demo:true,format,compact:true,duration:duration||2,brandProfile}).scenes);
  const soundDesign={enabled:true,cues:SPECIALIZED_FLOW_IDS.flatMap((id,index)=>{
    const p=generateSpecializedProject({workflow:id,demo:true,format,compact:true,duration:duration||2});
    return p.soundDesign.cues.map(c=>({...c,at:Math.round((c.at+index*(duration||2))*1000)/1000}));
  })};
  return validateProject({name:'P4 · Galería de 12 flujos',format,resolution:'720p',fps:24,
    style:'modern',palette:'aurora',showText:true,brandProfile,soundDesign,scenes});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const args=process.argv.slice(2),flag=(name,fallback)=>{
      const index=args.indexOf('--'+name);return index<0?fallback:args[index+1];};
    const file=flag('data','');
    const data=file?JSON.parse(fs.readFileSync(file,'utf8')):{};
    const workflow=flag('workflow','all');
    const demo=args.includes('--demo');
    const project=generateWorkflowProject({workflow,data,demo,
      format:flag('format','horizontal'),duration:flag('duration',undefined)===undefined?undefined:
        Number(flag('duration',undefined)),compact:args.includes('--compact')});
    const output=flag('output','');
    const json=JSON.stringify(project,null,2)+'\n';
    if(output){fs.writeFileSync(output,json);console.log('P4: '+project.scenes.length+' escenas · '+workflow+' · '+output);}
    else process.stdout.write(json);
  }catch(error){console.error(error.message);process.exitCode=1;}
}
