import test from 'node:test';
import assert from 'node:assert/strict';
import { spring, springTrack, smoothstep, cameraPath, contactArc, inspectMotion } from '../scripts/continuous-motion.mjs';

test('spring stays finite and settles without overshoot when critically damped', () => {
  assert.equal(spring(-1), 0);
  assert.ok(spring(0.5) > 0.9 && spring(0.5) < 1);
  assert.ok(Math.abs(spring(3) - 1) < 1e-10);
});

test('track supports multiple changes independent of seek order', () => {
  const f = springTrack(0, [{ time: 0.5, value: 100 }, { time: 2, value: 20 }]);
  const later = f(3);
  f(0.1); f(2.5); f(1.2);
  assert.equal(f(3), later);
  assert.equal(f(0), 0);
  assert.ok(Math.abs(f(5) - 20) < 1e-6);
});

test('smooth camera path has stable endpoints and predictable interpolation', () => {
  const f = cameraPath([{ time: 0, x: 0, y: 10, zoom: 1 }, { time: 2, x: 100, y: 30, zoom: 1.5 }]);
  assert.equal(smoothstep(0.5), 0.5);
  assert.equal(f(1).x, 50);
  assert.deepEqual(f(-4), { time: 0, x: 0, y: 10, zoom: 1 });
  assert.equal(f(8).zoom, 1.5);
});

test('contact arc lands exactly on each object and clears it in the middle', () => {
  const f = contactArc({ start: { x: 0, y: 100 }, end: { x: 200, y: 100 }, t0: 1, t1: 3, lift: 40 });
  assert.deepEqual(f(1), { x: 0, y: 100 });
  assert.deepEqual(f(2), { x: 100, y: 60 });
  assert.deepEqual(f(3), { x: 200, y: 100 });
});

test('motion inspection detects jumps and accepts smooth camera travel', () => {
  const camera = cameraPath([{ time: 0, x: 0, y: 0, zoom: 1 }, { time: 2, x: 100, y: 0, zoom: 1 }]);
  assert.equal(inspectMotion(camera, { end: 2, maxStep: 5 }).issues.length, 0);
  const jump = inspectMotion(t => ({ x: t < 1 ? 0 : 100, y: 0 }), { end: 2, maxStep: 5 });
  assert.ok(jump.issues.some(i => i.kind === 'large-step'));
});
