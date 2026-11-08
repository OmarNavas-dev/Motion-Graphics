import test from 'node:test';
import assert from 'node:assert/strict';
import {createScene} from '../scripts/kits/scene-kit.mjs';
import {ocean,sanctuary,sealedDocument,scriptureBook,storyPlate,channelEndCard} from '../scripts/kits/story-kit.mjs';

test('seis recursos narrativos generan escenas sanitizadas y scripts ejecutables',()=>{
  const builders=[
    (s)=>ocean(s,{at:1,duration:2}),
    (s)=>sanctuary(s),
    (s)=>sealedDocument(s,{heading:'Año 35',at:2}),
    (s)=>scriptureBook(s,{chapter:'LUCAS',verse:'23,43',at:2}),
    (s)=>storyPlate(s,{label:'DÍA',value:'35',at:1}),
    (s)=>channelEndCard(s,{channel:'Mi canal',teaser:'PARTE 2',at:1}),
  ];
  for(let i=0;i<builders.length;i++){
    const s=createScene({id:'story-'+i,duration:5});builders[i](s);
    const out=s.build({scriptExcerpt:'Prueba narrativa.'});
    assert.match(out.customScene.html,/<svg/);
    assert.ok(out.customScene.html.length>500);
    for(const m of out.customScene.script.matchAll(/S\+' \.([\w-]+)'/g)){
      assert.ok(out.customScene.html.includes(`class="${m[1]}"`)||new RegExp(`class="[^"]*\\b${m[1]}\\b`).test(out.customScene.html),`Selector sin nodo: ${m[1]}`);
    }
  }
});

test('escapa datos de texto y rechaza geometría no válida',()=>{
  const s=createScene({id:'safe-story',duration:5});
  sealedDocument(s,{heading:'<script>alert(1)</script>',seal:'&'});
  const built=s.build({scriptExcerpt:'Prueba.'});
  assert.ok(!built.customScene.html.includes('<script>'));
  assert.match(built.customScene.html,/&lt;script&gt;/);
  assert.throws(()=>storyPlate(s,{label:'A',value:2,w:2}),/Placa inválida/);
  assert.throws(()=>ocean(s,{horizon:-1}),/inválidos/);
});
