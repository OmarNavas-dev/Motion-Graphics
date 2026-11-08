// Loop seam audit uses actual last/first MP4 frames, never metadata alone.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
export function compareLoopFrames(first,last,previous){
 if(!first?.length||!last?.length||!previous?.length||first.length!==last.length||first.length!==previous.length)throw Error('Trío de fotogramas incompleto.');
 const diff=(a,b)=>{let sum=0;for(let i=0;i<a.length;i++)sum+=Math.abs(a[i]-b[i]);return sum/a.length;};
 const seam=diff(first,last),ordinaryStep=diff(previous,last);
 return {seamMeanDifference:Number(seam.toFixed(3)),ordinaryStepMeanDifference:Number(ordinaryStep.toFixed(3)),
  seamlessByHeuristic:seam<=ordinaryStep*1.5+1.2,
  note:'Prueba de salto promedio de píxeles, no garantiza un loop perceptualmente perfecto.'};
}
export async function auditLoopSeam(video){
 const probe=JSON.parse((await exec('ffprobe',['-v','error','-show_entries','stream=r_frame_rate:format=duration','-of','json',video],{windowsHide:true})).stdout);
 const duration=Number(probe.format?.duration),frameRate=String(probe.streams?.find(x=>x.r_frame_rate)?.r_frame_rate||'24/1');
 const [n,d]=frameRate.split('/').map(Number);const fps=d?n/d:24;
 if(!Number.isFinite(duration)||duration<=0||!Number.isFinite(fps)||fps<=0)throw Error('No se pudieron determinar FPS y duración del loop.');
 const frameSize=96*170;
 const get=async t=>{
  const res=await exec('ffmpeg',['-v','error','-ss',String(Math.max(0,t)),'-i',video,'-frames:v','1','-vf','scale=96:170,format=gray','-f','rawvideo','-'],{encoding:'buffer',maxBuffer:1024*1024,windowsHide:true});
  if(res.stdout.length!==frameSize)throw Error('Fotograma de loop ausente.');
  return res.stdout;
 };
 const first=await get(0),last=await get(Math.max(0,duration-1/fps)),previous=await get(Math.max(0,duration-2/fps));
 return {fps,duration,...compareLoopFrames(first,last,previous)};
}
