import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateProject, sanitizeCustomScene} from './server-utils.mjs';
import {exportHyperframesProject} from './src/hyperframes-bridge.mjs';
import {plannerFixture} from './scripts/ai-planner-fixture.mjs';

const base = (customScene) => ({name: 'T', format: 'vertical', palette: 'aurora', audioAsset: '', musicAsset: '',
  narrationMode: 'single', voiceClips: [], references: [],
  scenes: [{id: 'a', layout: 'hero', duration: 4, title: 'x', subtitle: '', imageAsset: '', cues: [], approved: true, customScene}]});

test('una escena HTML a medida se conserva y sustituye la plantilla', () => {
  const project = validateProject(base({html: '<div class="x">Hola</div>', css: '__SCENE__ .x{color:red}',
    script: "tl.from(S+' .x',{opacity:0,duration:.5},T0+.2);"}));
  const html = exportHyperframesProject(project, undefined, 'window.gsapStub=1;', {});
  assert.match(html, /<div class="x">Hola<\/div>/);
  assert.match(html, /#hf-scene-0 \.x\{color:red\}/);
  assert.match(html, /\(function\(tl,S,T0,D,gsap\)/);
  assert.doesNotMatch(html, /class="headline"/);
});

test('__IMAGE__ se sustituye por la imagen importada de la escena', () => {
  const raw = base({html: '<img src="__IMAGE__" alt="">'});
  raw.scenes[0].imageAsset = 'user-assets/12345678-1234-1234-1234-123456789abc.png';
  const html = exportHyperframesProject(validateProject(raw), undefined, '', {'user-assets/12345678-1234-1234-1234-123456789abc.png': 'assets/foto.png'});
  assert.match(html, /<img src="assets\/foto\.png"/);
});

test('las escenas sin customScene siguen usando la plantilla', () => {
  const html = exportHyperframesProject(validateProject(base(undefined)), undefined, '', {});
  assert.match(html, /class="headline"/);
});

test('se rechazan scripts, eventos y recursos externos en el HTML', () => {
  for (const html of ['<script>1</script>', '<div onclick="x()">a</div>', '<iframe src="x"></iframe>',
    '<img src="https://evil.test/a.png">', '<a href="javascript:alert(1)">a</a>']) {
    assert.throws(() => sanitizeCustomScene({html}, 1), undefined, html);
  }
  assert.throws(() => sanitizeCustomScene({html: '<p>a</p>', css: '@import url(x.css);'}, 1));
  assert.throws(() => sanitizeCustomScene({html: '<p>a</p>', css: 'a{background:url(https://x.test/a.png)}'}, 1));
});

test('permite Canvas procedural con actualización determinista por GSAP', () => {
  const raw = base({html: '<canvas class="canvas" width="720" height="1280"></canvas>', css: '__SCENE__ .canvas{width:100%}', script: "const c=document.querySelector(S+' .canvas'),ctx=c.getContext('2d'),p={t:0};tl.to(p,{t:D,duration:D,ease:'none',onUpdate:()=>ctx.fillRect(0,0,p.t,1)},T0);"});
  const project = validateProject(raw);
  const html = exportHyperframesProject(project, undefined, 'window.gsapStub=1;', {});
  assert.match(html, /canvas class="canvas"/);
  assert.match(html, /onUpdate/);
});

test('se permite el espacio de nombres SVG', () => {
  assert.ok(sanitizeCustomScene({html: '<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>'}, 1));
});

test('el script debe ser determinista y sin red', () => {
  for (const script of ['fetch("x")', 'Math.random()', 'setTimeout(()=>1,5)', 'new Date()', 'eval("1")',
    'localStorage.a=1', 'requestAnimationFrame(()=>1)', 'import("x")']) {
    assert.throws(() => sanitizeCustomScene({html: '<p>a</p>', script}, 1), undefined, script);
  }
  assert.ok(sanitizeCustomScene({html: '<p>a</p>', script: "tl.to(S+' p',{x:20,duration:1},T0);"}, 1));
});

test('los límites de tamaño se aplican', () => {
  assert.throws(() => sanitizeCustomScene({html: 'a'.repeat(30001)}, 1));
});

test('valida escena HTML a medida aislada y la exporta con duración correcta', () => {
  const project = validateProject(base({html:'<div class="hero">Escena personalizada</div>',
    css:'__SCENE__ .hero{opacity:1}', script:"tl.from(S+' .hero',{opacity:0,duration:.4},T0);"}));
  const html = exportHyperframesProject(project, undefined, '', {});
  assert.match(html, /id="hf-scene-0"/);
  assert.match(html, /data-duration="4"/);
  assert.match(html, /Escena personalizada/);
});

test('la fixture del planificador no contiene medios ni escenas de demo', () => {
  const project = validateProject(plannerFixture);
  assert.equal(project.scenes.length, 5);
  assert.ok(project.scenes.every((scene) => !scene.imageAsset && !scene.videoAsset && !scene.customScene));
  assert.equal(project.audioAsset, '');
  assert.equal(project.musicAsset, '');
});

test('la vista previa fiel incluye reproductor y escenas a medida, sin la plantilla', async () => {
  const {buildPreviewHtml, previewAssetMap} = await import('./preview-player.mjs');
  const project = validateProject(base({html: '<div class="x">Hola</div>', script: "tl.from(S+' .x',{opacity:0,duration:.5},T0);"}));
  const html = buildPreviewHtml(project, 'window.gsapStub=1;');
  assert.match(html, /id="ms-bar"|ms-bar/);
  assert.match(html, /<div class="x">Hola<\/div>/);
  assert.doesNotMatch(html, /class="headline"/);
  const withMedia = base({html: '<p>a</p>'});
  withMedia.scenes[0].imageAsset = 'user-assets/12345678-1234-1234-1234-123456789abc.png';
  assert.deepEqual(previewAssetMap(validateProject(withMedia)),
    {'user-assets/12345678-1234-1234-1234-123456789abc.png': '/user-assets/12345678-1234-1234-1234-123456789abc.png'});
});
