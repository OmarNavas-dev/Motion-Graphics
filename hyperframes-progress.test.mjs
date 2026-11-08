import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hyperframesProgress} from './src/hyperframes-progress.mjs';
test('lee el protocolo real del CLI sin anticipar el éxito del MP4',()=>{
 assert.equal(hyperframesProgress('@hf-progress {"code":"capture","pct":50}',10),54);
 assert.equal(hyperframesProgress('@hf-progress {"code":"complete","pct":100}',10),98);
 assert.equal(hyperframesProgress('@hf-progress {"pct":10}',80),80);
});
test('espera una línea completa y descarta eventos inválidos',()=>{
 const first='@hf-progress {"code":"capture","pct":';
 assert.equal(hyperframesProgress(first,10),10);
 assert.equal(hyperframesProgress(first+'75}',10),76);
 for(const event of ['{"pct":"100"}','{"pct":-2}','{"pct":101}','not json'])assert.equal(hyperframesProgress('@hf-progress '+event,20),20);
});
test('conserva compatibilidad con contadores de frames antiguos',()=>{
 assert.equal(hyperframesProgress('Streaming frame 24/48',10),54);
 assert.equal(hyperframesProgress('Rendered 48/48',10),98);
});
