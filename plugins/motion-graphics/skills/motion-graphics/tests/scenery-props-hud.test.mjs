import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import * as K from '../scripts/kits/index.mjs';
import {checkEditorialOverlays} from '../scripts/check-editorial-overlays.mjs';
import demo from '../examples/formatos-referencia.mjs';

const compile = (s) => { const r = s.render(); new vm.Script(`(function(tl,S,T0,D,gsap){${r.script}\n})`); return r; };
const UUID = '0123456789abcdef0123456789abcdef0123';

test('las siete escenas de ejemplo compilan, pasan el sanitizador y no usan azar ni relojes', () => {
  assert.equal(demo.length, 7);
  for (const sc of demo) {
    new vm.Script(`(function(tl,S,T0,D,gsap){${sc.customScene.script}\n})`);
    assert.ok(!/Math\.random|Date\.now|requestAnimationFrame|setTimeout|\bimport\b/.test(sc.customScene.script), sc.id);
    assert.ok(sc.customScene.html.length < 150000 && sc.customScene.script.length < 100000, sc.id + ' dentro del presupuesto');
  }
});

test('el mismo codigo produce exactamente el mismo JSON (determinismo)', async () => {
  const a = JSON.stringify((await import('../examples/formatos-referencia.mjs?a')).default);
  const b = JSON.stringify((await import('../examples/formatos-referencia.mjs?b')).default);
  assert.equal(a, b);
});

test('el ejemplo no contiene pies editoriales ni numeracion de escenas', () => {
  assert.deepEqual(checkEditorialOverlays({scenes: demo}), []);
});

test('instancias repetidas usan clases distintas y los desbordes de tiempo se rechazan', () => {
  const s = K.createScene({id: 'dup', duration: 4});
  const a = K.candle(s, {x: 100, y: 500}), b = K.candle(s, {x: 200, y: 500});
  assert.notEqual(a.cls, b.cls);
  assert.throws(() => K.sceneryOcean(K.createScene({id: 'ov', duration: 3}), {at: 2, dur: 5}), /dur|termina|escena/i);
  assert.throws(() => K.chip(s, {x: 1, y: 300, big: '1', at: 3.9, dur: .3}), /termina|escena/);
  assert.throws(() => K.chip(s, {x: 1, y: 300}), /big/);
  assert.throws(() => K.stamp(s, {}), /text/);
  assert.throws(() => K.skyCycle(s, {from: 'cielo'}), /from\/to/);
});

test('el cierre exige identidad aportada por el usuario y no inventa marcas', () => {
  const s = K.createScene({id: 'end', duration: 5});
  assert.throws(() => K.endCard(s, {}), /no inventa/);
  assert.throws(() => K.endCard(s, {logo: ['X']}), /name/);
  K.endCard(s, {logo: ['MI', 'CANAL'], name: 'Canal de prueba', part: 'PARTE 2', pill: 'Parte 1 de 2'});
  const r = compile(s);
  assert.ok(r.html.includes('Canal de prueba') && r.html.includes('PARTE 2'));
  assert.deepEqual(checkEditorialOverlays({scenes: [{id: 'end', customScene: r}]}), []);
});

test('la foto solo acepta recursos user-assets con UUID y pasa el sanitizador', () => {
  const s = K.createScene({id: 'ph', duration: 4});
  for (const bad of ['', 'https://x.com/a.jpg', 'user-assets/foto.jpg', '/user-assets/' + UUID + '.jpg', 'user-assets/' + UUID + '.gif']) assert.throws(() => K.photo(s, {asset: bad}), /asset/);
  K.photo(s, {asset: `user-assets/${UUID}.jpg`, caption: 'Archivo'});
  const out = s.build({title: 'foto', scriptExcerpt: 'x'});
  assert.ok(out.customScene.html.includes(`user-assets/${UUID}.jpg`));
});

test('la nave expone una proyeccion en perspectiva coherente', () => {
  const s = K.createScene({id: 'nv', duration: 4});
  const nv = K.nave(s, {});
  assert.deepEqual(nv.pt(0, 360, 4), [360, 650]);
  const [x1] = nv.pt(-210, 0, 1.5), [x2] = nv.pt(-210, 0, 3);
  assert.ok(x2 > x1, 'lo lejano converge hacia el punto de fuga');
  compile(s);
});

test('el sello de lacre, el pergamino y el libro devuelven anclas para componer', () => {
  const s = K.createScene({id: 'pp', duration: 6});
  const p = K.parchment(s, {title: 'TITULO', signature: 'Firma de prueba'});
  assert.ok(p.sealY > p.signY && p.sealX > 0);
  K.waxSeal(s, {x: p.sealX, y: p.sealY, emblem: 'star'});
  const b = K.openBook(K.createScene({id: 'bk', duration: 5}), {verse: ['«Linea uno', 'linea dos».']});
  assert.ok(b.verseY > 0 && b.rightPage.length === 4);
  assert.throws(() => K.openBook(K.createScene({id: 'bk2', duration: 2}), {hlAt: 1.9, hlDur: .8}), /termina|escena/);
  compile(s);
});

test('el ojo entrega puntos de camara y el anillo se dibuja con trazo animable', () => {
  const s = K.createScene({id: 'ey', duration: 5});
  const e = K.eye(s, {});
  assert.equal(e.center.length, 2); assert.ok(e.target[1] > e.pupil[1]);
  assert.ok(compile(s).html.includes('stroke-dashoffset'));
});

test('la camara no sube el arte hacia la zona de titulo y subtitulo (safeTop)', () => {
  const ys = (opts) => {
    const s = K.createScene({id: 'cam' + (opts.safeTop ?? 'd'), duration: 5});
    K.camera(s, opts).move(.2, 3, {k: 1.4, focus: [360, 900]});
    return [...s.render().script.matchAll(/y:(-?[\d.]+),scale:([\d.]+)/g)].map(m => ({y: +m[1], k: +m[2]}));
  };
  for (const {y, k} of ys({})) assert.ok(y >= -(k - 1) * 330 - 1e-6, `y=${y} k=${k}`);
  assert.ok(ys({safeTop: 0}).some(({y, k}) => y < -(k - 1) * 330 - 1), 'sin guarda si se desactiva');
});

test('las placas y medidores aceptan estados finales exactos y se ocultan al inicio', () => {
  const s = K.createScene({id: 'hud', duration: 6});
  K.chapterBadge(s, {n: 2, label: 'La comida'}); K.meterBar(s, {from: .6, to: .2, at: 1, dur: 5});
  K.heartRate(s, {x: 400, y: 300, bpm: 150}); K.stopwatch(s, {x: 200, y: 300, fromSec: 3, toSec: 0, steps: 4, dur: 2});
  const r = compile(s);
  assert.ok(r.css.includes('opacity:0'));
  assert.throws(() => K.heartRate(s, {x: 1, y: 1}), /bpm/);
  assert.throws(() => K.chapterBadge(s, {}), /label/);
});
