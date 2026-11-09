#!/usr/bin/env node
// P3: one real Remotion render, 21 individually playable examples, contact sheet,
// pixel-level differentiation / motion checks and a machine-readable audit.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {generateStyleProject} from '../plugins/motion-graphics/skills/motion-graphics/scripts/generate-style-project.mjs';
import {renderAuthored} from '../src/authored-renderer.mjs';
import {STYLE_RECIPE_IDS} from '../src/style-recipes.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=path.join(root,'out','p3-style-gallery');
await fs.mkdir(directory,{recursive:true});
const render=(program,args,seconds=900)=>{
 const result=spawnSync(program,args,{cwd:root,windowsHide:true,encoding:null,
   maxBuffer:16*1024*1024,timeout:seconds*1000});
 if(result.error||result.status!==0)throw Error(`${program} (${result.status}): ${String(result.stderr||result.error).slice(-1600)}`);
 return result.stdout;
};
const duration=1.5,fps=24,framesPerScene=36;
const project=generateStyleProject({style:'all',duration});
if(project.scenes.length!==21)throw Error('P3: faltan estilos en la galería.');
const props=path.join(directory,'props.json');
const montage=path.join(directory,'21-styles-montage.mp4');
await fs.writeFile(props,JSON.stringify({project},null,2));
for(const [index,scene] of project.scenes.entries()){
 if(scene.stylePreset!==STYLE_RECIPE_IDS[index]||!scene.authored?.source?.endsWith(scene.stylePreset))
  throw Error('P3: estilo desincronizado '+index);
 const html=renderAuthored(scene.authored,{time:.75,duration,width:1280,height:720,showText:true});
 if(!html.includes('ms-authored-stage')||html.length<1000)throw Error('P3: composición sin arte '+scene.stylePreset);
}
render(process.execPath,[path.join(root,'node_modules/@remotion/cli/remotion-cli.js'),
 'render','StudioVideo',montage,`--props=${props}`,`--public-dir=${path.join(root,'public')}`,
 '--codec=h264','--concurrency=1','--hardware-acceleration=disable'],1500);
const readFrame=(seconds)=>render('ffmpeg',['-v','error','-ss',seconds.toFixed(3),'-i',montage,
 '-frames:v','1','-vf','scale=80:45,format=rgb24','-pix_fmt','rgb24','-f','rawvideo','pipe:1'],35);
const checks=[];
for(const [index,id] of STYLE_RECIPE_IDS.entries()){
 const start=index*duration;
 const example=path.join(directory,String(index+1).padStart(2,'0')+'-'+id+'.mp4');
 render('ffmpeg',['-v','error','-y','-ss',start.toFixed(3),'-i',montage,'-t',duration.toFixed(3),
   '-map','0:v:0','-c:v','libx264','-crf','22','-preset','veryfast','-pix_fmt','yuv420p','-an',example],60);
 const probe=JSON.parse(render('ffprobe',['-v','error','-select_streams','v:0',
   '-show_entries','stream=codec_name,width,height,nb_frames,duration','-of','json',example]).toString('utf8')).streams?.[0];
 if(probe?.codec_name!=='h264'||probe.width!==1280||probe.height!==720||
   Number(probe.nb_frames)<framesPerScene-1)throw Error('P3: exportación inválida de '+id);
 const first=readFrame(start+.28),last=readFrame(start+1.2);
 if(first.length!==last.length||first.length!==80*45*3)throw Error('P3: fotogramas incompletos '+id);
 let total=0;for(let pixel=0;pixel<first.length;pixel++)total+=Math.abs(first[pixel]-last[pixel]);
 const movement=Math.round(total/first.length*100)/100;
 const visualHash=createHash('sha256').update(readFrame(start+.75)).digest('hex');
 checks.push({id,file:path.basename(example),duration:1.5,frames:Number(probe.nb_frames),
   visualHash,movement,signature:project.scenes[index].authored.styleRules.signature,
   layers:project.scenes[index].authored.layers.length});
}
if(new Set(checks.map(c=>c.visualHash)).size!==21)throw Error('P3: dos estilos dan el mismo fotograma.');
if(checks.some(c=>c.movement<.15))throw Error('P3: estilo sin movimiento perceptible: '+checks.filter(c=>c.movement<.15).map(c=>c.id));
const sheet=path.join(directory,'contact-sheet-21.png');
render('ffmpeg',['-v','error','-y','-i',montage,
  '-vf',`select=eq(mod(n\\,${framesPerScene})\\,18),scale=320:180,tile=7x3`,
  '-frames:v','1',sheet],80);
if((await fs.stat(sheet)).size<10000)throw Error('P3: hoja de contactos vacía.');
const report={passed:true,styles:21,renderedMp4:checks.length,uniqueFrames:21,
  motionChecks:checks.filter(c=>c.movement>=.15).length,contactSheet:path.basename(sheet),
  notes:'Prueba técnica de 21 recetas; no demuestra igualdad estética 1:1 con los videos externos.',checks};
await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:true,renderedMp4:21,uniqueFrames:21,motionChecks:report.motionChecks,
  minMovement:Math.min(...checks.map(c=>c.movement)),contactSheet:sheet},null,2));
