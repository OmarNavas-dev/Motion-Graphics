import test from 'node:test';
import assert from 'node:assert/strict';
import {resampleClosedPath,morphPolygon,morphTrack,pulseDeform,geometryHealth} from '../scripts/morph-motion.mjs';
const triangle=[{x:0,y:0},{x:60,y:0},{x:30,y:60}];
const square=[{x:0,y:0},{x:60,y:0},{x:60,y:60},{x:0,y:60}];
test('morfología con puntos incompatibles produce path uniforme',()=>{
 const sample=morphPolygon(triangle,square,{points:24});
 assert.equal(sample(0).length,24);assert.equal(sample(.5).length,24);assert.equal(sample(1).length,24);
 assert.deepEqual(sample(.25),sample(.25));
 assert.notDeepEqual(sample(0),sample(.5));assert.notDeepEqual(sample(.5),sample(1));
 assert.match(morphTrack(triangle,square,{start:1,end:2})(1.5),/^M/);
});
test('resampling produce geometría estable y valida degeneración',()=>{
 assert.equal(resampleClosedPath(square,32).length,32);
 assert.throws(()=>resampleClosedPath([{x:0,y:0},{x:0,y:0},{x:0,y:0}]));
 assert.ok(geometryHealth(square).perimeter>0);
});
test('deformación local cambia silueta, no desplaza entero',()=>{
 const pulse=pulseDeform(square,{amount:.12});
 assert.deepEqual(pulse(0),square);
 assert.notDeepEqual(pulse(.25),square);
 assert.deepEqual(pulse(.25),pulse(.25));
});
