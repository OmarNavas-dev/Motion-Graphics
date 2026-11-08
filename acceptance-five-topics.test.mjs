import test from 'node:test';import assert from 'node:assert/strict';
import {makeAcceptanceFixtures} from './scripts/acceptance-five-topics.mjs';
test('cinco temas independientes con escenas y dirección ejecutable',()=>{
 const fixtures=makeAcceptanceFixtures();
 assert.deepEqual(fixtures.map(x=>x.topic),['anatomia','volcanes','personajes','historia','graficos']);
 for(const x of fixtures){
  assert.equal(x.project.scenes.length,2);
  assert.equal(x.project.scenes[0].direction.shots.length,2);
  assert.match(x.project.scenes[0].customScene.html,/class="world"/);
 }
});
