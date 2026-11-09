import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFile,spawnSync} from 'node:child_process';
import {promisify} from 'node:util';
import {auditRenderedVideo} from './src/render-quality-audit.mjs';
import {createFrameContactSheet} from './src/quality-contact-sheet.mjs';
import {captureVisionFrame} from './src/visual-vision-review.mjs';
import {createVisualDefectReport,VISUAL_ITERATION_SCHEMA} from './plugins/motion-graphics/skills/motion-graphics/scripts/visual-iteration.mjs';
const exec=promisify(execFile);

test('P1 genera defectos y fotogramas desde un MP4 real de contraste insuficiente',{timeout:45000},async t=>{
  if(spawnSync('ffmpeg',['-version'],{stdio:'ignore'}).status!==0 ||
     spawnSync('ffprobe',['-version'],{stdio:'ignore'}).status!==0){
    t.skip('FFmpeg y FFprobe no están instalados en este entorno.');
    return;
  }
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'motion-p1-mp4-'));
  try {
    const video=path.join(root,'sample.mp4'),frames=path.join(root,'frames');
    await exec('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i',
      'color=c=black:s=360x640:r=24','-t','4','-c:v','mpeg4','-q:v','5','-y',video],{timeout:25000});
    const project={scenes:[{id:'primera',duration:2},{id:'segunda',duration:2}]};
    const visualAudit=await auditRenderedVideo(video);
    const sheet=await createFrameContactSheet(video,project,frames,{maxFrames:6});
    const defects=createVisualDefectReport(project,{visualAudit,contactSheet:sheet},{jobId:'local'});
    assert.equal(defects.schema,VISUAL_ITERATION_SCHEMA);
    assert.equal(sheet.captured,6);
    assert.ok(defects.defects.some(d=>d.code==='STATIC_INTERVAL'));
    assert.ok(defects.defects.some(d=>d.code==='LOW_FRAME_CONTRAST'));
    assert.equal(defects.approval,'PENDING_VISUAL_REVIEW');
    await fs.writeFile(path.join(frames,'defects.json'),JSON.stringify(defects,null,2));
    assert.equal(JSON.parse(await fs.readFile(path.join(frames,'defects.json'))).jobId,'local');
    assert.ok((await fs.stat(path.join(frames,'001.png'))).size>0);
    const image=Buffer.from(await captureVisionFrame(video,1.25),'base64');
    assert.equal(image.subarray(1,4).toString('ascii'),'PNG');
    assert.equal(image.readUInt32BE(16),640);
  }finally{await fs.rm(root,{recursive:true,force:true});}
});
