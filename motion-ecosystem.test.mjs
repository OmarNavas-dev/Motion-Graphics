import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkMotionEcosystem} from './scripts/check-motion-ecosystem.mjs';

test('complemento empaquetado, importador y exportador comparten contrato sin alterar las escenas',async()=>{
 const report=await checkMotionEcosystem();
 assert.equal(report.technicalContractPassed,true,report.errors.join('\n'));
 assert.equal(report.cases.length,5);
 assert.deepEqual(report.cases.map(c=>c.fps),[24,30,24,24,24]);
 assert.equal(report.runtimePassed,false);
 assert.equal(report.visualApproval,false);
 assert.equal(report.videoVerified,false);
});

test('Motion Studio y el complemento v4 aplican los mismos límites de escena',async()=>{
 const {validateProject:studio}=await import('./server-utils.mjs');
 const {validateProject:plugin}=await import('./plugins/motion-graphics/skills/motion-graphics/scripts/compat/server-utils.mjs');
 const {CUSTOM_SCENE_LIMITS}=await import('./src/scene-limits.mjs');
 const sceneWith=(key,size)=>{
  const frame={html:['<svg><!--','--></svg>'],css:['/*','*/'],script:['/*','*/']}[key];
  return {name:'Límites compartidos',scenes:[{id:'limite',duration:3,customScene:{
   html:'<svg></svg>',css:'',script:'',[key]:frame[0]+'x'.repeat(size-frame.join('').length)+frame[1]
  }}]};
 };
 const detailed=sceneWith('html',170005);
 assert.deepEqual(plugin(detailed),studio(detailed));
 for(const [field,limit] of Object.entries(CUSTOM_SCENE_LIMITS)){
  const valid=sceneWith(field,limit),overflow=sceneWith(field,limit+1);
  assert.deepEqual(plugin(valid),studio(valid));
  const error=new RegExp(field+' supera '+limit+' caracteres');
  assert.throws(()=>studio(overflow),error);
  assert.throws(()=>plugin(overflow),error);
 }
});
