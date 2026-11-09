import test from 'node:test';
import assert from 'node:assert/strict';
import {auditArtDirection} from './src/art-direction-quality.mjs';
import {assessSampledFrames} from './src/render-quality-audit.mjs';

test('the failed Earth storyboard pattern is rejected for reference parity and direction',()=>{
  const sample={references:[],scenes:['rotacion','frenazo','inercia','oceano','velocidad','cierre'].map(id=>({
    id,duration:5,approved:false,transition:'cut',
    customScene:{html:`<svg><g class="${['rotacion','frenazo','cierre'].includes(id)?'earth':'wave'}"></g></svg>`,script:'tl.to(S+" .camera",{scale:1.1,duration:2});tl.to(S+" .copy",{opacity:1,duration:1});'}
  }))};
  const result=auditArtDirection(sample,{requiresReferences:true});
  assert.equal(result.readyForVisualReview,false);
  const codes=new Set(result.findings.map(f=>f.code));
  for(const code of ['ALL_HARD_CUTS','REFERENCES_NOT_BOUND','NO_SEMANTIC_ACTION_PLAN','REPEATED_HERO'])
    assert.ok(codes.has(code),`Missing regression signal: ${code}`);
});

test('frame auditor flags an unused dark lower quarter separately from frame rate',()=>{
  const width=8,height=12,frame=Buffer.alloc(width*height);
  for(let row=0;row<9;row++)for(let col=0;col<width;col++)frame[row*width+col]=(row*33+col*17)%255;
  const metrics=assessSampledFrames(Buffer.concat([frame,frame,frame]),{width,height,fps:2});
  assert.equal(metrics.lowerQuarterLowDetailFraction,1);
});

test('a fully directed set of differentiated scenes passes structural checks',()=>{
  const scenes=['boat','storm','rescue'].map((subject,index)=>({
    id:subject,duration:4,approved:true,transition:index===2?'cut':'crossfade',
    direction:{actions:[{actor:subject,verb:'moves',at:1}],shots:[{at:0,camera:'wide'}]},
    customScene:{html:`<svg><g class="${subject}"></g></svg>`,script:'tl.to(S+" .actor",{x:200,duration:2});tl.to(S+" .camera",{x:10,duration:2});'}
  }));
  const result=auditArtDirection({scenes,references:[{source:'reference.mp4'}]},{requiresReferences:true});
  assert.equal(result.readyForVisualReview,true);
  assert.equal(result.summary.errors,0);
});

test('MP4 provenance is represented in creativeBrief without violating image-only references',()=>{
  const project={creativeBrief:'REFERENCIA_VIDEO: ejemplo-real.mp4 — cámara y acción observadas',references:[],scenes:[
    {id:'a',duration:1,approved:true,transition:'crossfade',direction:{actions:[{actor:'a'}],shots:[{}]},customScene:{html:'<svg></svg>',script:'tl.to(S,{opacity:1,duration:1})'}}
  ]};
  assert.equal(auditArtDirection(project,{requiresReferences:true}).readyForVisualReview,true);
});
