import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeBrandProfile} from './src/motion-capabilities.mjs';
import {validateProject} from './server-utils.mjs';
test('explicit visual brand survives the JSON importer',()=>{
 const brand={name:'Experimentos',colors:{background:'#0b1120',accent:'#e98a2b'},motionRules:['Camera focus follows evidence'],avoid:['Do not add decorative credits']};
 const raw={format:'vertical',scenes:[{duration:3}],brandProfile:brand};
 const restored=validateProject(raw);
 assert.equal(restored.brandProfile.colors.background,'#0B1120');
 assert.deepEqual(restored.brandProfile.motionRules,brand.motionRules);
 assert.deepEqual(validateProject(restored).brandProfile,restored.brandProfile);
});
test('unsafe palettes and oversized branding rules rejected',()=>{
 assert.throws(()=>normalizeBrandProfile({colors:{background:'url(http://example.org)'}}));
 assert.throws(()=>normalizeBrandProfile({motionRules:Array(13).fill('x')}));
});
