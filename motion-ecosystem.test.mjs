import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkMotionEcosystem} from './scripts/check-motion-ecosystem.mjs';

test('complemento empaquetado, importador y exportador comparten contrato sin alterar las escenas',async()=>{
 const report=await checkMotionEcosystem();
 assert.equal(report.technicalContractPassed,true,report.errors.join('\n'));
 assert.equal(report.cases.length,5);
 assert.deepEqual(report.cases.map(c=>c.fps),[24,30,24,24,24]);
 assert.equal(report.runtimePassed,false);
 assert.equal(report.visualApproval,false);
 assert.equal(report.videoVerified,false);
});
