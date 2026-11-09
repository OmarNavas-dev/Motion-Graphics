import test from 'node:test';
import assert from 'node:assert/strict';
import {STYLE_IDS,listStylePresets,getStyleGuide,isKnownStylePreset} from './src/style-catalog.mjs';
test('the 21 sourced style guides resolve and retain their original names',()=>{
 assert.equal(STYLE_IDS.length,21);assert.equal(new Set(STYLE_IDS).size,21);
 for(const item of listStylePresets()){
  assert.ok(getStyleGuide(item.id).includes('## '));assert.ok(item.colors.background.startsWith('#'));
  assert.equal(item.executable,true);assert.equal(item.recipe.renderer,'shared-authored/1');
  assert.ok(item.recipe.signature&&item.recipe.motion);
 }
});
test('style directory traversal is rejected',()=>{assert.equal(isKnownStylePreset('../file'),false);assert.throws(()=>getStyleGuide('../file'));});
