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

test('avisa si se declara 2.5D pero solo hay un icono plano con zoom', () => {
  const result=auditVisualDirection({creativeBrief:'Corazón humano 2.5D', audioAsset:'voz.mp3', scenes:[{
    id:'heart',duration:4,
    customScene:{html:'<svg><path d="M0 0L20 20"/></svg>',css:'',script:"tl.to(S+' .camera',{scale:1.2},T0);"},
    direction:{objective:'Ver corazón',shots:[{scale:'medium'}]}
  }]});
  assert.deepEqual(result.findings.map(f=>f.code).sort(),
    ['DEPTH_PLANES_MISSING','MATERIAL_DEPTH_WEAK','PARALLAX_NOT_EXECUTED']);
});

test('no marca falsas faltas en una escena 2.5D por planos independientes', () => {
  const result=auditVisualDirection({creativeBrief:'Explicación 2.5D',audioAsset:'voz.mp3',scenes:[{
    id:'layers',duration:4,
    customScene:{
      html:'<svg><defs><radialGradient id="r"><stop offset="0"/></radialGradient></defs><g data-depth="-20" class="layer-far"/><g data-depth="0" class="layer-mid"/><g data-depth="20" class="layer-near"/></svg>',
      css:'__SCENE__ .layer-mid{filter:drop-shadow(0 5px 3px #000)}',
      script:"tl.to(S+' .layer-far',{x:4},T0); tl.to(S+' .layer-near',{x:14},T0);"
    },direction:{objective:'Mostrar profundidad',shots:[{scale:'medium'}]}
  }]});
  assert.equal(result.findings.length,0);
});
