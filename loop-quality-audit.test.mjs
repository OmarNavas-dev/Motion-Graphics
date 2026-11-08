import test from 'node:test';import assert from 'node:assert/strict';
import {compareLoopFrames} from './src/loop-quality-audit.mjs';
test('loop identical seam passes pixel heuristic',()=>{
 const result=compareLoopFrames(Buffer.alloc(16,20),Buffer.alloc(16,20),Buffer.alloc(16,30));
 assert.equal(result.seamlessByHeuristic,true);
});
test('loop obvious jump fails without claiming artistic certainty',()=>{
 const result=compareLoopFrames(Buffer.alloc(16,0),Buffer.alloc(16,255),Buffer.alloc(16,250));
 assert.equal(result.seamlessByHeuristic,false);
});
