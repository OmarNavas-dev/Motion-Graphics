import test from 'node:test';
import assert from 'node:assert/strict';
import {repairCrossSceneIds} from './src/scene-id-repair.mjs';
import {checkCustomScenePreflight} from './src/custom-scene-preflight.mjs';

const example=(id)=>({id,duration:2,customScene:{
 html:`<svg><defs><linearGradient id="metal"/><radialGradient id='bubble'/><pattern id="grid"/></defs><rect id="target" fill="url(#metal)" stroke='url(#bubble)' style="filter:url(#grid)" aria-labelledby="metal bubble"/></svg>`,
 css:'#metal{opacity:1} .piece{fill:url(#bubble)}',
 script:`tl.to(S+' #target',{opacity:1,duration:1});tl.to(S+' #metal',{opacity:1,duration:1});document.getElementById('grid');`
},direction:{actions:[{selector:'#target'},{selector:'#bubble'}]}});

test('repairs bubble-video cross-scene IDs and all local SVG, CSS, GSAP and action references',()=>{
 const input={scenes:[example('burbuja-01'),example('burbuja-02'),example('burbuja-03')]};
 assert.equal(checkCustomScenePreflight(input).passed,false);
 const result=repairCrossSceneIds(input);
 assert.equal(result.repaired,true);
 assert.equal(result.changes.length,12); // 3 paint servers + target per scene
 assert.equal(checkCustomScenePreflight(result.project).passed,true);
 for(const scene of result.project.scenes){
   const prefix=`ms-${scene.id}-`;
   for(const id of ['metal','bubble','grid','target'])assert.ok(scene.customScene.html.includes(`id="${prefix+id}"`)||scene.customScene.html.includes(`id='${prefix+id}'`));
   assert.ok(scene.customScene.html.includes(`url(#${prefix}metal)`));
   assert.ok(scene.customScene.html.includes(`aria-labelledby="${prefix}metal ${prefix}bubble"`));
   assert.ok(scene.customScene.css.includes(`#${prefix}metal`));
   assert.ok(scene.customScene.script.includes(`getElementById('${prefix}grid')`));
   assert.ok(scene.direction.actions.some(action=>action.selector===`#${prefix}bubble`));
 }
 assert.equal(repairCrossSceneIds(result.project).repaired,false);
 assert.deepEqual(input.scenes[0].customScene.html,example('burbuja-01').customScene.html);
});

test('does not guess which duplicated element to animate inside one scene',()=>{
 const input={scenes:[{id:'one',customScene:{html:'<svg><g id="metal"/><g id="metal"/></svg>'}},example('two')]};
 const result=repairCrossSceneIds(input);
 assert.ok(result.warnings.some(w=>w.includes('corrección manual')));
 assert.equal(checkCustomScenePreflight(result.project).passed,false);
});

test('leaves unrelated unique IDs and CSS colors unchanged',()=>{
 const input={scenes:[{id:'one',customScene:{html:'<svg><g id="solo" fill="#ffffff"/></svg>',css:'.solo{color:#ffffff}',script:''}}]};
 assert.deepEqual(repairCrossSceneIds(input).project,input);
});

test('refuses to rewrite a dynamic JS identifier that cannot be proven safe',()=>{
 const dynamic={...example('one'),customScene:{...example('one').customScene,script:"const id='metal'; tl.to(S+' #target',{opacity:1});"}};
 const result=repairCrossSceneIds({scenes:[dynamic,example('two')]});
 assert.ok(result.warnings.some(w=>w.includes('dinámicamente')));
 assert.equal(result.project.scenes[0].customScene.html.includes('id="metal"'),true);
 assert.equal(checkCustomScenePreflight(result.project).passed,true);
});
