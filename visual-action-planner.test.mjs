import assert from 'node:assert/strict';
import test from 'node:test';
import {createVisualActionPlan, createVisualActionPlans, normalizeVisualActionPlan, visualActionProgress, visualCameraOffset} from './src/visual-action-planner.mjs';

const veniceScenes = [
  {id:'a', title:'Venecia sobre el canal', scriptExcerpt:'Venecia está construida sobre una laguna.', visualQuery:'panorámica del Gran Canal'},
  {id:'b', title:'La clave está debajo', scriptExcerpt:'La clave está debajo de sus calles.', visualQuery:'corte transversal de los cimientos'},
  {id:'c', title:'Pilotes de madera', scriptExcerpt:'Los constructores clavaron pilotes de madera en el barro.', visualQuery:'pilotes en el subsuelo'},
  {id:'d', title:'Madera sumergida', scriptExcerpt:'Sumergida y sin oxígeno, la madera se descompone lentamente.', visualQuery:'detalle de madera bajo el agua'},
  {id:'e', title:'Sube la marea', scriptExcerpt:'La marea alta puede inundar plazas y calles.', visualQuery:'agua subiendo por una calle'},
  {id:'f', title:'Barreras MOSE', scriptExcerpt:'Las barreras móviles MOSE cierran temporalmente la laguna.', visualQuery:'compuertas MOSE en movimiento'},
];

test('creates deterministic grounded plans with distinct camera/action per shot', () => {
  const project = {name:'Venecia', script:veniceScenes.map((scene) => scene.scriptExcerpt).join(' ')};
  const first = createVisualActionPlans(veniceScenes, project);
  const second = createVisualActionPlans(veniceScenes, project);
  assert.deepEqual(first, second);
  assert.deepEqual(first.map((plan) => plan.actionType), ['establish', 'descend', 'construct', 'inspect', 'rise', 'close']);
  assert.equal(new Set(first.map((plan) => plan.action)).size, first.length);
  assert.ok(first.every((plan, index) => plan.evidence === veniceScenes[index].scriptExcerpt));
  assert.ok(first.every((plan) => plan.action.length > 30 && plan.beats.length === 3));
});

test('ignores a custom action that has no lexical connection to its script evidence', () => {
  const plan = createVisualActionPlan({title:'Marea alta', scriptExcerpt:'La marea alta puede inundar la plaza.', visualPlan:'La cámara sigue a un astronauta por Marte.'}, {name:'Venecia'}, 0);
  assert.equal(plan.actionType, 'rise');
  assert.match(plan.action, /Acompaña el ascenso/);
  assert.doesNotMatch(plan.action, /astronauta|Marte/);
});

test('repeated script actions receive a distinct grounded composition', () => {
  const duplicateScenes = [0, 1, 2].map((index) => ({
    id:`repeat-${index}`, title:'La marea sube', scriptExcerpt:'La marea sube por la calle.',
    visualQuery:'marea alta en Venecia', motion:'push',
  }));
  const plans = createVisualActionPlans(duplicateScenes, {name:'Venecia'});
  assert.equal(new Set(plans.map((plan) => plan.action)).size, plans.length);
  assert.equal(plans[0].actionType, 'rise');
  assert.match(plans[1].action, /Toma 2/);
  assert.match(plans[2].action, /Toma 3/);
  assert.ok(plans.every((plan) => plan.beats[1].action === plan.action));
});

test('vague scripts get an explicit fallback without invented facts', () => {
  const plan = createVisualActionPlan({title:'Una idea', scriptExcerpt:''}, {}, 2);
  assert.equal(plan.confidence, 'fallback');
  assert.equal(plan.evidence, '');
  assert.equal(plan.subject, 'Una idea');
  assert.ok(!/\d/.test(plan.action));
});

test('normalizes hostile and out-of-range plan fields safely', () => {
  const normalized = normalizeVisualActionPlan({
    version:1, actionType:'rise', camera:'push', shotScale:'close', action:'  Subir\nagua  ', subject:' agua ',
    evidence:' guion ', confidence:'grounded', beats:[
      {at:-3, duration:50, action:' first '}, {at:2, duration:-1, action:'second'},
    ],
  }, {scriptExcerpt:'La marea sube.'}, {}, 0);
  assert.equal(normalized.action, 'Subir agua');
  assert.equal(normalized.beats.length, 2);
  assert.ok(normalized.beats.every((beat) => beat.at >= 0 && beat.at <= 1 && beat.duration > 0 && beat.at + beat.duration <= 1.001));
});

test('beats y cámara se calculan por fotograma dentro de límites de escena', () => {
  const plan = createVisualActionPlan(veniceScenes[0], {}, 0);
  assert.equal(visualActionProgress(plan, 0), 0);
  assert.equal(visualActionProgress(plan, .18), 0);
  assert.ok(visualActionProgress(plan, .5) > 0.4 && visualActionProgress(plan, .5) < 0.6);
  assert.equal(visualActionProgress(plan, 1), 1);
  assert.deepEqual(visualCameraOffset({camera:'push'}, 0, 60), {x:0,y:0,z:0});
  assert.ok(visualCameraOffset({camera:'push'}, 1, 60).z < 0);
  assert.ok(visualCameraOffset({camera:'rise'}, 1, 60).y < 0);
  assert.deepEqual(visualCameraOffset({camera:'pan-left'}, .5, 0), {x:0,y:0,z:0});
});
