import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {gateSequentialQuality} from './plugins/motion-graphics/skills/motion-graphics/scripts/gate-sequential-quality.mjs';
import {samplePilot} from './plugins/motion-graphics/skills/motion-graphics/scripts/sample-pilot-v3.mjs';

let folder,video,fake,short;
const ffmpeg=(...args)=>execFileSync('ffmpeg',['-nostdin','-v','error',...args],{windowsHide:true});
before(()=>{
 folder=fs.mkdtempSync(path.join(os.tmpdir(),'motion-v4-video-'));
 video=path.join(folder,'render.mp4');
 fake=path.join(folder,'falso.mp4');
 short=path.join(folder,'render-corto.mp4');
 fs.writeFileSync(fake,JSON.stringify({scenes:[]}));
 ffmpeg('-f','lavfi','-i','color=red:s=64x96:r=30:d=4','-f','lavfi','-i','color=blue:s=64x96:r=30:d=6',
  '-filter_complex','[0:v][1:v]concat=n=2:v=1:a=0','-c:v','libx264','-threads','1','-pix_fmt','yuv420p',video);
 ffmpeg('-i',video,'-t','2','-c','copy',short);
});
after(()=>{if(folder)fs.rmSync(folder,{recursive:true,force:true});});

const title='La corredera presiona la varilla hasta abrir la estructura';
const storyboard={
 schema:'motion-studio.storyboard/v3',duration:10,
 source:{narration:'Narración de prueba',audioDuration:10},
 styleBible:{materials:'Metal mate',cameraGrammar:'Detalle del contacto',identity:'Corredera y varilla'},
 scenes:[{id:'mecanismo',start:0,end:10,visualMode:'mechanism',
  actors:['corredera'],props:['varilla'],incoming:'Mecanismo cerrado',outgoing:'Mecanismo abierto'}],
 shots:[{id:'apertura',sceneId:'mecanismo',start:0,end:10,visualPurpose:title,
  framing:'Detalle del contacto',camera:{motion:'Plano fijo',reason:'Mostrar dónde se unen las piezas'},
  raccord:'La varilla permanece abierta',phases:[
   {kind:'cause',start:1,end:3,selector:'.corredera',change:'La corredera asciende'},
   {kind:'contact',start:4.5,end:5.5,selector:'.varilla',change:'La corredera toca la varilla'},
   {kind:'result',start:6,end:8,selector:'.varilla',change:'La varilla queda abierta'}
  ]}]
};
const project={fps:30,scenes:[{id:'mecanismo',duration:10,
 customScene:{html:'<svg><g class="corredera"/><g class="varilla"/></svg>',css:'',
  script:"tl.to(S+' .corredera',{y:12,duration:2},1);tl.to(S+' .varilla',{rotation:45,duration:2},4.5);"},
 direction:{objective:title,visualMode:'mechanism',
  actions:[{selector:'.corredera',action:'Subir la corredera',result:'Toca el anclaje de la varilla'},
   {selector:'.varilla',action:'Abrir la varilla',result:'La estructura queda extendida'}],
  shots:[{at:0,duration:10,purpose:title}]}
}]};
const reviewed=()=>({stages:Object.fromEntries(Array.from({length:6},(_,i)=>
 [i+1,{reviewerApproved:true,notes:'Evidencia de prueba',artifacts:[video]}]))});

test('el control acepta un render real propio con revisión explícita y referencia opcional',()=>{
 const result=gateSequentialQuality(project,reviewed(),{storyboard,render:video});
 assert.equal(result.ready,true,JSON.stringify(result.stages));
 assert.equal(result.visualApproved,true);
 assert.equal(gateSequentialQuality(project,{}, {storyboard,render:video}).ready,false);
});

test('el control rechaza texto con nombre MP4, una referencia inválida y un render incompleto',()=>{
 for(const [options,reason] of [
  [{render:fake},/Render de entrega: .*no es un video/],
  [{render:video,reference:fake},/Referencia: .*no es un video/],
  [{render:short},/el proyecto 10\.000 s/]
 ]){
  const result=gateSequentialQuality(project,reviewed(),{storyboard,...options});
  assert.equal(result.ready,false);
  assert.equal(result.blockedAt,5);
  assert.match(result.stages.at(-1).reasons.join('\n'),reason);
 }
});

test('el piloto recortado usa el inicio global y extrae el fotograma de contacto del clip',()=>{
 const startSeconds=29.45;
 const plan={...storyboard,duration:60,shots:storyboard.shots.map(shot=>({...shot,
  start:shot.start+startSeconds,end:shot.end+startSeconds,
  phases:shot.phases.map(phase=>({...phase,start:phase.start+startSeconds,end:phase.end+startSeconds}))
 }))};
 const out=path.join(folder,'muestreo');
 assert.throws(()=>samplePilot({video,storyboard:plan,out}),/no coincide.*--start/);
 assert.equal(fs.existsSync(out),false);
 const result=samplePilot({video,storyboard:plan,out,startSeconds});
 assert.equal(result.frames,5);
 const report=JSON.parse(fs.readFileSync(path.join(out,'review.json'),'utf8'));
 const contact=report.samples.find(sample=>sample.label.startsWith('contact:'));
 assert.equal(contact.at,5);
 assert.equal(contact.globalAt,34.45);
 const [red,,blue]=ffmpeg('-i',path.join(out,contact.image),'-frames:v','1',
  '-vf','scale=1:1','-pix_fmt','rgb24','-f','rawvideo','-');
 assert.ok(blue>200&&red<40,'El contacto cae en la parte azul del clip');
 assert.equal(samplePilot({video,storyboard,out:path.join(folder,'sin-recorte')}).frames,5);
});
