import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBeats} from '../scripts/validate-beats.mjs';

test('ficha de acciones de dos escenas con puente pasa',()=>{
 const r=validateBeats({duration:8,beats:[
  {id:'a',scene:'one',at:0.2,visual:'se abre la puerta',cause:'mano empuja',effect:'entra luz',subject:'puerta'},
  {id:'b',scene:'two',at:4,visual:'la luz ilumina el libro',cause:'apertura',effect:'texto visible',subject:'rayo de luz',bridge:'seguir el mismo rayo'}
 ]});assert.equal(r.ok,true);assert.equal(r.warnings.length,0);
});

test('rechaza beats sin acción, duplicados, fuera de tiempo y lecturas fuera del video',()=>{
 const r=validateBeats({duration:5,beats:[
  {id:'same',scene:'s',at:1,subject:'objeto',visual:'gira',cause:'fuerza',effect:'se desplaza'},
  {id:'same',scene:'s',at:4.8,subject:'objeto',visual:'',cause:'fuerza',effect:'',hold:1}
 ]});assert.equal(r.ok,false);assert.ok(r.errors.length>=3);
});
