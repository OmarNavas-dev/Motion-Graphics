import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {selectComposition, renderMedia} from '@remotion/renderer';
import {validateProject} from '../server-utils.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = await fs.mkdtemp(path.join(root, '.audio-regression-'));
assert.ok(temp.startsWith(root + path.sep));
try {
  await fs.cp(path.join(root, 'build'),path.join(temp, 'build'),{recursive:true});
  const media = path.join(temp,'build/public/user-assets');
  await fs.mkdir(media,{recursive:true});
  const filename = '00000000-0000-4000-8000-000000000099.wav';
  execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','sine=frequency=880:duration=2','-y',path.join(media,filename)]);
  for (const fps of [24,30]) {
    const project = validateProject({name:'Audio regression',fps,showText:false,visualEngine:'classic',
      scenes:[{id:'before',duration:1},{id:'effect',duration:1.5,
        audioCues:[{id:'cue',at:.25,duration:.5,volume:1,asset:`user-assets/${filename}`}]}]});
    const serveUrl = path.join(temp,'build');
    const composition = await selectComposition({serveUrl,id:'StudioVideo',inputProps:{project}});
    const output = path.join(temp,`audio-${fps}.mp4`);
    await renderMedia({serveUrl,composition:{...composition,width:160,height:284},inputProps:{project},
      codec:'h264',outputLocation:output,concurrency:1,hardwareAcceleration:'disable'});
    const pcm = execFileSync('ffmpeg',['-v','error','-i',output,'-vn','-ac','1','-ar','8000','-f','f32le','pipe:1']);
    const rms = (from,to) => {
      let sum=0,count=0;
      for(let i=Math.round(from*8000);i<Math.round(to*8000);i++) {sum+=pcm.readFloatLE(i*4)**2;count++;}
      return Math.sqrt(sum/count);
    };
    assert.ok(rms(.3,.7)<.001,'Debe haber silencio antes de la segunda escena.');
    assert.ok(rms(1.35,1.65)>.01,'Debe sonar el efecto en su tiempo.');
    assert.ok(rms(2.1,2.3)<.001,'El efecto debe detenerse al finalizar su duración.');
    console.log(`OK MP4 ${fps} FPS: silencio inicial, efecto a 1.25 s y corte a 1.75 s.`);
  }
} finally {
  await fs.rm(temp,{recursive:true,force:true});
}
