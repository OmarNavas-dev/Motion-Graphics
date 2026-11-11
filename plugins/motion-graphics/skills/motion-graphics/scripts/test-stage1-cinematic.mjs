import assert from 'node:assert/strict';
import {auditCinematicComposition} from './audit-cinematic-composition.mjs';

const scene = i => {
  const duration = 6 + i;
  return {
    id: 'evento-' + i,
    duration,
    direction: {
      actions: [{
        at: 0.5,
        duration: duration - 1,
        description: 'La pieza ' + i + ' se aproxima, establece contacto y transforma el mecanismo con un resultado visible.',
      }],
      shots: [
        {scale: i % 2 ? 'wide' : 'medium', at: 0, duration: 2 + i * 0.2, x: i * 2, y: 0},
        {scale: i % 2 ? 'medium' : 'detail', at: 2 + i * 0.2,
          duration: duration - 2 - i * 0.2, x: i * 12, y: i * 3},
      ],
    },
    customScene: {css: '.dvj-caption{font:500 55px/1.25 Inter,sans-serif;}'},
  };
};
const good = {scenes: Array.from({length: 6}, (_, i) => scene(i))};
assert.equal(auditCinematicComposition(good).pass, true, 'Planos distintos y acciones concretas deben pasar.');

const bad = structuredClone(good);
for (const s of bad.scenes) {
  s.direction.actions[0].description = 'Cambio verificable en elemento';
  s.direction.shots = [
    {scale: 'medium', at: 0, duration: s.duration * 0.58, x: 0, y: 0},
    {scale: 'close', at: s.duration * 0.58, duration: s.duration * 0.42, x: 8, y: 0},
  ];
  s.customScene.css = '.dvj-caption{font:500 32.4px/1.25 Inter,sans-serif;}';
}
const rejected = auditCinematicComposition(bad);
assert.equal(rejected.pass, false, 'Una generación repetitiva no puede aprobar la etapa 1.');
assert(rejected.issues.some(issue => issue.code === 'REPEATED_CAMERA_TEMPLATE'));
assert(rejected.issues.some(issue => issue.code === 'PLACEHOLDER_ACTION_DESCRIPTION'));
assert(rejected.issues.some(issue => issue.code === 'SMALL_PROGRESSIVE_CAPTIONS'));

const hold = structuredClone(good);
hold.scenes[0].direction.actions[0].duration = 0.5;
assert(auditCinematicComposition(hold).issues.some(issue => issue.code === 'EARLY_ACTION_END'));
hold.scenes[0].direction.intentionalHoldReason = 'Pausa de contemplación con el objeto completo visible tras el mecanismo.';
assert(!auditCinematicComposition(hold).issues.some(issue => issue.code === 'EARLY_ACTION_END'));

console.log('PASS: variedad de cámara, acciones concretas, subtítulos y pausas narrativas auditados.');
