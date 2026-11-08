import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createExplainer} from '../scripts/explainer-kit.mjs';
import {assembleScenes} from '../scripts/assemble-scenes.mjs';
import {checkProject} from '../scripts/validate-project.mjs';
import scenes,{projectBase} from '../examples/elasticidad-explicativa.mjs';

test('ejemplo completo conserva actores, fichas, duración y excepción explícita sin texto',async()=>{
  const project=assembleScenes(projectBase,scenes);
  const result=await checkProject(project,{duration:8});assert.equal(result.ok,true,result.errors.join('\n'));
  assert.equal(project.actors.length,2);assert.equal(project.scenes[0].direction.after.ball,project.scenes[1].direction.before.ball);
  assert.ok(project.scenes[0].customScene.script.includes('.ball-move'));
});
test('rechaza acción fuera de tiempo, actor desconocido y atributos ejecutables',()=>{
  const p=createExplainer([{id:'ball',initialState:'arriba'}]);
  const scene=p.scene({id:'one',duration:2},{objective:'Contacto',before:{ball:'arriba'},after:{ball:'abajo'}});
  const action={id:'drop',actor:'ball',at:1,duration:2,description:'Cae',result:'Toca',selector:'.ball'};
  assert.throws(()=>scene.action(action,{from:{y:0},to:{y:10}}),/intervalo/);
  assert.throws(()=>scene.action({...action,actor:'ghost'},{from:{y:0},to:{y:10}}),/registrado/);
  assert.throws(()=>scene.action({...action,at:0,duration:1},{from:{y:0},to:{attr:{onload:'x'}}}),/Atributo/);
});
test('exige continuidad o una transición explicada, sin cambiarla silenciosamente',()=>{
  const p=createExplainer([{id:'ball',initialState:'arriba'}]);
  const s=p.scene({id:'one',duration:2},{objective:'Leer',before:{ball:'otro'},after:{ball:'otro'},holdReason:'Pausa'});
  s.add('fg','<circle r="20"/>');assert.throws(()=>s.build({scriptExcerpt:''}),/discontinuo/);
});
