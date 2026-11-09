import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createVisualDefectReport,applySafeVisualCorrections,compareVisualReports,
  contrastRatio,validateIterationRequest,projectFingerprint,VISUAL_ITERATION_SCHEMA} from '../scripts/visual-iteration.mjs';
import {repairFromReport} from '../scripts/repair-from-report.mjs';

const fixture=()=>({
  name:'P1',format:'vertical',fps:24,scenes:[
    {id:'a',duration:4,approved:true,authored:{background:{color:'#101010'},
      layers:[{id:'titulo',type:'text',text:'Hola',color:'#151515'}]}},
    {id:'b',duration:4,approved:true,customScene:{html:'<svg></svg>',script:''}},
  ],
});
const audits={
  visualAudit:{video:{audioPresent:false},metrics:{
    frozenSegments:[{startSeconds:4.5,endSeconds:7}],lowContrastSegments:[{startSeconds:0,endSeconds:2}],
    largeVisualChanges:[{seconds:4.2,meanPixelChange:78}]}},
  pacingAudit:{flashSuspects:[{first:4.2,second:4.3}],deadGaps:[]},
  contactSheet:{captured:2,frames:[{scene:'a',seconds:2,file:'001.png'},{scene:'b',seconds:6,file:'002.png'}],errors:[]},
  expectedAudio:true,
};

test('P1 crea informe por escena, segundo local, fotograma y prioridad sin aprobación artística',()=>{
  const report=createVisualDefectReport(fixture(),audits,{jobId:'first',attempt:1});
  assert.equal(report.schema,VISUAL_ITERATION_SCHEMA);
  assert.equal(report.approval,'PENDING_VISUAL_REVIEW');
  assert.ok(report.defects.some(d=>d.code==='LOW_TEXT_CONTRAST'&&d.sceneId==='a'&&d.autoFixable));
  const frozen=report.defects.find(d=>d.code==='STATIC_INTERVAL');
  assert.equal(frozen.sceneId,'b');
  assert.equal(frozen.localSeconds,1.75);
  assert.equal(frozen.frame.file,'002.png');
  assert.ok(report.defects.some(d=>d.code==='MISSING_AUDIO'&&d.severity==='error'));
  assert.ok(report.defects.some(d=>d.code==='FLASH_SUSPECT'));
});

test('P1 solo repara contraste sólido medible, preserva audio y exige revisar la escena',()=>{
  const original=fixture(),report=createVisualDefectReport(original,audits,{jobId:'first'});
  const {project,manifest}=applySafeVisualCorrections(original,report);
  assert.equal(original.scenes[0].authored.layers[0].color,'#151515');
  assert.equal(project.scenes[0].authored.layers[0].color,'#ffffff');
  assert.equal(project.scenes[0].approved,false);
  assert.equal(project.scenes[1].approved,true);
  assert.ok(contrastRatio('#ffffff','#101010')>=4.5);
  assert.equal(manifest.applied.length,1);
  assert.ok(manifest.unresolved.length>0);
  assert.notEqual(manifest.projectHashAfter,manifest.projectHashBefore);
  assert.throws(()=>applySafeVisualCorrections(project,report),/otro JSON/);
});

test('P1 no inventa arreglos para un render estático sin capas editables',()=>{
  const original={scenes:[{id:'solo',duration:5,customScene:{html:'<svg></svg>',script:''}}]};
  const report=createVisualDefectReport(original,{visualAudit:{metrics:{frozenSegments:[{startSeconds:1,endSeconds:4}]}},
    contactSheet:{captured:1,frames:[{scene:'solo',seconds:2,file:'001.png'}],errors:[]}});
  const result=applySafeVisualCorrections(original,report);
  assert.equal(result.manifest.applied.length,0);
  assert.equal(result.manifest.unresolved.length,1);
  assert.deepEqual(result.project,original);
});

test('P1 impide re-renders iguales, sin origen o más allá de tres intentos',()=>{
  const project=fixture(),defects=createVisualDefectReport(project,audits,{jobId:'first'});
  const previous={id:'first',status:'completado',attempt:1,projectHash:projectFingerprint(project),visualDefects:defects};
  assert.throws(()=>validateIterationRequest(null,project),/origen/);
  assert.throws(()=>validateIterationRequest(previous,project),/idéntico/);
  assert.throws(()=>validateIterationRequest({...previous,attempt:3},{...project,name:'cambio'}),/Límite/);
  const revised={...project,name:'corregido'};
  assert.deepEqual(validateIterationRequest(previous,revised),{sourceJobId:'first',attempt:2});
});

test('P1 clasifica selector GSAP ausente en un render fallido y permite corregirlo',()=>{
  const project=fixture();
  const report=createVisualDefectReport(project,{runtimeErrors:[
    'b @0.458: GSAP target #hf-scene-12 .foreground-shrubs not found',
  ]},{jobId:'failed',stage:'preflight'});
  assert.equal(report.defects.length,2); // Includes low text contrast, not missing MP4 measurements.
  const issue=report.defects.find(d=>d.code==='MISSING_GSAP_TARGET');
  assert.equal(issue.sceneId,'b');
  assert.equal(issue.detail.reportedTimeSeconds,.458);
  const previous={id:'failed',status:'error',attempt:1,projectHash:projectFingerprint(project),visualDefects:report};
  assert.deepEqual(validateIterationRequest(previous,{...project,name:'nuevo'}),{sourceJobId:'failed',attempt:2});
});

test('P1 produce archivos corregidos sin sobrescribir originales y compara reportes',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'motion-p1-'));
  try{
    const original=fixture(),report=createVisualDefectReport(original,audits,{jobId:'first'});
    const projectFile=path.join(dir,'original.json'),reportFile=path.join(dir,'defects.json');
    const out=path.join(dir,'fixed.json'),manifestFile=path.join(dir,'manifest.json');
    await fs.writeFile(projectFile,JSON.stringify(original));
    await fs.writeFile(reportFile,JSON.stringify(report));
    const manifest=await repairFromReport(projectFile,reportFile,{out,manifestFile});
    assert.equal(manifest.applied.length,1);
    assert.equal((JSON.parse(await fs.readFile(out))).scenes[0].approved,false);
    await assert.rejects(repairFromReport(projectFile,reportFile,{out,manifestFile}),/EEXIST/);
    const better=createVisualDefectReport(original,{visualAudit:{video:{audioPresent:true},metrics:{}},
      contactSheet:audits.contactSheet},{jobId:'second',sourceJobId:'first',attempt:2});
    const comparison=compareVisualReports(report,better);
    assert.ok(comparison.delta<0);
    assert.equal(comparison.artisticApproval,false);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
