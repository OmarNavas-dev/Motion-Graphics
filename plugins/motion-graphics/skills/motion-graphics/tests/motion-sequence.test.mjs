import test from 'node:test';
import assert from 'node:assert/strict';
import {compileMotionSequence} from '../scripts/compat/src/motion-sequence.mjs';
import {checkRichness} from '../scripts/check-motion-richness.mjs';
import {project} from './fixtures/movimiento-transversal.mjs';
import {validateProject} from '../scripts/compat/server-utils.mjs';
import {createExplainer} from '../scripts/explainer-kit.mjs';
test('un plano fijo no inserta camara ni exige coordenadas de un zoom',()=>{
 const p=createExplainer([{id:'object'}]);const s=p.scene({id:'still',duration:2},{objective:'Leer el resultado',holdReason:'Pausa'});
 s.add('fg','<circle cx="360" cy="700" r="50"/>');
 s.shot({at:0,duration:2,target:'Resultado',purpose:'Leer sin movimiento',fixed:true});
 const r=s.build({scriptExcerpt:''});assert.equal(r.direction.shots[0].fixed,true);assert.ok(!r.customScene.script.includes('.L-bg'));
});
test('fases conservan tiempos, pivotes y estados para cualquier geometria',()=>{
 const r=compileMotionSequence({selector:'.arm .hand',at:.3,from:{rotation:0,svgOrigin:'4 8'},beats:[{phase:'anticipation',duration:.2,to:{rotation:-12}},{phase:'action',duration:.5,to:{rotation:45}},{phase:'hold',duration:.4},{phase:'settle',duration:.3,to:{rotation:40}}]},2);
 assert.equal(r.duration,1.4);assert.deepEqual(r.checkpoints.map(p=>p.at),[0,.2,.7,1.1,1.4]);
 assert.equal(r.checkpoints.at(-1).state.rotation,40);assert.ok(r.tweens.includes('T0+1.4'));assert.ok(!JSON.stringify(r.checkpoints).includes('svgOrigin'));
});
test('revelaciones admiten atributos SVG sin limitarse a transform y opacity',()=>{
 const r=compileMotionSequence({selector:'.clip',from:{attr:{width:0}},beats:[{duration:1,to:{attr:{width:440}},ease:'none'}]},2);
 assert.equal(r.checkpoints.at(-1).state.attr.width,440);
 assert.throws(()=>compileMotionSequence({selector:'.clip',from:{attr:{onload:'run()'}},beats:[{duration:1,to:{attr:{width:20}}}]},2),/atributo/);
});
test('rechaza desbordes, estados iniciales ausentes y pausas accidentales',()=>{
 const p={selector:'.thing',at:.8,from:{x:0},beats:[{duration:.3,to:{x:100}}]};
 assert.throws(()=>compileMotionSequence(p,1),/exceden/);
 assert.throws(()=>compileMotionSequence({...p,at:0,beats:[{duration:.3,to:{y:100}}]},1),/inicial/);
 assert.throws(()=>compileMotionSequence({...p,at:0,beats:[{duration:.3,to:{x:0}}]},1),/sin cambio/);
});
test('ocho dominios conservan codigo y comprobaciones tras guardar e importar',()=>{
 const p=validateProject(project);assert.deepEqual(validateProject(p),p);assert.equal(p.scenes.length,8);
 p.scenes.forEach((s,i)=>{assert.deepEqual(s.customScene,project.scenes[i].customScene);assert.ok(s.direction.actions.every(a=>a.checkpoints.length>=2));});
});
test('el inventario no penaliza una escena limpia ni premia adornos',()=>{
 const s={id:'quiet',duration:3,direction:{actions:[],holdReason:'Leer una cifra'},customScene:{html:'<div>Una idea</div>',script:''}};
 assert.equal(checkRichness({scenes:[s]}).needsReview,0);assert.deepEqual(checkRichness({scenes:[s]}).scenes[0].issues,[]);
 assert.equal(checkRichness({scenes:[{...s,direction:{actions:[{id:'fake'}]},customScene:{html:'<pattern/><filter/>',script:'tl.to(x,{});'.repeat(100)}}]}).needsReview,1);
});
