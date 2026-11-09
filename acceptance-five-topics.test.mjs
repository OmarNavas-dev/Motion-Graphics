import test from 'node:test';import assert from 'node:assert/strict';
import {makeAcceptanceFixtures,renderAcceptanceFailures} from './scripts/acceptance-five-topics.mjs';
test('cinco temas independientes con escenas y dirección ejecutable',()=>{
 const fixtures=makeAcceptanceFixtures();
 assert.deepEqual(fixtures.map(x=>x.topic),['anatomia','volcanes','personajes','historia','graficos']);
 for(const x of fixtures){
  assert.equal(x.project.scenes.length,2);
  assert.equal(x.project.scenes[0].direction.shots.length,x.topic==='graficos'?0:2);
  assert.match(x.project.scenes[0].customScene.html,/class="world"/);
 }
});

test('rechaza MP4 sin audio, sin frames o con loop defectuoso y no confunde advertencias con aprobación',()=>{
 const project=makeAcceptanceFixtures().find(x=>x.topic==='graficos').project;
 const base={videoAudit:{video:{duration:6,width:720,height:1280,audioPresent:false}},pacingAudit:{hasMotion:true},inspection:'frames-generated',loopAudit:{seamlessByHeuristic:true}};
 assert.deepEqual(renderAcceptanceFailures(project,base),[]);
 assert.match(renderAcceptanceFailures(project,{...base,loopAudit:{seamlessByHeuristic:false}}).join(' '),/bucle/);
 assert.match(renderAcceptanceFailures(project,{...base,inspection:'partial'}).join(' '),/fotogramas/);
 const foley=makeAcceptanceFixtures().find(x=>x.topic==='volcanes').project;
 assert.match(renderAcceptanceFailures(foley,base).join(' '),/sonoros/);
});

test('acceptance spans style presets, Foley and looping',()=>{
 const f=makeAcceptanceFixtures();
 assert.ok(f.every(x=>x.project.stylePreset));
 assert.equal(f.find(x=>x.topic==='volcanes').project.soundDesign.cues.length,3);
 const charts=f.find(x=>x.topic==='graficos').project;
 assert.equal(charts.loop,true);
 assert.match(charts.scenes[0].customScene.script,/world rect/);
});
