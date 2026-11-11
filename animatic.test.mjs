import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {compileAnimatic,runAnimatic} from './scripts/animatic.mjs';
import {continuityPlan} from './scripts/animatic-continuity.mjs';

const storyboard=()=>({
 schema:'motion-studio.storyboard/v3',
 title:'Apertura de prueba',
 duration:2.003,
 source:{narration:'voz.wav',audioDuration:2.003},
 styleBible:{materials:'Acero',cameraGrammar:'Fija',identity:'Pieza ámbar'},
 scenes:[['uno',0,1.001],['dos',1.001,2.003]].map(([id,start,end])=>({
  id,start,end,visualMode:'mechanism',incoming:'Pieza abajo.',outgoing:'Pieza arriba.',
  actors:[],props:['pieza'],
  draft:{html:'<div class="pieza"></div>',css:'.pieza{width:20px;height:20px;background:orange}',script:"tl.to(S+' .pieza',{x:50,duration:.4},.1);"}
 })),
 shots:[['uno',0,1.001],['dos',1.001,2.003]].map(([sceneId,start,end])=>({
  id:'plano-'+sceneId,sceneId,start,end,framing:'detail',narration:'Sube la pieza.',
  visualPurpose:'Observar la pieza desplazándose a lo largo del eje.',
  camera:{motion:'fija',reason:'Conservar el encuadre.',target:'pieza'},raccord:'Conservar el color.',
  phases:[{kind:'cause',start:start+.1,end:start+.5,selector:'.pieza',change:'La pieza se desplaza en el eje.'}]
 }))
});

test('compiles millisecond scene boundaries and scene-local actions',()=>{
 const result=compileAnimatic(storyboard(),'Sube la pieza.',{fps:24});
 assert.equal(result.fps,24);
 assert.deepEqual(result.scenes.map(x=>x.duration),[1.001,1.002]);
 assert.deepEqual(result.scenes.map(x=>x.direction.actions[0].at),[.1,.1]);
 assert.equal(result.showText,false);
});

test('rejects small gaps, duration drift and unsupported frame rates',()=>{
 const withGap=storyboard();
 withGap.scenes[1].start+=.005;
 assert.throws(()=>compileAnimatic(withGap,'Guion'),/límites comunes/);
 const withDrift=storyboard();
 withDrift.duration+=.005;
 assert.throws(()=>compileAnimatic(withDrift,'Guion'),/duración declarada/);
 assert.throws(()=>compileAnimatic(storyboard(),'Guion',{fps:25}),/24 o 30/);
});

test('requires the project and render together for reviewing a previous export',async()=>{
 await assert.rejects(runAnimatic({storyboard:storyboard(),existingVideo:'preview.mp4'}),/JSON y su MP4/);
});

test('declares only adjacent cuts and rejects malformed selectors and thresholds',()=>{
 const project={scenes:[{id:'uno'},{id:'dos'},{id:'tres'}]};
 const cut={from:'uno',to:'dos',objects:[{id:'pieza',exit:'.pieza',entry:'#pieza',tolerance:{scale:.2}}]};
 assert.deepEqual(continuityPlan([cut],project)[0].objects[0].tolerance,{position:.02,scale:.2,appearance:18});
 assert.deepEqual(continuityPlan(undefined,project),[]);
 assert.throws(()=>continuityPlan([{...cut,to:'tres'}],project),/Empalme inválido/);
 assert.throws(()=>continuityPlan([cut,cut],project),/Empalme repetido/);
 assert.throws(()=>continuityPlan([{...cut,objects:[{...cut.objects[0],entry:'div .pieza'}]}],project),/selector inválido/);
 assert.throws(()=>continuityPlan([{...cut,objects:[{...cut.objects[0],tolerance:{scale:-1}}]}],project),/Tolerancia inválida/);
});

test('renders a playable audio track and catches an altered object at a declared cut',
 {skip:!process.env.MOTION_STUDIO_BROWSER,timeout:60000},async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'motion-animatic-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const voice=path.join(root,'voice.wav');
  execFileSync('ffmpeg',['-nostdin','-v','error','-f','lavfi','-i','sine=duration=2.003',voice]);
  const plan=storyboard();
  plan.fps=24;
  plan.continuity=[{from:'uno',to:'dos',objects:[{id:'pieza',exit:'.pieza',entry:'.pieza'}]}];
  plan.scenes[1].draft.css+='.pieza{transform:translateX(50px)}';
  const good=path.join(root,'matched');
  const matched=await runAnimatic({storyboard:plan,script:'Guion de prueba.',voice,out:good});
  assert.equal(matched.status,'matched');
  assert.deepEqual([matched.cuts[0].exitFrame,matched.cuts[0].entryFrame],[24,25]);
  const video=path.join(good,'animatic.mp4');
  const audio=execFileSync('ffprobe',['-v','error','-select_streams','a:0','-show_entries','stream=codec_name','-of','csv=p=0',video],{encoding:'utf8'});
  assert.equal(audio.trim(),'aac');
  plan.scenes[1].draft.css+='.pieza{transform:translateX(100px)}';
  const altered=await runAnimatic({storyboard:plan,script:'Guion de prueba.',voice,out:path.join(root,'changed')});
  assert.equal(altered.status,'review-required');
  assert.ok(altered.cuts[0].objects[0].flags.includes('position'));
 });
