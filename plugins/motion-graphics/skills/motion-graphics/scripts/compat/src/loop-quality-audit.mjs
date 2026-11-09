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
// P8.2: four-frame boundary audit, comparing displacement on both sides of the seam.
// Cyclic renders do not normally duplicate frame zero at the end: a one-step
// seam delta is expected. This tests continuity, not an impossible zero delta.
export function compareLoopCycleFrames(first,second,previous,last,{tolerance=1.75,noiseFloor=1.5}={}){
 const frames=[first,second,previous,last];
 if(frames.some(f=>!f?.length||f.length!==first.length))throw Error('Se requieren cuatro fotogramas del mismo tamaño.');
 if(!(Number.isFinite(tolerance)&&tolerance>=1&&Number.isFinite(noiseFloor)&&noiseFloor>=0))throw Error('Umbrales de loop inválidos.');
 const diff=(a,b)=>{let sum=0;for(let i=0;i<a.length;i++)sum+=Math.abs(a[i]-b[i]);return sum/a.length;};
 const seam=diff(last,first),start=diff(first,second),end=diff(previous,last);
 const reference=Math.max(start,end,noiseFloor);
 const passed=seam<=reference*tolerance+noiseFloor;
 const staticLoop=start<=noiseFloor&&end<=noiseFloor;
 return {passed,seamDifference:+seam.toFixed(3),startStepDifference:+start.toFixed(3),endStepDifference:+end.toFixed(3),
  normalizedSeam:+(seam/reference).toFixed(3),staticLoop,
  issue:passed?null:{type:'loop-boundary-jump',severity:'warning',atSeconds:'0 / duration',message:'El salto de cierre excede el movimiento de cuadros vecinos.'},
  note:'Medida objetiva de píxeles: efectos, cortes intencionales y cambios cromáticos requieren inspección visual.'};
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
 const first=await get(0),second=await get(1/fps),last=await get(Math.max(0,duration-1/fps)),previous=await get(Math.max(0,duration-2/fps));
 return {fps,duration,...compareLoopFrames(first,last,previous),cycle:compareLoopCycleFrames(first,second,previous,last)};
}
