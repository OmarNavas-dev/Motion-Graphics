#!/usr/bin/env node
// Reviews *rendered* MP4 frames, not just an HTML or JSON promise of motion.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {validateBeats} from './validate-beats.mjs';

export function reviewTimes(plan,{after=.3,includeBoundaries=true}={}){
  const result=new Set();
  for(const b of plan.beats||[]) {
    result.add(Math.max(0,Math.min(plan.duration-.001,b.at+after)).toFixed(3));
    if(includeBoundaries)result.add(Math.max(0,Math.min(plan.duration-.001,b.at)).toFixed(3));
  }
  return [...result].map(Number).sort((a,b)=>a-b);
}

function run(cmd,args){const r=spawnSync(cmd,args,{encoding:'utf8'});
  if(r.status!==0)throw new Error(`${cmd} falló: ${(r.stderr||r.error?.message||'').slice(-850)}`);
}

if(process.argv[1]===new URL(import.meta.url).pathname){
  try {
    const [video,beatsFile,output]=process.argv.slice(2);
    if(!video||!beatsFile||!output)throw new Error('Uso: node beat-contact-sheet.mjs video.mp4 beats.json sheet.png');
    const p=JSON.parse(fs.readFileSync(beatsFile,'utf8'));
    const r=validateBeats(p);if(!r.ok)throw new Error(r.errors.join('; '));
    const times=reviewTimes(p);
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mg-beats-'));
    try {
      for(const [i,t] of times.entries()) {
        const f=path.join(dir,`${String(i).padStart(4,'0')}.png`);
        run('ffmpeg',['-hide_banner','-loglevel','error','-ss',String(t),'-i',video,
          '-frames:v','1','-vf','scale=270:-2',f,'-y']);
      }
      const rows=Math.ceil(times.length/4);
      run('ffmpeg',['-hide_banner','-loglevel','error','-framerate','1',
        '-i',path.join(dir,'%04d.png'),'-vf',`tile=4x${rows}:padding=6:margin=6:color=0x101522`,
        '-frames:v','1',output,'-y']);
      console.log(JSON.stringify({output,times,layout:`4x${rows}`},null,2));
    }finally{fs.rmSync(dir,{recursive:true,force:true});}
  }catch(e){console.error(e.message);process.exitCode=1;}
}
