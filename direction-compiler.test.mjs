import test from 'node:test';import assert from 'node:assert/strict';
import {compileSceneDirection} from './src/direction-compiler.mjs';
test('convierte planos de cámara en GSAP sin alterar duración de audio',()=>{
 const scene={duration:5,customScene:{html:'<svg><g class="world"><circle/></g></svg>',script:''},direction:{shots:[{at:0,duration:2,scale:'wide'},{at:2,duration:3,scale:'close',x:-60,y:20}]}};
 const output=compileSceneDirection(scene);
 assert.equal(output.cameraGenerated,true);assert.match(output.script,/tl\.to/);assert.match(output.script,/scale:1\.32/);assert.match(output.script,/T0\+2/);
});
test('preserva animación manual y nunca inventa selectores',()=>{
 const scene={duration:5,customScene:{html:'<svg><g class="world"/></svg>',script:"tl.to(S+' .world',{scale:1.1,duration:1},T0);"},direction:{shots:[{at:0,duration:2,scale:'wide'},{at:2,duration:3,scale:'close'}]}};
 assert.equal(compileSceneDirection(scene).cameraGenerated,false);
 assert.equal(compileSceneDirection({...scene,customScene:{html:'<svg/>',script:''}}).script,'');
});
test('materializa acciones numéricas explícitas, rechaza valores inválidos',()=>{
 const scene={duration:4,customScene:{html:'<svg><g class="door"/></svg>',script:''},direction:{actions:[{id:'abrir',selector:'.door',at:1,duration:2,motion:{from:{rotation:0},to:{rotation:35}}}]}};
 assert.equal(compileSceneDirection(scene).actionsGenerated,1);
 scene.direction.actions[0].motion.to.rotation=Infinity;
 assert.equal(compileSceneDirection(scene).actionsGenerated,0);
});
