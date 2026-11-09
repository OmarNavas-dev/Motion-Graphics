#!/usr/bin/env node
// P2 render gate: real ProRes4444 pixel alpha, MP4 compositing, original audio.
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateProject} from '../server-utils.mjs';
import {inspectAlphaMov,compositeBrollAlpha} from '../src/broll-export.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const work=await fs.mkdtemp(path.join(os.tmpdir(),'motion-broll-p2-'));
const run=(binary,args,maxBuffer=4*1024*1024)=>{
  const result=spawnSync(binary,args,{cwd:root,encoding:null,windowsHide:true,maxBuffer,timeout:300000});
  if(result.error||result.status!==0)throw Error(`${binary} error ${result.status}: ${result.stderr?.toString().slice(-1300)||result.error}`);
  return result.stdout;
};
try{
  const project=validateProject({name:'P2 render alpha',format:'horizontal',palette:'aurora',fps:24,
    scenes:[{id:'alpha-scene',duration:1.2,layout:'hero',title:'Prueba',subtitle:'',imageAsset:'',cues:[]}],
    wordTimings:[{text:'alfa',start:0.15,end:0.35}],
    broll:[{id:'panel-alfa',sceneId:'alpha-scene',duration:0.8,kind:'overlay',motion:'static',
      narration:{wordIndex:0,edge:'start',offset:0,phrase:'alfa'},objects:[
        {id:'rectangulo',type:'shape',shape:'rect',x:20,y:30,width:30,height:30,color:'#FF0000'},
      ]}]});
  const props=path.join(work,'props.json'),mov=path.join(work,'broll-alpha.mov'),mp4=path.join(work,'composite.mp4');
  await fs.writeFile(props,JSON.stringify({project}));
  run(process.execPath,[path.join(root,'node_modules/@remotion/cli/remotion-cli.js'),
    'render','TransparentBroll',mov,`--props=${props}`,`--public-dir=${path.join(root,'public')}`,
    '--codec=prores','--prores-profile=4444','--pixel-format=yuva444p10le',
    '--image-format=png','--concurrency=1','--hardware-acceleration=disable'],8*1024*1024);
  const report=await inspectAlphaMov(mov);
  assert.equal(report.alphaDecoded,true);
  const raw=run('ffmpeg',['-v','error','-ss','0.5','-i',mov,'-frames:v','1',
    '-vf','format=rgba','-pix_fmt','rgba','-f','rawvideo','pipe:1'],18*1024*1024);
  const alpha=(x,y)=>raw[(y*1280+x)*4+3];
  assert.equal(alpha(3,3),0,'La esquina debe quedar totalmente transparente.');
  assert.ok(alpha(360,300)>200,'El objeto debe tener alfa sólido en medio del plano.');
  const outside=run('ffmpeg',['-v','error','-ss','0.03','-i',mov,'-frames:v','1',
    '-vf','format=rgba','-pix_fmt','rgba','-f','rawvideo','pipe:1'],18*1024*1024);
  assert.equal(outside[(300*1280+360)*4+3],0,'No debe haber imagen fuera del clip.');
  run('ffmpeg',['-v','error','-y','-f','lavfi','-i','color=c=0x123456:s=1280x720:r=24:d=1.2',
    '-f','lavfi','-i','sine=frequency=440:duration=1.2','-c:v','libx264','-pix_fmt','yuv420p',
    '-c:a','aac','-shortest',mp4]);
  await compositeBrollAlpha(mp4,mov);
  const streams=JSON.parse(run('ffprobe',['-v','error','-show_entries',
    'stream=codec_type,codec_name','-of','json',mp4]).toString('utf8')).streams;
  assert.ok(streams.some(s=>s.codec_type==='video'&&s.codec_name==='h264'));
  assert.ok(streams.some(s=>s.codec_type==='audio'),'La pista original debe sobrevivir la composición.');
  const final=run('ffmpeg',['-v','error','-ss','0.5','-i',mp4,'-frames:v','1',
    '-vf','format=rgb24','-pix_fmt','rgb24','-f','rawvideo','pipe:1'],8*1024*1024);
  const pixel=(x,y)=>[...final.subarray((y*1280+x)*3,(y*1280+x)*3+3)];
  assert.ok(pixel(360,300)[0]>180,'El objeto rojo debe estar integrado en el MP4.');
  assert.ok(pixel(3,3)[0]<80,'Fuera del objeto se debe ver el fondo original.');
  console.log(JSON.stringify({passed:true,alpha:report,finalVideo:'H264+audio',
    pixelTests:['outside transparent','inside opaque','clip timed','MP4 composed']},null,2));
}finally{await fs.rm(work,{recursive:true,force:true});}
