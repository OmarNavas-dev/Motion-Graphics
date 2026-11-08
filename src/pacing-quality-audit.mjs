// Pacing study modeled after the concepts in ItsssssJack/claude-video-2 (MIT).
// Generates objective motion-gap and flash leads, never an autonomous artistic verdict.
import {execFile} from 'node:child_process';import {promisify} from 'node:util';
const exec=promisify(execFile);
export function analyzePacingFrames(bytes,{width=64,height=114,fps=10,maxGapSeconds=1.5,minHoldSeconds=.3}={}){
 const stride=width*height,count=Math.floor(bytes.length/stride),events=[],cuts=[];
 for(let k=1;k<count;k++){
  let changed=0;const a=(k-1)*stride,b=k*stride;
  for(let p=0;p<stride;p++)if(Math.abs(bytes[b+p]-bytes[a+p])>14)changed++;
  const fraction=changed/stride,time=Number((k/fps).toFixed(3));
  if(fraction>.004)events.push(time);
  if(fraction>.35)cuts.push({seconds:time,fraction:Number(fraction.toFixed(3))});
 }
 const duration=count/fps,beats=[0,...events,duration],deadGaps=[];
 for(let i=1;i<beats.length;i++){
  const d=beats[i]-beats[i-1];
  if(d>maxGapSeconds)deadGaps.push({start:beats[i-1],end:beats[i],duration:Number(d.toFixed(3))});
 }
 const flashSuspects=[];
 for(let i=1;i<cuts.length;i++)if(cuts[i].seconds-cuts[i-1].seconds<minHoldSeconds)
  flashSuspects.push({first:cuts[i-1].seconds,second:cuts[i].seconds});
 return {frames:count,fps,deadGaps,flashSuspects,largeChanges:cuts.length,hasMotion:events.length>0,
  limitation:'Un texto que aparece suavemente o una pausa narrativa pueden parecer inactividad; requiere revisión de imágenes reales.'};
}
export async function auditRenderedPacing(video,{fps=10}={}){
 const rate=Math.min(12,Math.max(2,Math.round(fps)));
 const {stdout}=await exec('ffmpeg',['-v','error','-i',video,'-vf',`fps=${rate},scale=64:114,format=gray`,'-f','rawvideo','-'],{encoding:'buffer',windowsHide:true,timeout:180000,maxBuffer:128*1024*1024});
 return analyzePacingFrames(stdout,{fps:rate});
}
