import test from 'node:test';
import assert from 'node:assert/strict';
import {createExplainer} from '../scripts/explainer-kit.mjs';
import {compileMotionSequence,resolveNarrationCue,separateSvgPlacement,checkNarrationBindings} from '../scripts/compat/src/motion-sequence.mjs';
import {assembleScenes} from '../scripts/assemble-scenes.mjs';
const words=[{text:'La',start:0,end:.2},{text:'hoja',start:.3,end:.6},{text:'toca',start:1.5,end:1.8},{text:'la',start:1.8,end:2},{text:'mesa.',start:2,end:2.5}];
const motion=compileMotionSequence({selector:'.paper',from:{y:-100},beats:[{phase:'contact',duration:.6,to:{y:0}},{phase:'hold',duration:.3}]},3);
test('ancla el contacto a la palabra, no solo el comienzo de una animacion',()=>{
 const cue=resolveNarrationCue({words,phrase:'toca',sceneStart:0,phase:'contact'},motion);
 assert.equal(cue.at,.9);assert.equal(cue.at+cue.narration.offset,1.5);
 assert.throws(()=>resolveNarrationCue({words,phrase:'toca',sceneStart:1.3,phase:'contact'},motion),/antes de esta escena/);
 assert.throws(()=>resolveNarrationCue({words:[...words,...words],phrase:'toca',sceneStart:0,phase:'contact'},motion),/repetida/);
});
test('conserva traslacion y espejo en padre fijo, sin alterar articulaciones por atributo',()=>{
 const html='<svg><g class="hand" transform="translate(600 800) scale(-1 1)"><g class="finger" transform="rotate(12)"><path d="M0 0L10 10"/></g></g></svg>';
 const fixed=separateSvgPlacement(html,['.hand']);
 assert.match(fixed,/<g data-dvj-placement="hand" transform="translate\(600 800\) scale\(-1 1\)"><g class="hand"\s*>/);
 assert.ok(fixed.includes('<g class="finger" transform="rotate(12)">'));
 assert.equal(separateSvgPlacement(fixed,['.hand']),fixed);
 assert.equal((fixed.match(/<g\b/g)||[]).length,(fixed.match(/<\/g>/g)||[]).length);
});
test('el constructor y ambos importadores conservan el anclaje y la geometria corregida',()=>{
 const p=createExplainer([{id:'paper'}]),s=p.scene({id:'scene',duration:3},{objective:'Contacto',holdReason:'Leer el resultado'});
 s.add('fg','<g class="paper" transform="translate(247 920)"><rect width="226" height="120"/></g>');
 s.narratedSequence({id:'place',actor:'paper',selector:'.paper',description:'Baja',result:'Toca la mesa'},{from:{y:-100},beats:[{phase:'contact',duration:.6,to:{y:0}},{phase:'hold',duration:.3}]},{words,phrase:'toca',sceneStart:0,phase:'contact'});
 const result=assembleScenes({actors:p.actors,wordTimings:words,showText:false},[s.build({scriptExcerpt:'La hoja toca la mesa.'})]);
 assert.ok(result.scenes[0].customScene.html.includes('data-dvj-placement="paper"'));
 assert.deepEqual(checkNarrationBindings(result),[]);
 result.scenes[0].direction.actions[0].at+=.4;
 assert.match(checkNarrationBindings(result)[0],/accion a/);
});
test('grupos autocerrados y atributos data-transform no confunden el separador',()=>{
 assert.equal(separateSvgPlacement('<svg><g class="a" data-transform="x"/></svg>',['.a']),'<svg><g class="a" data-transform="x"/></svg>');
 const fixed=separateSvgPlacement('<svg><g id="a" transform="translate(4 5)"/><g></g></svg>',['#a']);
 assert.ok(fixed.endsWith('</g><g></g></svg>'));
});
