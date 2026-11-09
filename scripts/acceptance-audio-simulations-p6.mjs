#!/usr/bin/env node
// Real P6 acceptance: Remotion MP4 + deterministic simulations + stereo/voice-priority mix.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {generateAudioSimulationWorkflow} from '../plugins/motion-graphics/skills/motion-graphics/scripts/generate-audio-simulation-project.mjs';
import {renderSoundWav,muxSoundtrack} from '../src/sound-design.mjs';
import {measureAudioLoudness} from '../src/audio-quality-audit.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'out','p6-audio-simulations');
await fs.mkdir(out,{recursive:true});
const run=(bin,args,timeout=300)=>{
 const result=spawnSync(bin,args,{cwd:root,windowsHide:true,encoding:null,maxBuffer:16*1024*1024,timeout:timeout*1000});
 if(result.error||result.status!==0)throw Error(`P6 ${bin} (${result.status}): ${String(result.stderr||result.error).slice(-1700)}`);
 return result.stdout;
};
const project=generateAudioSimulationWorkflow({kind:'all',seconds:3});
await fs.writeFile(path.join(out,'project.json'),JSON.stringify(project,null,2));
const props=path.join(out,'props.json');await fs.writeFile(props,JSON.stringify({project}));
const silent=path.join(out,'simulations-silent.mp4');
run(process.execPath,[path.join(root,'node_modules/@remotion/cli/remotion-cli.js'),'render','StudioVideo',silent,
 `--props=${props}`,`--public-dir=${path.join(root,'public')}`,'--codec=h264','--concurrency=1','--hardware-acceleration=disable'],1300);
const total=project.scenes.reduce((n,s)=>n+s.duration,0),wav=path.join(out,'sfx-stereo.wav');
const result=await renderSoundWav(project.soundDesign,wav,{seconds:total});
if(result.channels!==2)throw Error('P6: paneo estéreo ausente.');
const narration=path.join(out,'simulations-voice.mp4');
run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',silent,'-f','lavfi','-i',`sine=frequency=210:sample_rate=24000:duration=${total}`,
 '-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','128k','-shortest',narration]);
const final=path.join(out,'p6-mixed.mp4');
await muxSoundtrack(narration,wav,final,{hasExistingAudio:true,mix:project.soundDesign.mix});
const tracks=JSON.parse(run('ffprobe',['-v','error','-show_entries','stream=codec_name,codec_type,channels:format=duration','-of','json',final]).toString());
const video=tracks.streams.find(s=>s.codec_type==='video'),audio=tracks.streams.find(s=>s.codec_type==='audio');
if(video?.codec_name!=='h264'||audio?.codec_name!=='aac'||audio.channels!==2||Math.abs(Number(tracks.format.duration)-total)>.3)
 throw Error('P6: MP4/audio inválidos: '+JSON.stringify(tracks));
const samples=[],kinds=['orbit','pendulum','spring','bounce'];
for(let i=0;i<4;i++){
 const start=i*3,clip=path.join(out,`${i+1}-${kinds[i]}.mp4`);
 run('ffmpeg',['-loglevel','error','-y','-ss',String(start),'-i',final,'-t','3','-c:v','libx264','-preset','veryfast','-crf','23','-c:a','aac',clip]);
 const frames=[start+.4,start+1.8].map(t=>run('ffmpeg',['-loglevel','error','-ss',String(t),'-i',final,'-frames:v','1','-vf','scale=80:45,format=rgb24','-pix_fmt','rgb24','-f','rawvideo','pipe:1']));
 let delta=0;for(let j=0;j<frames[0].length;j++)delta+=Math.abs(frames[0][j]-frames[1][j]);
 delta=Number((delta/frames[0].length).toFixed(3));
 if(delta<.1)throw Error('P6: simulación estática: '+kinds[i]);
 samples.push({kind:kinds[i],clip:path.basename(clip),pixelDifference:delta,sha256:createHash('sha256').update(frames[1]).digest('hex')});
}
if(new Set(samples.map(x=>x.sha256)).size!==4)throw Error('P6: estilos de simulación indistinguibles.');
const contact=path.join(out,'contact-sheet-p6.png');
run('ffmpeg',['-loglevel','error','-y','-i',final,'-vf','select=eq(n\\,36)+eq(n\\,108)+eq(n\\,180)+eq(n\\,252),scale=320:180,tile=4x1','-frames:v','1',contact]);
const loudness=await measureAudioLoudness(final);
const report={passed:true,kindCount:4,motion:samples,duration:tracks.format.duration,audio:{codec:audio.codec_name,channels:audio.channels,...loudness},
 soundtrack:{cues:result.cues,channels:result.channels,mix:project.soundDesign.mix},limitations:'La auditoría numérica no sustituye la escucha crítica ni certifica un motor de física 3D.'};
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
