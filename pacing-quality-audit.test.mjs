import test from 'node:test';import assert from 'node:assert/strict';
import {analyzePacingFrames} from './src/pacing-quality-audit.mjs';
test('find prolonged static windows in real pixel samples',()=>{
 const bytes=Buffer.alloc(16*50,60);
 const out=analyzePacingFrames(bytes,{width:4,height:4,fps:10,maxGapSeconds:1.5});
 assert.ok(out.deadGaps.length);assert.equal(out.hasMotion,false);
});
test('detect rapid full-frame changes as possible flashing',()=>{
 const samples=Array.from({length:12},(_,i)=>Buffer.alloc(16,i<3?0:i===3?255:i===4?0:((i%2)*120)));
 const out=analyzePacingFrames(Buffer.concat(samples),{width:4,height:4,fps:10,minHoldSeconds:.3});
 assert.ok(out.flashSuspects.length);
});
