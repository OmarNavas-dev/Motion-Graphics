import test from 'node:test';
import assert from 'node:assert/strict';
import {buildVeniceGeometry} from './src/canvas-3d-engine.mjs';

test('el renderer Canvas produce mallas 3D finitas y deterministas', () => {
  const first = buildVeniceGeometry('foundation', 24);
  const second = buildVeniceGeometry('foundation', 24);
  assert.deepEqual(first, second);
  assert.ok(first.length > 150);
  assert.ok(first.every(({points}) => points.length >= 3 && points.flat().every(Number.isFinite)));
});

test('los cinco diagramas Canvas exponen geometrías distintas', () => {
  const tags = (detail) => new Set(buildVeniceGeometry(detail, 18).map((face) => face.tag));
  assert.ok(tags('foundation').has('pilote'));
  assert.ok(tags('timber').has('corte de madera'));
  assert.ok(tags('load').has('carga'));
  assert.ok(tags('tide').has('mareometro'));
  assert.ok(tags('mose').has('compuerta MOSE'));
  assert.ok(tags('city').has('gondola'));
});

test('la composición cambia según el verbo, no solo según el tema Venecia', () => {
  const plan = (actionType) => ({actionType, beats:[{at:0,duration:.18,action:'Abre.'},{at:.18,duration:.64,action:'Actúa.'},{at:.82,duration:.18,action:'Cierra.'}]});
  const shot = (detail, actionType) => buildVeniceGeometry(detail, 18, plan(actionType), .6);
  const buildings = (detail, actionType) => shot(detail, actionType).filter((face)=>face.tag==='edificio').length;
  assert.ok(buildings('city', 'establish') > buildings('foundation', 'construct'));
  assert.ok(buildings('tide', 'compare') > buildings('foundation', 'construct'));
  assert.equal(shot('foundation', 'construct').some((face)=>face.tag==='gondola'), false);
  assert.ok(shot('city', 'establish').some((face)=>face.tag==='gondola'));
  assert.ok(shot('tide', 'rise').some((face)=>face.tag==='marca nivel'));
  assert.ok(shot('mose', 'close').some((face)=>face.tag==='góndola'));
  assert.ok(shot('foundation', 'construct').some((face)=>face.tag==='suelo firme'));
  assert.ok(shot('tide', 'rise').some((face)=>face.tag==='edificio mareado'));
  assert.notDeepEqual(shot('tide', 'rise').filter((face)=>face.tag==='edificio mareado'),
    buildVeniceGeometry('tide', 18, plan('rise'), .1).filter((face)=>face.tag==='edificio mareado'));
});

test('la superficie del agua cambia con el frame de Remotion', () => {
  const yAt = (frame) => buildVeniceGeometry('tide', frame).find((face) => face.tag === 'agua').points[0][1];
  assert.notEqual(yAt(0), yAt(10));
});

test('el plan de acción anima pilotes, marea y compuertas durante la escena', () => {
  const plan = (actionType) => ({actionType, beats:[
    {at:0,duration:.18,action:'Establece el plano.'},
    {at:.18,duration:.64,action:'Ejecuta la acción.'},
    {at:.82,duration:.18,action:'Sostén el resultado.'},
  ]});
  const start = (detail, actionType) => buildVeniceGeometry(detail, 0, plan(actionType), 0);
  const finish = (detail, actionType) => buildVeniceGeometry(detail, 23, plan(actionType), 1);
  assert.notDeepEqual(start('foundation', 'construct').filter((face)=>face.tag==='pilote'),
    finish('foundation', 'construct').filter((face)=>face.tag==='pilote'));
  const startWater = start('tide', 'rise').find((face)=>face.tag==='agua').points[0][1];
  const finishWater = finish('tide', 'rise').find((face)=>face.tag==='agua').points[0][1];
  assert.notEqual(startWater, finishWater);
  assert.notDeepEqual(start('mose', 'close').filter((face)=>face.tag==='compuerta MOSE'),
    finish('mose', 'close').filter((face)=>face.tag==='compuerta MOSE'));
});
