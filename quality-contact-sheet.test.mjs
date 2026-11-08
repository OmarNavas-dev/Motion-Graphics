import test from 'node:test';import assert from 'node:assert/strict';
import {planSceneSamples} from './src/quality-contact-sheet.mjs';
test('tres momentos por escena con segundos globales reales',()=>{
 const samples=planSceneSamples({scenes:[{id:'a',duration:4},{id:'b',duration:6}]});
 assert.equal(samples.length,6);
 assert.ok(samples[3].seconds>=4);
 assert.equal(samples[3].scene,'b');
});
test('muestreo limitado sin salir de duración',()=>{
 const samples=planSceneSamples({scenes:Array.from({length:30},(_,i)=>({id:String(i),duration:2}))},{maxFrames:20});
 assert.equal(samples.length,20);
 assert.ok(samples.every(s=>s.seconds<60 && s.seconds>=0));
});
