import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
const finite=n=>Number.isFinite(n);
export function auditTimelineAudio(project, {toleranceSeconds=0.08}={}) {
 const scenes=project?.scenes||[],total=scenes.reduce((a,s)=>a+Number(s.duration||0),0);
 const words=project?.wordTimings||[];
 const warnings=[];
 if(!project.audioAsset && !(project.voiceClips||[]).length)warnings.push('No hay narración adjunta: sincronía voz/animación no verificable.');
 let end=-Infinity;
 for(let i=0;i<words.length;i++){
  const w=words[i],start=Number(w.start),stop=Number(w.end);
  if(!finite(start)||!finite(stop)||start<0||stop<=start||start<end-toleranceSeconds)
   warnings.push('Marca de palabra inválida o solapada en posición '+i+'.');
  if(stop>total+toleranceSeconds)warnings.push('Palabra '+i+' termina después del video ('+stop+' s).');
  end=Math.max(end,stop);
 }
 return {videoSeconds:total,wordsChecked:words.length,warnings,hasTimedWords:words.length>0,voicePresent:Boolean(project.audioAsset||(project.voiceClips||[]).length)};
}
export function parseLoudnessOutput(stderr=''){
 const match=stderr.match(/Integrated loudness:\s*I:\s*(-?\d+(?:\.\d+)?)\s*LUFS/i)
  ||stderr.match(/\bI:\s*(-?\d+(?:\.\d+)?)\s*LUFS/i);
 const peak=stderr.match(/\bPeak:\s*(-?\d+(?:\.\d+)?)\s*dBFS/i);
 return {integratedLufs:match?Number(match[1]):null,truePeakDbfs:peak?Number(peak[1]):null};
}
export async function measureAudioLoudness(video){
 let output;
 try{output=await exec('ffmpeg',['-hide_banner','-nostats','-i',video,'-filter_complex','ebur128=peak=true','-f','null','-'],{windowsHide:true,timeout:90000,maxBuffer:4*1024*1024});}
 catch(error){if(!/Integrated loudness:/.test(error.stderr||''))throw error;output={stderr:error.stderr};}
 const loudness=parseLoudnessOutput(output.stderr||'');
 const warnings=[];
 if(loudness.integratedLufs!==null&&(loudness.integratedLufs> -12||loudness.integratedLufs< -24))
  warnings.push('Sonoridad '+loudness.integratedLufs+' LUFS: revisar mezcla y criterio de entrega.');
 return {...loudness,warnings};
}
