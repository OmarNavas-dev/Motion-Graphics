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
test('P8.2 identifies timed static holds with actionable but non-automatic review',()=>{
 const report=analyzePacingFrames(Buffer.alloc(16*50,50),{width:4,height:4,fps:10,maxGapSeconds:1.5});
 assert.ok(report.holdWindows[0].requiresReview);
 assert.ok(report.correctiveHints.some(h=>h.type==='review-hold'));
});
test('P8.2 provides explicit flash intervals and prevents invalid frame rates',()=>{
 const samples=Array.from({length:12},(_,i)=>Buffer.alloc(16,i%2?255:0));
 const report=analyzePacingFrames(Buffer.concat(samples),{width:4,height:4,fps:10,minHoldSeconds:.3});
 assert.ok(report.flashWindows[0].duration>0);
 assert.throws(()=>analyzePacingFrames(Buffer.alloc(16),{width:4,height:4,fps:0}),/inválidos/);
});
