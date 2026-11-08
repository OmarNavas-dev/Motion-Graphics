import test from 'node:test';
import assert from 'node:assert/strict';
import {assessSampledFrames} from './src/render-quality-audit.mjs';

test('detecta un plano congelado prolongado sin atribuirle calidad artística',()=>{
  const frameSize=4*4;
  const frames=Buffer.alloc(frameSize*12,80);
  const result=assessSampledFrames(frames,{width:4,height:4,fps:2});
  assert.equal(result.sampledFrames,12);
  assert.equal(result.meanChange,0);
  assert.ok(result.frozenSegments.length>=1);
});

test('detecta un salto visual fuerte y no confunde cambios constantes con congelación',()=>{
  const frames=Buffer.concat(Array.from({length:8},(_,i)=>Buffer.alloc(16,i<4?i*15:200+(i-4)*10)));
  const result=assessSampledFrames(frames,{width:4,height:4,fps:2});
  assert.equal(result.frozenSegments.length,0);
  assert.ok(result.largeVisualChanges.length>=1);
});
