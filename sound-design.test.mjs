import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,stat,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';
import {normalizeSoundDesign,renderSoundWav,soundAt} from './src/sound-design.mjs';
test('Foley deterministic and strictly opt-in',async()=>{
 assert.equal(normalizeSoundDesign(undefined,4).enabled,false);
 const config=normalizeSoundDesign({enabled:true,cues:[{type:'impact',at:.2,duration:.4,gain:.3}]},2);
 assert.equal(soundAt('impact',.04,.4,440),soundAt('impact',.04,.4,440));
 const folder=await mkdtemp(path.join(tmpdir(),'motion-sfx-'));
 try{const a=path.join(folder,'fx.wav');const r=await renderSoundWav(config,a,{seconds:2});assert.equal(r.generated,true);assert.equal((await readFile(a)).toString('ascii',0,4),'RIFF');assert.equal((await stat(a)).size,44+2*24000*2);}
 finally{await rm(folder,{recursive:true,force:true});}
});
test('no invalid duration, kind or gain can enter generated WAV',()=>{
 assert.throws(()=>normalizeSoundDesign({enabled:true,cues:[{type:'invalid',at:0,duration:1}]},2));
 assert.throws(()=>normalizeSoundDesign({enabled:true,cues:[{type:'whoosh',at:1.9,duration:.2}]},2));
});
