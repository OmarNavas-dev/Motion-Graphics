#!/usr/bin/env node
// Motion Graphics P3 authoring: produces one importable JSON with executable style layers.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStyleComposition,STYLE_RECIPE_IDS,getExecutableStyle} from './compat/src/style-recipes.mjs';
import {validateProject} from './compat/server-utils.mjs';

export function generateStyleProject({style='all',title='',duration=2,format='horizontal',brandProfile}={}){
  if(style!=='all'&&!STYLE_RECIPE_IDS.includes(style))throw Error('P3: estilo desconocido.');
  if(!Number.isFinite(duration)||duration<.5||duration>10)throw Error('P3: ejemplos de 0.5 a 10 s por estilo.');
  if(!['horizontal','vertical'].includes(format))throw Error('P3: formato no válido.');
  const styles=style==='all'?STYLE_RECIPE_IDS:[style];
  const scenes=styles.map((id,index)=>({id:'p3-'+String(index+1).padStart(2,'0')+'-'+id,
    layout:'hero',duration,title:title||getExecutableStyle(id).name,subtitle:'',imageAsset:'',
    cues:[],stylePreset:id,approved:false,captionMode:'none',
    authored:createStyleComposition(id,{title:title||getExecutableStyle(id).name,duration,format,brandProfile})}));
  return validateProject({name:style==='all'?'Galería P3 · 21 estilos':getExecutableStyle(style).name,
    format,resolution:'720p',fps:24,palette:'aurora',style:'modern',showText:true,
    visualEngine:'adaptive',brandProfile,scenes});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const args=process.argv.slice(2);
    const flag=(name,defaultValue)=>{const i=args.indexOf('--'+name);return i<0?defaultValue:args[i+1];};
    const project=generateStyleProject({style:flag('style','all'),title:flag('title',''),
      format:flag('format','horizontal'),duration:Number(flag('duration','2'))});
    const output=flag('output','');
    const json=JSON.stringify(project,null,2)+'\n';
    if(output){fs.writeFileSync(output,json);console.log('P3: '+project.scenes.length+' estilos generados en '+output);}
    else process.stdout.write(json);
  }catch(error){console.error(error.message);process.exitCode=1;}
}
