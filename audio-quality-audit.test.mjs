import test from 'node:test';import assert from 'node:assert/strict';
import {auditTimelineAudio,parseLoudnessOutput} from './src/audio-quality-audit.mjs';
test('detectar palabras que exceden duración total',()=>{
 const r=auditTimelineAudio({scenes:[{duration:2}],audioAsset:'audio.mp3',wordTimings:[{text:'hola',start:.1,end:2.4}]});
 assert.ok(r.warnings.some(w=>w.includes('después')));
});
test('no inventar sincronización cuando no hay voz',()=>{
 const r=auditTimelineAudio({scenes:[{duration:2}],wordTimings:[]});
 assert.equal(r.voicePresent,false);assert.ok(r.warnings.length);
});
test('leer LUFS en reporte ebur128',()=>assert.equal(parseLoudnessOutput('Integrated loudness:\n    I:         -16.1 LUFS').integratedLufs,-16.1));
