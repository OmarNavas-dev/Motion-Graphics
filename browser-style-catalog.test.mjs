import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {STYLE_GUIDES} from './src/style-guide-data.mjs';
import {STYLE_IDS, getStyleGuide, listStylePresets} from './src/style-catalog.mjs';

test('all 21 browser-safe guides match the canonical plugin references', () => {
  assert.equal(STYLE_IDS.length, 21);
  for (const id of STYLE_IDS) {
    const canonical = readFileSync(join('plugins/motion-graphics/skills/motion-graphics/references/styles', id + '.md'), 'utf8');
    assert.equal(STYLE_GUIDES[id], canonical, `${id} guide snapshot is stale`);
    assert.equal(getStyleGuide(id), canonical);
  }
  assert.equal(listStylePresets().length, 21);
});

test('production browser bundle cannot contain Node filesystem/path polyfills', () => {
  const assets = 'dist-ui/assets';
  for (const filename of readdirSync(assets).filter(name => name.endsWith('.js'))) {
    const bundle = readFileSync(join(assets, filename), 'utf8');
    assert.doesNotMatch(bundle, /__vite-browser-external|readFileSync|node:fs|node:path/,
      `${filename} contains server-only code and can crash at startup`);
  }
});
