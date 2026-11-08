import test from 'node:test';import assert from 'node:assert/strict';
import {referenceParity} from './scripts/reference-parity-gate.mjs';
test('the full reference suite is not falsely certified as ready',async()=>{
 const report=await referenceParity();
 assert.ok(report.total>=30);
 assert.equal(report.readyForUserAcceptance,false);
 assert.deepEqual(report.errors,[]);
 assert.ok(report.unresolved.some(x=>x.id==='motion-broll'));
});
