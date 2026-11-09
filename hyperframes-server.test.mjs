import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const server = readFileSync(new URL('./server.mjs', import.meta.url), 'utf8');
const ui = readFileSync(new URL('./src/StudioApp.tsx', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

test('servidor tiene un render HyperFrames directo con navegador preparado y CPU limitada', () => {
  assert.match(server, /\/api\/render\/hyperframes/);
  assert.match(server, /hyperframes@\$\{HYPERFRAMES_VERSION\}/);
  assert.match(server, /\['lint'\]/);
  assert.match(server, /\['browser', 'ensure'\]/);
  assert.match(server, /\['doctor'\]/);
  assert.match(server, /'--workers', '1'/);
  assert.match(server, /'--fps', String\(fps\)/);
  assert.match(server, /MAX_HYPERFRAMES_ASSETS/);
  assert.match(server, /assertHyperframesRequirements/);
  assert.match(server, /\['ffmpeg', 'ffprobe'\]\.filter/);
  assert.match(server, /exportHyperframesProject\(project, undefined, gsapSource, embeddedAssets\)/);
  assert.doesNotMatch(server, /\/api\/ai\/scene/);
  assert.doesNotMatch(server, /\/api\/media\/search/);
});

test('interfaz usa HyperFrames por defecto y conserva Remotion como alternativa', () => {
  assert.match(ui, /render\('hyperframes'\)/);
  assert.match(ui, /render\('remotion'\)/);
  assert.match(ui, /Exportar MP4 · HyperFrames/);
  assert.match(pkg.scripts.test, /hyperframes-v7\.test\.mjs/);
  assert.match(pkg.scripts.test, /hyperframes-server\.test\.mjs/);
});

test('Canvas 3D se enruta a Remotion y no exporta un HTML visualmente distinto', () => {
  assert.match(ui, /project\.visualEngine === 'canvas' \? 'remotion'/);
  assert.match(ui, /Canvas 3D experimental/);
  assert.match(server, /project\.visualEngine === 'canvas'/);
  assert.match(server, /requiere la ruta de exportación Remotion/);
});
