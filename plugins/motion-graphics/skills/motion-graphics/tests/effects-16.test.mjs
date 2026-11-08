import test from 'node:test';
import assert from 'node:assert/strict';
import {EFFECTS} from '../scripts/effect-recipes.mjs';
import {buildEffectScene} from '../scripts/kits/effects-16-kit.mjs';
import {auditProjectScenes} from '../scripts/scene-audit.mjs';
import {sanitizeCustomScene} from '../scripts/compat/server-utils.mjs';
import vm from 'node:vm';

test('cada una de las 16 recetas genera DOM+GSAP ejecutable y sin selectores perdidos',()=>{
 const scenes=EFFECTS.map(e=>buildEffectScene(e.id,{id:'fx-'+e.id,label:'PRUEBA'}));
 assert.equal(scenes.length,16);
 for(const s of scenes){
  assert.ok(s.customScene.html.includes('<svg'));
  assert.ok(s.customScene.script.includes('tl.fromTo('));
  assert.ok(s.customScene.script.includes('T0+'));
  sanitizeCustomScene(s.customScene,s.id);
  const calls=[];
  const tl={fromTo:(...args)=>calls.push(args),to:(...args)=>calls.push(args),set:(...args)=>calls.push(args)};
  vm.runInNewContext(`(function(tl,S,T0,D,gsap){${s.customScene.script}})(tl,'.motion-scene',0,4,{})`,{tl});
  assert.ok(calls.length>0);
  assert.ok(calls.every(c=>String(c[0]).startsWith('.motion-scene .')));
 }
 const audit=auditProjectScenes({scenes});
 assert.deepEqual(audit.errors,[]);
});

test('el render de receta respeta duración y vocabulario del usuario',()=>{
 const result=buildEffectScene('masked-type',{duration:2.5,label:'EL VOLCÁN',id:'test-mask'});
 assert.match(result.customScene.html,/EL VOLCÁN/);
 assert.equal(result.duration,2.5);
 assert.throws(()=>buildEffectScene('no-existe'));
});
