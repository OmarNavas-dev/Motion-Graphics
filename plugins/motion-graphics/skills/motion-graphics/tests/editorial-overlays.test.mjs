import test from 'node:test';
import assert from 'node:assert/strict';
import {checkEditorialOverlays} from '../scripts/check-editorial-overlays.mjs';
const project = html => ({scenes: [{id:'escena-01', customScene:{html:`<svg viewBox="0 0 720 1280">${html}</svg>`}}]});
test('rejects the reported footer and a renamed editorial footer', () => {
  for (const title of ['ARCHIVO DE UNA INVENCIÓN', 'HISTORIAS DEL MUNDO']) {
    assert.equal(checkEditorialOverlays(project(`<path d="M50 1185H670"/><text y="1220" font-size="13">${title}</text><text y="1220" font-size="13">01 / 16</text>`)).length, 1);
  }
});
test('preserves captions, dates and counters explaining the story', () => {
  assert.deepEqual(checkEditorialOverlays(project('<text y="300" font-size="48">1957</text><text y="1040" font-size="20">PRESIÓN</text><text y="1120" font-size="32">1 / 16</text><div class="dvj-caption">Una nueva idea</div>')), []);
});
test('detects annotated HTML footers without touching blank HUD layers', () => {
  assert.equal(checkEditorialOverlays(project('<div class="editorial-footer">Serie</div>')).length, 1);
  assert.deepEqual(checkEditorialOverlays(project('<g class="L-hud"></g>')), []);
});
