import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createVisualDefectReport,projectFingerprint,VISUAL_REVISION_SCHEMA}
  from '../scripts/visual-iteration.mjs';
import {applyVerifiedVisionPlan,applyVisionPlanFiles} from '../scripts/apply-vision-plan.mjs';

const project=()=>({name:'P1',format:'vertical',palette:'aurora',audioAsset:'',musicAsset:'',
  scenes:[{id:'scene-1',layout:'hero',duration:3,title:'Una luz',subtitle:'',
    imageAsset:'',cues:[],scriptExcerpt:'Una luz ilumina el paisaje',approved:true,
    customScene:{html:'<div class="luz"></div>',css:'__SCENE__ .luz{opacity:0}',script:'tl.to(S+" .luz",{opacity:1},T0+1);'}}]});
const plan=(p,r)=>({schema:VISUAL_REVISION_SCHEMA,projectHash:projectFingerprint(p),
  sourceJobId:r.jobId,scenes:[{sceneId:'scene-1',localSeconds:1,confidence:.91,
    observation:'El paisaje no muestra la luz indicada en el relato',
    type:'customScene',customScene:{html:'<div class="luz"><svg></svg></div>',
      css:'__SCENE__ .luz{opacity:1}',script:'tl.from(S+" .luz",{opacity:0,duration:1},T0+.2);'}}]});
test('complemento P1 aplica escena visual y preserva JSON original',()=>{
  const p=project(),r=createVisualDefectReport(p,{}, {jobId:'test',stage:'preflight'});
  const result=applyVerifiedVisionPlan(p,r,plan(p,r));
  assert.equal(p.scenes[0].customScene.css,'__SCENE__ .luz{opacity:0}');
  assert.equal(result.project.scenes[0].approved,false);
  assert.match(result.project.scenes[0].customScene.html,/<svg>/);
  const illegal=plan(p,r);illegal.scenes[0].customScene.script='fetch("https://otro.example");';
  assert.throws(()=>applyVerifiedVisionPlan(p,r,illegal),/no permitid/);
  const missing=plan(p,r);missing.scenes[0].customScene.script='tl.to(S+" .fantasma",{opacity:0});';
  assert.throws(()=>applyVerifiedVisionPlan(p,r,missing),/sin elemento HTML/);
});
test('complemento P1 escribe manifiesto seguro sin sobrescribir',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'p1-vision-'));
  const names=['original.json','defects.json','plan.json','nuevo.json','manifest.json'].map(n=>path.join(dir,n));
  try{
    const p=project(),r=createVisualDefectReport(p,{}, {jobId:'test',stage:'preflight'});
    for(const [i,value] of [p,r,plan(p,r)].entries())await fs.writeFile(names[i],JSON.stringify(value));
    const result=await applyVisionPlanFiles(...names.slice(0,3),{out:names[3],manifest:names[4]});
    assert.equal(result.manifest.applied.length,1);
    assert.equal(JSON.parse(await fs.readFile(names[3],'utf8')).scenes[0].approved,false);
    await assert.rejects(()=>applyVisionPlanFiles(...names.slice(0,3),
      {out:names[3],manifest:names[4]}),/EEXIST/);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
