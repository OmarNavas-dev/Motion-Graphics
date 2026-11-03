import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Windows detecta si falta Vite aunque Remotion Player ya exista', () => {
  const launcher = readFileSync(new URL('./abrir-motion-studio.cmd', import.meta.url), 'utf8');
  assert.match(launcher, /if not exist "node_modules\\\.bin\\vite\.cmd" set "NECESITA_INSTALAR=1"/);
  assert.match(launcher, /if not exist "node_modules\\@remotion\\player\\package\.json"/);
  assert.match(launcher, /if not exist "node_modules\\@remotion\\cli\\remotion-cli\.js"/);
  assert.match(launcher, /npm ci --include=dev --no-audit --no-fund/);
  assert.match(launcher, /Vite sigue sin estar instalado/);
  assert.match(launcher, /Microsoft\\WinGet\\Links/);
});

test('los launchers heredados usan la regresión vigente sin proyectos de demo antiguos', () => {
  for (const name of ['probar-motion-studio-5.cmd', 'probar-motion-studio-6.cmd']) {
    const script = readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');
    assert.match(script, /npm ci --include=dev --no-audit --no-fund/);
    assert.match(script, /npm run render:motion-test/);
    assert.match(script, /out\\motion-studio-v4-test\.mp4/);
    assert.doesNotMatch(script, /render:v5-demo|render:v6-image-test|defensas/);
  }
});

test('la prueba V7 comprueba el render directo con HyperFrames y conserva Remotion', () => {
  const script = readFileSync(new URL('./probar-motion-studio-7.cmd', import.meta.url), 'utf8');
  assert.match(script, /npm test/);
  assert.match(script, /create-hyperframes-smoke\.mjs/);
  assert.doesNotMatch(script, /examples\\hyperframes-v7|imagen y narracion/);
  assert.match(script, /hyperframes@0\.8\.225/);
  assert.match(script, /hyperframes browser ensure/);
  assert.match(script, /hyperframes render/);
  assert.match(script, /--workers 1/);
  assert.match(script, /motion-studio-v7-smoke\.mp4/);
  assert.match(script, /Remotion sigue disponible/);
  assert.match(script, /instalar-ffmpeg\.cmd/);
});

test('el instalador de FFmpeg usa WinGet y comprueba ambos ejecutables', () => {
  const installer = readFileSync(new URL('./instalar-ffmpeg.cmd', import.meta.url), 'utf8');
  assert.match(installer, /winget install --id Gyan\.FFmpeg --exact/);
  assert.match(installer, /where ffmpeg/);
  assert.match(installer, /where ffprobe/);
  assert.match(installer, /gyan\.dev\/ffmpeg\/builds/);
});
