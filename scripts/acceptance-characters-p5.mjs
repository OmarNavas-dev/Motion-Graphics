#!/usr/bin/env node
// P5 real acceptance: five MP4s, temporal evidence, and joint/foot contact audits.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {generateCharacterWorkflow} from '../plugins/motion-graphics/skills/motion-graphics/scripts/generate-character-project.mjs';
import {CHARACTER_ACTIONS,inspectCharacterMotion} from '../src/character-motion.mjs';
import {renderAuthored} from '../src/authored-renderer.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'out','p5-characters');
await fs.mkdir(out,{recursive:true});
const run=(program,args,seconds=1100)=>{
 const result=spawnSync(program,args,{cwd:root,windowsHide:true,encoding:null,
   maxBuffer:25*1024*1024,timeout:seconds*1000});
 if(result.error||result.status!==0)throw Error(`P5: ${program} (${result.status}): ${String(result.stderr||result.error).slice(-1500)}`);
 return result.stdout;
};
const project=generateCharacterWorkflow({action:'all',demo:true});
if(project.scenes.length!==5)throw Error('P5: falta una acción del catálogo.');
const props=path.join(out,'characters.props.json');
await fs.writeFile(props,JSON.stringify({project},null,2));
const video=path.join(out,'characters-all.mp4');
run(process.execPath,[path.join(root,'node_modules/@remotion/cli/remotion-cli.js'),'render','StudioVideo',video,
 `--props=${props}`,`--public-dir=${path.join(root,'public')}`,'--codec=h264','--concurrency=1',
 '--hardware-acceleration=disable'],1500);
const smallFrame=(time)=>run('ffmpeg',['-v','error','-ss',time.toFixed(4),'-i',video,
 '-frames:v','1','-vf','scale=80:45,format=rgb24','-pix_fmt','rgb24','-f','rawvideo','pipe:1'],40);
const diff=(a,b)=>{
 if(a.length!==b.length||a.length!==80*45*3)throw Error('P5: fotogramas incompletos.');
 let sum=0;for(let i=0;i<a.length;i++)sum+=Math.abs(a[i]-b[i]);
 return Math.round(sum/a.length*100)/100;
};
const checks=[];let startFrame=0;const fps=project.fps||24;
for(let index=0;index<project.scenes.length;index++){
 const scene=project.scenes[index],action=CHARACTER_ACTIONS[index];
 const frames=Math.round(scene.duration*fps),start=startFrame/fps;
 const clip=path.join(out,`${index+1}-${action}.mp4`);
 run('ffmpeg',['-v','error','-y','-ss',String(start),'-i',video,'-t',String(frames/fps),
   '-map','0:v:0','-c:v','libx264','-pix_fmt','yuv420p','-crf','22','-preset','veryfast',clip],100);
 const streams=JSON.parse(run('ffprobe',['-v','error','-show_entries',
   'stream=codec_name,width,height,nb_frames','-select_streams','v:0','-of','json',clip]).toString('utf8')).streams;
 const meta=streams[0];
 if(meta.codec_name!=='h264'||meta.width!==1280||meta.height!==720||
   Math.abs(Number(meta.nb_frames)-frames)>2)throw Error('P5: exportación inválida: '+action);
 const actor=scene.authored.layers.find(l=>l.type==='character').actor;
 const contact=inspectCharacterMotion(actor,{duration:scene.duration,width:1280,fps});
 if(!contact.passed)throw Error('P5: fallo físico '+action+': '+JSON.stringify(contact.findings.slice(0,3)));
 const html=renderAuthored(scene.authored,{time:scene.duration*.53,duration:scene.duration,
   width:1280,height:720,showText:true});
 if(!html.includes('data-dvj-foot="left"')||!html.includes('data-dvj-joint="right-knee"'))
   throw Error('P5: etiquetas del rig ausentes en '+action);
 const movement=diff(smallFrame(start+.28),smallFrame(start+Math.min(scene.duration-.18,scene.duration*.81)));
 const hash=createHash('sha256').update(smallFrame(start+scene.duration*.53)).digest('hex');
 checks.push({action,clip:path.basename(clip),frames:Number(meta.nb_frames),movement,
   visualHash:hash,contact});
 startFrame+=frames;
}
if(new Set(checks.map(x=>x.visualHash)).size!==5)throw Error('P5: dos acciones tienen la misma imagen.');
if(checks.some(x=>x.movement<.08))throw Error('P5: movimiento insuficiente en '+checks.filter(x=>x.movement<.08).map(x=>x.action));
const midframes=[];let offset=0;
for(const s of project.scenes){const frames=Math.round(s.duration*fps);midframes.push(offset+Math.floor(frames/2));offset+=frames;}
const sheet=path.join(out,'contact-sheet-p5.png');
run('ffmpeg',['-v','error','-y','-i',video,'-vf',
 `select=${midframes.map(n=>`eq(n\\,${n})`).join('+')},scale=320:180,tile=5x1`,
 '-frames:v','1',sheet],110);
if((await fs.stat(sheet)).size<7000)throw Error('P5: hoja de contacto vacía.');
const report={passed:true,actions:5,renderedMp4:5,uniqueFrames:5,
 contactsMeasured:checks.filter(x=>x.contact.measured).length,plantedPairs:checks.reduce((n,x)=>n+x.contact.plantedPairs,0),
 minMovement:Math.min(...checks.map(x=>x.movement)),contactSheet:path.basename(sheet),checks,
 limits:'Cinemática de rig SVG 2D; no biomecánica natural certificada ni modelo físico de telas/oclusión.'};
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:true,actions:5,mp4:5,plantedPairs:report.plantedPairs,
 minMovement:report.minMovement,sheet:path.basename(sheet)},null,2));
