import test from 'node:test';import assert from 'node:assert/strict';
import {compareLoopFrames,compareLoopCycleFrames} from './src/loop-quality-audit.mjs';
test('loop identical seam passes pixel heuristic',()=>{
 const result=compareLoopFrames(Buffer.alloc(16,20),Buffer.alloc(16,20),Buffer.alloc(16,30));
 assert.equal(result.seamlessByHeuristic,true);
});
test('loop obvious jump fails without claiming artistic certainty',()=>{
 const result=compareLoopFrames(Buffer.alloc(16,0),Buffer.alloc(16,255),Buffer.alloc(16,250));
 assert.equal(result.seamlessByHeuristic,false);
});
test('P8.2 cyclic motion may pass without duplicating the first frame',()=>{
 const b=v=>Buffer.alloc(32,v);
 const result=compareLoopCycleFrames(b(10),b(25),b(20),b(13));
 assert.equal(result.passed,true);assert.ok(result.seamDifference>0);
});
test('P8.2 detects large boundary discontinuity against adjacent steps',()=>{
 const b=v=>Buffer.alloc(32,v);
 const result=compareLoopCycleFrames(b(5),b(7),b(251),b(250));
 assert.equal(result.passed,false);assert.equal(result.issue.type,'loop-boundary-jump');
});
