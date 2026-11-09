import test from 'node:test';import assert from 'node:assert/strict';
import {referenceParity} from './scripts/reference-parity-gate.mjs';
test('la aceptación depende de evidencia verificada, no de un false permanente',async()=>{
 const report=await referenceParity();
 assert.ok(report.total>=30);
 assert.equal(report.readyForUserAcceptance,report.unresolved.length===0&&report.errors.length===0);
 assert.deepEqual(report.errors,[]);
});
