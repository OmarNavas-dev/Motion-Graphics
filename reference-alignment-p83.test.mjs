import test from 'node:test';
import assert from 'node:assert/strict';
import {compareReferenceFrames,planReferenceReview} from './src/reference-alignment-p83.mjs';
import {compareReferenceVideos} from './src/reference-alignment-p83.mjs';
import {execFileSync} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const pixels=(r,g,b)=>Buffer.from(Array.from({length:16},()=>[r,g,b]).flat());
const hash='a'.repeat(64);
test('P8.3 identifica luminosidad y saturación con pixeles de referencia reales',()=>{
 const report=compareReferenceFrames(pixels(255,0,0),pixels(60,60,60));
 assert.ok(report.issues.some(x=>x.code==='SATURATION_MISMATCH'));
 assert.notEqual(report.reference.luminance,report.rendered.luminance);
 assert.match(report.disclaimer,/no una puntuación/);
});
test('P8.3 no inventa alertas si los dos fotogramas son iguales',()=>{
 const frame=pixels(20,60,140),report=compareReferenceFrames(frame,frame);
 assert.deepEqual(report.issues,[]);
});
test('P8.3 atribuye diferencias a segundos y escenas sin editar el proyecto',()=>{
 const project={scenes:[{id:'uno',duration:2},{id:'dos',duration:2}]};
 const samples=[{seconds:1,comparison:compareReferenceFrames(pixels(255,0,0),pixels(40,40,40))},
  {seconds:3,comparison:compareReferenceFrames(pixels(20,20,20),pixels(20,20,20))}];
 const report=planReferenceReview(project,samples,{referenceHash:hash,renderHash:'b'.repeat(64)});
 assert.equal(report.scenes[0].sceneId,'uno');
 assert.ok(report.scenes[0].issues.length>0);
 assert.equal(report.scenes[1].issues.length,0);
 assert.deepEqual(report.automaticSceneEdits,[]);
 assert.equal(report.approval,'PENDING_HUMAN_REVIEW');
});
test('P8.3 bloquea muestras incompletas y hashes sin evidencia',()=>{
 assert.throws(()=>compareReferenceFrames(Buffer.alloc(3),Buffer.alloc(6)),/mismo tamaño/);
 assert.throws(()=>planReferenceReview({scenes:[{id:'x',duration:2}]},[{seconds:1,comparison:{issues:[]}}],{referenceHash:'x',renderHash:hash}),/hashes/);
});
test('P8.3 usa dos MP4 reales y devuelve hashes y segundos comprobables',async t=>{
 try{execFileSync('ffmpeg',['-version'],{stdio:'ignore'});}catch{t.skip('FFmpeg no disponible');return;}
 const dir=await mkdtemp(path.join(tmpdir(),'motion-p83-'));
 try{
  const ref=path.join(dir,'reference.mp4'),render=path.join(dir,'rendered.mp4');
  for(const [file,color]of [[ref,'red'],[render,'blue']])execFileSync('ffmpeg',['-hide_banner','-loglevel','error',
   '-f','lavfi','-i',`color=c=${color}:s=64x64:r=10:d=2`,'-c:v','mpeg4','-y',file],{stdio:'ignore'});
  const result=await compareReferenceVideos({scenes:[{id:'scene-a',duration:2}]},ref,render,{framesPerScene:2});
  assert.equal(result.samples.length,2);
  assert.match(result.sources.referenceHash,/^[0-9a-f]{64}$/);
  assert.equal(result.report.scenes[0].samples,2);
  assert.equal(result.report.approval,'PENDING_HUMAN_REVIEW');
 }finally{await rm(dir,{recursive:true,force:true});}
});
