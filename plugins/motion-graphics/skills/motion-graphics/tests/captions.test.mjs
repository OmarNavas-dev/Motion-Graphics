import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {addCaptions, captionGroups} from '../scripts/add-captions.mjs';
import {checkCaptionStyle} from '../scripts/check-caption-style.mjs';
import {guardLegacyCaptionHandles} from '../scripts/compat/src/caption-compat.mjs';

function runCaptions(script, words) {
  const groups=captionGroups(words).map(g=>({words:g.map(w=>({handles:w.box?[{},{},{},{}]:[]}))}));
  for(const group of groups){
    for(const word of group.words)word.querySelectorAll=()=>word.handles;
    group.querySelector=s=>group.words[Number(s.match(/dvj-w(\d+)/)[1])];
  }
  const document={
    querySelector:s=>groups[Number(s.match(/dvj-g(\d+)/)[1])],
    querySelectorAll:s=>s.endsWith('.dvj-handle')?groups.flatMap(g=>g.words.flatMap(w=>w.handles)):
      s.endsWith('.dvj-word')?groups.flatMap(g=>g.words):groups,
  };
  const calls=[];
  const tl={set(target,vars,at){
    const nodes=typeof target==='string'?document.querySelectorAll(target):Array.isArray(target)?target:[target];
    assert.ok(nodes.length,'GSAP received an empty target');
    calls.push({nodes,vars,at});return tl;
  },to(target,vars,at){assert.ok(target);calls.push({nodes:[target],vars,at});return tl;}};
  runInNewContext(script,{document,tl,S:'#scope',T0:2});
  return calls;
}

for(const boxes of [[false,false,false],[false,true,false],[true,true,true]])test('subtítulos sin targets vacíos: '+boxes.join(','),()=>{
  const words=boxes.map((box,i)=>({text:['El','aire','protege.'][i],start:.1+i*.4,end:.35+i*.4,box}));
  const timing={timeBase:'global',duration:2,words};
  const p=addCaptions({scenes:[{id:'s',duration:2,customScene:{html:'<div></div>',css:'',script:''}}]},timing);
  const calls=runCaptions(p.scenes[0].customScene.script,words);
  assert.equal(calls.filter(c=>c.vars.display==='inline-block').length,3);
  assert.equal(calls.filter(c=>c.vars.visibility==='visible').length,boxes.filter(Boolean).length);
  assert.deepEqual(p.wordTimings.map(w=>[w.start,w.end]),words.map(w=>[w.start,w.end]));
  assert.deepEqual(checkCaptionStyle(p,timing),[]);
  // Recreate the exact legacy statements; old projects remain valid.
  const legacy=structuredClone(p);
  legacy.scenes[0].customScene.script=legacy.scenes[0].customScene.script.replace(
    /\{const handles=(document\.querySelectorAll\(S\+" \.dvj-handle"\)|(?:prev|n)\.querySelectorAll\("\.dvj-handle"\));if\(handles.length\)tl.set\(handles,(\{visibility:"(?:hidden|visible)"\}),(T0(?:\+a)?)\);\}/g,
    (_,target,vars,at)=>`tl.set(${target==='document.querySelectorAll(S+" .dvj-handle")'?'S+" .dvj-handle"':target},${vars},${at});`,
  );
  assert.notEqual(legacy.scenes[0].customScene.script,p.scenes[0].customScene.script);
  assert.deepEqual(checkCaptionStyle(legacy,timing),[]);
  runCaptions(guardLegacyCaptionHandles(legacy.scenes[0].customScene.script),words);
});

test('compatibilidad antigua conserva errores reales e idempotencia',()=>{
  const legacy='tl.set(S+" .dvj-handle",{visibility:"hidden"},T0);tl.set(".missing-actor",{x:1},T0);';
  const fixed=guardLegacyCaptionHandles(legacy);
  assert.match(fixed,/if\(handles.length\)/);
  assert.ok(fixed.includes('tl.set(".missing-actor",{x:1},T0);'));
  assert.equal(guardLegacyCaptionHandles(fixed),fixed);
});
