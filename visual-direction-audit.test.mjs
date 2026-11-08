import test from 'node:test';
import assert from 'node:assert/strict';
import {auditVisualDirection} from './src/visual-direction-audit.mjs';

test('detecta encuadres prometidos sin animación de cámara y raccord sin ejecutar', () => {
  const result=auditVisualDirection({scenes:[
    {id:'a',duration:3,transition:'cut',customScene:{html:'<svg/>',script:"tl.to(S+' .lava',{opacity:1},T0);"},direction:{objective:'Mostrar lava',shots:[{scale:'wide'},{scale:'close'}],transition:'raccord por forma'}},
    {id:'b',duration:2,customScene:{html:'<svg/>',script:"tl.to(S+' .ash',{y:2},T0);"}}
  ]});
  assert.equal(result.passed,true);
  assert.deepEqual(result.findings.filter(f=>f.severity==='warning').map(f=>f.code),['SHOT_PLAN_NOT_EXECUTED','CONTINUITY_ONLY_ON_PAPER']);
  assert.ok(result.findings.some(f=>f.code==='AUDIO_SYNC_NOT_TESTABLE'));
});

test('no acusa encuadre sin cámara si hay movimiento declarado', () => {
  const result=auditVisualDirection({audioAsset:'audio.mp3',scenes:[{id:'one',duration:2,customScene:{html:'<svg/>',script:"tl.to(S+' .camera',{scale:1.4,duration:2},T0);"},direction:{objective:'Acercamiento',shots:[{},{}]}}]});
  assert.equal(result.findings.length,0);
});
