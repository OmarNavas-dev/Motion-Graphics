import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run = promisify(execFile);

// The signal is grayscale image change, not an artistic-quality score.
export function assessSampledFrames(bytes, {width=96,height=170,fps=2}={}) {
  const frameSize=width*height;
  const count=Math.floor(bytes.length/frameSize);
  const diffs=[], contrasts=[];
  let previous=null;
  for(let index=0;index<count;index++) {
    const frame=bytes.subarray(index*frameSize,(index+1)*frameSize);
    let min=255,max=0, change=0;
    for(let pixel=0;pixel<frame.length;pixel++) {
      const value=frame[pixel];min=Math.min(min,value);max=Math.max(max,value);
      if(previous)change+=Math.abs(value-previous[pixel]);
    }
    contrasts.push(max-min);
    if(previous)diffs.push(change/frameSize);
    previous=frame;
  }
  const frozenSegments=[];
  let start=null;
  for(let index=0;index<diffs.length;index++) {
    if(diffs[index]<0.65 && start===null)start=index;
    if((diffs[index]>=0.65 || index===diffs.length-1) && start!==null) {
      const end=diffs[index]>=0.65?index:index+1;
      if((end-start)/fps>=2) frozenSegments.push({startSeconds:start/fps,endSeconds:end/fps});
      start=null;
    }
  }
  const spikes=diffs.flatMap((value,index)=>value>72?[{seconds:(index+1)/fps,meanPixelChange:Number(value.toFixed(1))}]:[]);
  return {sampledFrames:count,frameRate:fps,meanChange:Number((diffs.reduce((a,b)=>a+b,0)/Math.max(1,diffs.length)).toFixed(2)),
    lowContrastFraction:Number((contrasts.filter(v=>v<18).length/Math.max(1,count)).toFixed(3)),
    frozenSegments,largeVisualChanges:spikes};
}

export async function auditRenderedVideo(file,{expectedAudio=false}={}) {
  const {stdout:probe}=await run('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,width,height','-of','json',file],{maxBuffer:1024*1024,windowsHide:true});
  const metadata=JSON.parse(probe);
  const duration=Number(metadata.format?.duration??0);
  const streams=metadata.streams??[];
  const {stdout:raw}=await run('ffmpeg',['-v','error','-i',file,'-vf','fps=2,scale=96:170,format=gray','-f','rawvideo','-'],{encoding:'buffer',maxBuffer:24*1024*1024,windowsHide:true});
  const metrics=assessSampledFrames(raw);
  const warnings=[];
  if(metrics.frozenSegments.length)warnings.push(`${metrics.frozenSegments.length} intervalo(s) casi estático(s) de al menos 2 s. Revisar si la pausa es intencional.`);
  if(metrics.lowContrastFraction>0.3)warnings.push('Muchos fotogramas presentan muy poco contraste; revisar fondos vacíos o errores de visibilidad.');
  if(metrics.largeVisualChanges.length)warnings.push('Cambios bruscos de imagen detectados; distinguir cortes intencionales de saltos visuales.');
  const audioPresent=streams.some(stream=>stream.codec_type==='audio');
  if(expectedAudio&&!audioPresent)warnings.push('El proyecto espera narración o música, pero el MP4 no contiene pista de audio.');
  return {video:{duration,width:streams.find(s=>s.codec_type==='video')?.width,height:streams.find(s=>s.codec_type==='video')?.height,audioPresent},metrics,warnings,
    limitation:'Métricas heurísticas de fotogramas; no certifican realismo, naturalidad, estética ni comprensión del relato.'};
}
