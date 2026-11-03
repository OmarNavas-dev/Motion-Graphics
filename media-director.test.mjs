import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assignReferenceImages,directMediaScene} from './src/media-director.mjs';

test('imagen infantil llena el lienzo sin recortar su contenido por defecto',()=>{
  const directed=directMediaScene({title:'¿Sabías que tu cuerpo tiene un ejército de superhéroes diminutos?',
    scriptExcerpt:'Los glóbulos blancos nos protegen de las bacterias.'},
  {style:'playful',showText:true,name:'Defensas'});
  assert.equal(directed.fit,'contain');
  assert.equal(directed.headline,'DEFENSAS AL RESCATE');
  assert.equal(directed.showText,true);
});

test('encuadre explícito respeta la elección del usuario y el tema no impone un estilo',()=>{
  const directed=directMediaScene({title:'Una mujer caminaba por el río',style:'horror',imageFit:'cover'},
    {style:'modern',showText:false,name:'Terror'});
  assert.equal(directed.style,'horror');
  assert.equal(directed.fit,'cover');
  assert.equal(directed.showText,false);
});

test('distribuye referencias solo entre escenas vacías sin pisar imágenes ni clips',()=>{
  const scenes=[{id:'1',imageAsset:'propia.png',approved:true},
    {id:'2',imageAsset:'',approved:true},
    {id:'3',imageAsset:'',videoAsset:'clip.mp4',approved:true},
    {id:'4',imageAsset:'',approved:true},
    {id:'5',imageAsset:'',approved:true}];
  const mapped=assignReferenceImages(scenes,['ref1.jpg','ref2.jpg']);
  assert.equal(mapped[0],scenes[0]);
  assert.equal(mapped[1].imageAsset,'ref1.jpg');
  assert.equal(mapped[1].approved,false);
  assert.equal(mapped[2],scenes[2]);
  assert.equal(mapped[3].imageAsset,'ref2.jpg');
  assert.equal(mapped[4],scenes[4]);
  assert.equal(scenes[1].imageAsset,'');
});

test('no reasigna una referencia ya utilizada en otra escena',()=>{
  const mapped=assignReferenceImages([
    {id:'1',imageAsset:'ref1.png'},
    {id:'2',imageAsset:''}],['ref1.png','ref2.png']);
  assert.equal(mapped[1].imageAsset,'ref2.png');
});
