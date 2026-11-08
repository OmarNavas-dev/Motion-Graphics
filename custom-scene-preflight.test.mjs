import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkCustomScenePreflight} from './src/custom-scene-preflight.mjs';

test('detecta v03 .world desde GSAP y ficha sin esperar render', () => {
  const project={scenes:[{id:'v03',customScene:{html:'<svg><g class="macro-world"/></svg>',script:"tl.to(S+' .world',{x:30,duration:1},T0);"},direction:{actions:[{selector:'.world'}]}}]};
  const r=checkCustomScenePreflight(project);
  assert.equal(r.passed,false);assert.match(r.errors[0],/v03.*\.world/);
});
test('detecta IDs globales duplicados sin repetirlos por fotograma', () => {
  const scenes=['a','b'].map(id=>({id,customScene:{html:'<svg><filter id="halo"/><g class="world"/></svg>',script:"tl.to(S+' .world',{opacity:1},T0);"}}));
  const r=checkCustomScenePreflight({scenes});assert.equal(r.passed,false);assert.equal(r.errors.length,1);assert.match(r.errors[0],/#halo/);
});
test('aprueba clases y IDs únicos, dejando selectores complejos al DOM',()=>{
 const r=checkCustomScenePreflight({scenes:[{id:'a',customScene:{html:'<svg><g id="a-hero" class="world"/></svg>',script:"tl.to(S+' .world',{x:12},T0);"},direction:{actions:[{selector:'.world > path'}]}}]});
 assert.equal(r.passed,true);assert.equal(r.warnings.length,1);
});
