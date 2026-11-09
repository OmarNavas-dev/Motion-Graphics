#!/usr/bin/env node
// P4 video acceptance: 12 real MP4s with Foley, GIF seam, and 3-source showdown.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {generateWorkflowProject} from '../plugins/motion-graphics/skills/motion-graphics/scripts/generate-specialized-project.mjs';
import {SPECIALIZED_FLOW_IDS} from '../src/specialized-workflows.mjs';
import {renderSoundWav,muxSoundtrack} from '../src/sound-design.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=path.join(root,'out','p4-specialized');
await fs.mkdir(directory,{recursive:true});
const run=(program,args,seconds=1100)=>{
 const result=spawnSync(program,args,{cwd:root,windowsHide:true,encoding:null,
   maxBuffer:20*1024*1024,timeout:seconds*1000});
 if(result.error||result.status!==0)throw Error(`${program} (${result.status}): ${String(result.stderr||result.error).slice(-1800)}`);
 return result.stdout;
};
const cli=path.join(root,'node_modules/@remotion/cli/remotion-cli.js');
const render=(project,out)=>{
 const props=path.join(directory,path.basename(out)+'.props.json');
 return fs.writeFile(props,JSON.stringify({project},null,2)).then(()=>{
   run(process.execPath,[cli,'render','StudioVideo',out,`--props=${props}`,
     `--public-dir=${path.join(root,'public')}`,'--codec=h264','--concurrency=1',
     '--hardware-acceleration=disable'],1500);
 });
};
const probe=file=>JSON.parse(run('ffprobe',['-v','error','-show_entries',
 'stream=codec_type,codec_name,width,height,nb_frames','-of','json',file]).toString('utf8')).streams;
const smallFrame=(file,time)=>run('ffmpeg',['-v','error','-ss',time.toFixed(3),'-i',file,
 '-frames:v','1','-vf','scale=80:45,format=rgb24','-pix_fmt','rgb24','-f','rawvideo','pipe:1'],35);
const difference=(a,b)=>{if(a.length!==b.length||a.length!==80*45*3)throw Error('P4: fotogramas incompletos.');
 let d=0;for(let i=0;i<a.length;i++)d+=Math.abs(a[i]-b[i]);return Math.round(d/a.length*100)/100;};

const project=generateWorkflowProject({workflow:'all',demo:true,duration:2});
if(project.scenes.length!==12)throw Error('P4: inventario de 12 flujos incompleto.');
const silent=path.join(directory,'12-workflows-silent.mp4');
await render(project,silent);
const wav=path.join(directory,'foley-p4.wav');
const sound=await renderSoundWav(project.soundDesign,wav,{seconds:24});
if(sound.cues!==24)throw Error('P4: diseño sonoro incompleto.');
const montage=path.join(directory,'12-workflows-montage.mp4');
await muxSoundtrack(silent,wav,montage,{hasExistingAudio:false});
const checks=[];
for(const [index,id] of SPECIALIZED_FLOW_IDS.entries()){
 const start=index*2;
 const clip=path.join(directory,String(index+1).padStart(2,'0')+'-'+id+'.mp4');
 run('ffmpeg',['-v','error','-y','-ss',String(start),'-i',montage,'-t','2',
   '-map','0:v:0','-map','0:a:0','-c:v','libx264','-crf','22','-preset','veryfast',
   '-pix_fmt','yuv420p','-c:a','aac','-b:a','128k',clip],70);
 const streams=probe(clip),video=streams.find(s=>s.codec_type==='video'),audio=streams.find(s=>s.codec_type==='audio');
 if(video?.codec_name!=='h264'||video.width!==1280||video.height!==720||
   Number(video.nb_frames)<47||audio?.codec_name!=='aac')throw Error('P4: exportación audiovisual inválida '+id);
 const movement=difference(smallFrame(montage,start+.2),smallFrame(montage,start+1.55));
 const hash=createHash('sha256').update(smallFrame(montage,start+.9)).digest('hex');
 checks.push({id,file:path.basename(clip),frames:Number(video.nb_frames),movement,
   visualHash:hash,sound:true,layers:project.scenes[index].authored.layers.length});
}
if(new Set(checks.map(c=>c.visualHash)).size!==12)throw Error('P4: dos flujos producen el mismo fotograma.');
if(checks.some(c=>c.movement<.04))throw Error('P4: flujo sin movimiento '+checks.filter(c=>c.movement<.04).map(c=>c.id));
const sheet=path.join(directory,'contact-sheet-p4.png');
run('ffmpeg',['-v','error','-y','-i',montage,
 '-vf','select=eq(mod(n\\,48)\\,24),scale=320:180,tile=4x3','-frames:v','1',sheet]);
