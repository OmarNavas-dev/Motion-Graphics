import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createAudioSimulationProject,SIMULATION_KINDS} from './src/audio-simulation-p6.mjs';
import {normalizeSoundDesign,normalizeSimulation} from './src/motion-capabilities.mjs';
import {renderSoundWav,renderSoundWav as renderAgain} from './src/sound-design.mjs';
import {validateProject} from './server-utils.mjs';
import {validateProject as validatePlugin} from './plugins/motion-graphics/skills/motion-graphics/scripts/compat/server-utils.mjs';
import {renderAuthored} from './src/authored-renderer.mjs';
import {generateAudioSimulationWorkflow} from './plugins/motion-graphics/skills/motion-graphics/scripts/generate-audio-simulation-project.mjs';

test('P6: cuatro simulaciones sincronizadas conservan paridad plugin/Studio',()=>{
 const raw=createAudioSimulationProject();
 assert.deepEqual(raw.scenes.map(s=>s.authored.layers[0].simulation.kind),SIMULATION_KINDS);
 const project=validateProject(raw);
 assert.deepEqual(validatePlugin(raw),project);
 assert.deepEqual(validateProject(project),project);
 assert.deepEqual(generateAudioSimulationWorkflow(),project);
 assert.equal(project.soundDesign.cues.length,9);
 assert.ok(project.soundDesign.cues.every(c=>c.at+c.duration<=16));
});
for(const kind of SIMULATION_KINDS)test('P6: '+kind+' es determinista al buscar adelante y atrás',()=>{
 const scene=validateProject(createAudioSimulationProject({kind})).scenes[0];
 const render=(time)=>renderAuthored(scene.authored,{time,duration:scene.duration,width:1280,height:720});
 const a=render(.4),b=render(1.9),c=render(.4);
 assert.equal(a,c);
 assert.notEqual(a,b);
 assert.match(a,new RegExp(`data-ms-simulation="${kind}"`));
 assert.match(a,/data-ms-body="0"/);
});
test('P6: rechaza simulaciones arbitrarias, desbordes y mezcla peligrosa',()=>{
 assert.throws(()=>normalizeSimulation({kind:'fluid'},4),/P6/);
 assert.throws(()=>normalizeSimulation({kind:'orbit',count:100},4),/P6/);
 assert.throws(()=>normalizeSimulation({kind:'orbit',speed:Infinity},4),/P6/);
 assert.throws(()=>normalizeSoundDesign({enabled:true,cues:[{type:'pop',at:0,duration:1,pan:2}]},4),/inválido/);
 assert.throws(()=>normalizeSoundDesign({enabled:true,cues:[{type:'pop',at:0,duration:1,fadeOut:1.1}]},4),/inválido/);
 assert.throws(()=>normalizeSoundDesign({enabled:true,cues:[],mix:{sfxGain:20}},4),/mezcla/);
});
test('P6: WAV estéreo conserva paneo, fades y reproducibilidad binaria',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ms-p6-'));
 try{
  const conf=normalizeSoundDesign({enabled:true,mix:{voicePriority:true,sfxGain:.7,limit:.9},cues:[
   {type:'chime',at:.1,duration:.45,gain:.6,pan:-1,fadeIn:.04,fadeOut:.08}]},1);
  const first=path.join(dir,'a.wav'),second=path.join(dir,'b.wav');
  const result=await renderSoundWav(conf,first,{rate:8000,seconds:1});
  await renderAgain(conf,second,{rate:8000,seconds:1});
  const a=await readFile(first),b=await readFile(second);
  assert.deepEqual(a,b);
  assert.equal(result.channels,2);
  assert.equal(a.readUInt16LE(22),2);
  assert.equal(a.length,44+8000*4);
  let left=0,right=0;
  for(let i=44;i<a.length;i+=4){left+=Math.abs(a.readInt16LE(i));right+=Math.abs(a.readInt16LE(i+2));}
  assert.ok(left>1000&&right<left*.001,'pan izquierdo debe conservar separación real');
 }finally{await rm(dir,{recursive:true,force:true});}
});
