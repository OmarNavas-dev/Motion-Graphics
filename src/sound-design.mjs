// Deterministic, sample-free Foley. Inspired by whaleyxbt/claude-motion (MIT), original implementation.
// Explicit user/authoring cues only: no surprise sound in silent projects.
import fs from 'node:fs/promises';
import {Buffer} from 'node:buffer';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
import {SOUND_KINDS,normalizeSoundDesign} from './motion-capabilities.mjs';
export {SOUND_KINDS,normalizeSoundDesign};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const tau=Math.PI*2;
const noise=x=>{let y=(x|0)+0x6D2B79F5;y=Math.imul(y^(y>>>15),y|1);y^=y+Math.imul(y^(y>>>7),y|61);return ((y^(y>>>14))>>>0)/2147483648-1;};
export function soundAt(kind,u,span,index){
 if(u<0||u>=span)return 0;
 const q=u/span,grain=noise(index);
 if(kind==='whoosh')return Math.sin(Math.PI*q)*(grain*.4+Math.sin(tau*(230*u+210*u*u))*.13);
 if(kind==='wind')return Math.sin(Math.PI*Math.min(1,q))*grain*.22;
 if(kind==='impact')return Math.exp(-10*q)*(.68*Math.sin(tau*(100*u-35*u*u))+grain*.23);
 if(kind==='click')return Math.exp(-55*u)*grain*.7;
 if(kind==='pop')return Math.exp(-7*q)*Math.sin(tau*(560*u-180*u*u));
 if(kind==='riser')return q*q*(.26*grain+.4*Math.sin(tau*(90*u+240*u*u)));
 if(kind==='chime')return Math.exp(-4*q)*(.4*Math.sin(tau*523.25*u)+.27*Math.sin(tau*659.25*u)+.2*Math.sin(tau*783.99*u));
 if(kind==='pad')return Math.sin(Math.PI*q)*(.22*Math.sin(tau*196*u)+.1*Math.sin(tau*293.66*u));
 return 0;
}
export function wavHeader(samples,rate){
 const bytes=samples*2,header=Buffer.alloc(44);
 header.write('RIFF',0);header.writeUInt32LE(bytes+36,4);header.write('WAVEfmt ',8);
 header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);
 header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);
 header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(bytes,40);return header;
}
export async function renderSoundWav(soundDesign,out,{rate=24000,seconds}={}){
 if(!soundDesign?.enabled||!soundDesign.cues?.length)return {generated:false};
 const length=Math.max(0,...soundDesign.cues.map(c=>c.at+c.duration));
 const full=Math.max(length,Number.isFinite(seconds)?seconds:0);
 if(full>900||full<=0)throw Error('Duración de diseño sonoro fuera de límites.');
 const samples=Math.ceil(full*rate),handle=await fs.open(out,'w');
 try{
  await handle.write(wavHeader(samples,rate));
  const block=8192;
  for(let offset=0;offset<samples;offset+=block){
   const count=Math.min(block,samples-offset),buffer=Buffer.alloc(count*2);
   const start=offset/rate,end=(offset+count)/rate;
   const active=soundDesign.cues.filter(c=>c.at<end&&c.at+c.duration>start);
   for(let i=0;i<count;i++){
    const index=offset+i,t=index/rate;
    let value=0;
    for(const c of active)value+=c.gain*soundAt(c.type,t-c.at,c.duration,index);
    buffer.writeInt16LE(Math.round(clamp(value,-.96,.96)*32767),i*2);
   }
   await handle.write(buffer);
  }
 }finally{await handle.close();}
 return {generated:true,seconds:full,cues:soundDesign.cues.length,rate,file:path.basename(out)};
}
export async function muxSoundtrack(video,wav,tempOutput,{hasExistingAudio}={}){
 const args=['-hide_banner','-loglevel','error','-y','-i',video,'-i',wav];
 if(hasExistingAudio){
  args.push('-filter_complex','[0:a:0][1:a:0]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]','-map','0:v:0','-map','[a]');
 }else args.push('-map','0:v:0','-map','1:a:0');
 args.push('-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart','-shortest',tempOutput);
 await exec('ffmpeg',args,{timeout:180000,windowsHide:true,maxBuffer:1024*1024});
 return tempOutput;
}
