import test from 'node:test';
import assert from 'node:assert/strict';
import {assessReferenceRevision} from './src/reference-revision-gate-p8.mjs';
import {compareReferenceFrames,planReferenceReview} from './src/reference-alignment-p83.mjs';

const frame=(v)=>Buffer.from(Array.from({length:16},()=>[v,v,v]).flat());
const ref='a'.repeat(64);
const evidence=(render,renderFrame)=>{
 const sample={sceneId:'escena',seconds:1,referenceSeconds:1,comparison:compareReferenceFrames(frame(80),frame(renderFrame))};
 return {samples:[sample],report:planReferenceReview({scenes:[{id:'escena',duration:2}]},[sample],
  {referenceHash:ref,renderHash:render.repeat(64)})};
};
test('P8 final acepta una mejora métrica real pero nunca autoriza arte automáticamente',()=>{
 const result=assessReferenceRevision(evidence('b',210),evidence('c',90));
 assert.equal(result.passed,true);assert.equal(result.approval,'PENDING_HUMAN_REVIEW');
});
test('P8 final rechaza regresiones de comparación visual',()=>{
 assert.equal(assessReferenceRevision(evidence('b',90),evidence('c',230)).passed,false);
});
test('P8 final impide usar otra referencia o el mismo render como prueba de mejora',()=>{
 const before=evidence('b',230),after=evidence('c',90);
 after.report.referenceHash='d'.repeat(64);
 assert.throws(()=>assessReferenceRevision(before,after),/misma referencia/);
 assert.throws(()=>assessReferenceRevision(before,before),/dos renders/);
});
