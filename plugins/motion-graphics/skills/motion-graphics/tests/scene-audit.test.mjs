import test from 'node:test';
import assert from 'node:assert/strict';
import {auditProjectScenes} from '../scripts/scene-audit.mjs';

const scene=(id,selector,html,script='')=>({id,duration:5,customScene:{html,script},
  direction:{actions:[{selector}],shots:[{}],before:{},after:{}}});

test('detecta error real de v03 aunque JS apunte a una clase válida',()=>{
  const p={scenes:[scene('v03','.world','<svg><g class="macro-world"/></svg>',"tl.to(S+' .macro-world',{x:3},0)")]};
  const r=auditProjectScenes(p);
  assert.equal(r.ok,false);
  assert.match(r.errors[0],/v03.*\.world/);
});

test('valida clases de SVG y todas las clases usadas en scripts GSAP',()=>{
  const p={scenes:[scene('c01','.organ','<svg><g class="organ"><g class="blood"/></g></svg>',
    "tl.to(S+' .organ',{x:3});tl.to(S+' .blood',{y:10})")]};
  assert.equal(auditProjectScenes(p).ok,true);
  p.scenes[0].customScene.script+=";tl.to(S+' .missing',{opacity:0})";
  assert.match(auditProjectScenes(p).errors[0],/\.missing/);
});

test('detecta falsos estados, duración uniforme y narración sin audio como advertencias',()=>{
  const p={scenes:Array.from({length:4},(_,i)=>scene(`s${i}`,'.organ','<g class="organ"/>')),
    narrationMode:'single',audioAsset:''};
  const r=auditProjectScenes(p);
  assert.equal(r.ok,true);
  assert.ok(r.warnings.some(x=>/antes\/después/.test(x)));
  assert.ok(r.warnings.some(x=>/igual duración/.test(x)));
  assert.ok(r.warnings.some(x=>/narración/.test(x)));
});