if((await fs.stat(sheet)).size<8000)throw Error('P4: hoja de contactos vacía.');

// Cover: a real 9-second MP4 and a 20fps GIF with a measured seam.
const cover=generateWorkflowProject({workflow:'loop-cover',demo:true,duration:9});
const coverMp4=path.join(directory,'loop-cover-9s.mp4');
await render(cover,coverMp4);
const loopSeam=difference(smallFrame(coverMp4,0.025),smallFrame(coverMp4,8.975));
if(loopSeam>1.2)throw Error('P4: la portada GIF no cierra su bucle: '+loopSeam);
const gif=path.join(directory,'loop-cover-180-frames.gif');
run('ffmpeg',['-v','error','-y','-i',coverMp4,
 '-filter_complex','[0:v]fps=20,scale=448:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=none[v]',
 '-map','[v]','-loop','0',gif],120);
const gifInfo=JSON.parse(run('ffprobe',['-v','error','-count_frames','-select_streams','v:0',
 '-show_entries','stream=nb_read_frames,width,height','-of','json',gif]).toString('utf8')).streams?.[0];
if(Number(gifInfo.nb_read_frames)!==180)throw Error('P4: GIF no contiene 180 frames.');

// Real 3-source compositing, not fictional panels. Three local synthetic fixtures,
// rendered by the same StudioVideo pipeline as user-supplied model outputs.
const ids=['a','b','c'].map((s,i)=>String(i+1).repeat(8)+'-'+String(i+1).repeat(4)+'-4'+String(i+1).repeat(3)+
 '-8'+String(i+1).repeat(3)+'-'+String(i+1).repeat(12));
const media=ids.map(s=>'user-assets/'+s+'.mp4');
const fixtures=media.map(s=>path.join(root,'public',s));
await fs.mkdir(path.join(root,'public','user-assets'),{recursive:true});
let mediaCheck=false;
try{
 for(let i=0;i<3;i++)run('ffmpeg',['-v','error','-y','-f','lavfi','-i',
   'color=c='+['red','green','blue'][i]+':s=640x360:r=24:d=2','-c:v','libx264',
   '-pix_fmt','yuv420p',fixtures[i]],30);
 const real=generateWorkflowProject({workflow:'model-showdown',demo:false,compact:true,
   duration:2,data:{models:['Fuente A','Fuente B','Fuente C'],brief:'Mismo prompt',videos:media}});
 const realMp4=path.join(directory,'model-showdown-three-real-sources.mp4');
 await render(real,realMp4);
 const decoded=run('ffmpeg',['-v','error','-ss','1','-i',realMp4,'-frames:v','1',
   '-pix_fmt','rgb24','-f','rawvideo','pipe:1'],35);
 const pixel=(x,y)=>{const at=(y*1280+x)*3;return [...decoded.subarray(at,at+3)];};
 const three=[pixel(215,405),pixel(640,405),pixel(1065,405)];
 mediaCheck=three[0][0]>three[0][2]+50&&three[1][1]>three[1][0]+20&&three[2][2]>three[2][0]+50;
 if(!mediaCheck)throw Error('P4: composición de tres MP4 reales falló: '+JSON.stringify(three));
}finally{for(const file of fixtures)await fs.unlink(file).catch(()=>{});}

const report={passed:true,workflows:checks.length,renderedMp4:checks.length,
 audioTracks:checks.filter(x=>x.sound).length,uniqueFrames:12,motionChecks:checks.filter(x=>x.movement>=.04).length,
 gif:{file:path.basename(gif),frames:180,seamDifference:loopSeam},
 comparison:{realVideos:3,passed:mediaCheck},contactSheet:path.basename(sheet),checks,
 scope:'12 flujos reproducibles con datos DEMO; no homologación artística 1:1 ni generación de metraje externo.'};
await fs.writeFile(path.join(directory,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:true,workflows:12,mp4:12,mp4WithAudio:12,gifFrames:180,
 gifSeam:loopSeam,realShowdown:mediaCheck,minMovement:Math.min(...checks.map(c=>c.movement))},null,2));
