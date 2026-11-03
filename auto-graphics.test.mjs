import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestMotionGraphics, timedStoryboardBlocks} from './src/auto-graphics.mjs';

const budget = `(0:00) ¿Sabes a dónde se va tu dinero? Probemos un presupuesto de mil dólares al mes.
(0:06) Quinientos para necesidades: vivienda, comida y transporte.
(0:12) Trescientos para gustos: ocio, salidas y compras.
(0:18) Doscientos para ahorro y pagos de deudas.
(0:24) Es la regla cincuenta, treinta, veinte. Adáptala a tus gastos reales.`;

test('detecta contadores, barras, iconos y resumen circular en presupuesto', () => {
  const blocks = timedStoryboardBlocks(budget, 22, false);
  assert.equal(blocks.length, 5);
  assert.equal(Math.round(blocks.reduce((sum, item) => sum + item.duration, 0)), 30);
  const graphics = blocks.map((block) => suggestMotionGraphics({text: block.text, script: budget,
    duration: block.duration, style: 'modern', showText: true}));
  assert.equal(graphics[0][0].kind, 'counter');
  assert.equal(graphics[0][0].value, 1000);
  assert.equal(graphics[1][0].kind, 'bar');
  assert.equal(graphics[1][0].value, 500);
  assert.equal(graphics[1][0].maxValue, 1000);
  assert.deepEqual(graphics[1].slice(1).map((item) => item.icon), ['home', 'food', 'transport']);
  assert.equal(graphics[2][0].value, 300);
  assert.equal(graphics[3][0].value, 200);
  assert.equal(graphics[4][0].kind, 'donut');
  assert.deepEqual(graphics[4][0].segments.map((item) => item.value), [50, 30, 20]);
});

test('usa la duración del MP3 y no elimina la quinta escena', () => {
  const blocks = timedStoryboardBlocks(budget, 21, true);
  assert.equal(blocks.length, 5);
  assert.ok(Math.abs(blocks.reduce((sum, item) => sum + item.duration, 0) - 21) < 0.01);
});

test('no impone gráficos en narración de terror ni relatos infantiles sin datos', () => {
  const horror = 'Eran las dos de la madrugada. Escuché tres golpes debajo de la cama.';
  assert.deepEqual(suggestMotionGraphics({text: horror, script: horror, duration: 6,
    style: 'horror', showText: false}), []);
  const bible = 'Antonio tenía ocho años y miró al anciano junto al árbol.';
  assert.deepEqual(suggestMotionGraphics({text: bible, script: bible, duration: 6,
    style: 'watercolor', showText: false}), []);
});

test('permite porcentajes explícitos y desactiva los gráficos si no se muestran textos', () => {
  assert.equal(suggestMotionGraphics({text: 'Las ventas aumentaron 42% este mes.',
    script: 'Resultados de ventas', duration: 5, style: 'modern'})[0].value, 42);
  assert.deepEqual(suggestMotionGraphics({text: 'Las ventas aumentaron 42%',
    script: 'Ventas', duration: 5, style: 'modern', showText: false}), []);
});
