import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const [source,video,out]=process.argv.slice(2);
if(!out)throw Error('Uso: node scripts/verify-render-audio.mjs audio-original video-final informe.json');
const rate=8000;
function pcm(file){
 const r=spawnSync('ffmpeg',['-v','error','-i',file,'-vn','-ac','1','-ar',String(rate),'-f','s16le','-'],{windowsHide:true,maxBuffer:64*1024*1024});
 if(r.status!==0)throw Error(r.stderr.toString());
 return Int16Array.from({length:r.stdout.length/2},(_,i)=>r.stdout.readInt16LE(i*2));
}
const a=pcm(source),b=pcm(video),seconds=Math.min(a.length,b.length)/rate;
const positions=[2,Math.max(2,seconds/2-2),Math.max(2,seconds-6)];
function correlation(start,lag,n){
 let aa=0,bb=0,ab=0;
 for(let j=0;j<n;j++){const x=a[start+j],y=b[start+j+lag];aa+=x*x;bb+=y*y;ab+=x*y;}
 return aa&&bb?ab/Math.sqrt(aa*bb):-1;
}
const windows=positions.map(time=>{
 const start=Math.round(time*rate),n=Math.min(4*rate,a.length-start,b.length-start-1000);
 let best={lag:0,correlation:-1};
 for(let lag=-960;lag<=960;lag+=8){const score=correlation(start,lag,n);if(score>best.correlation)best={lag,correlation:score};}
 const center=best.lag;
 for(let lag=center-8;lag<=center+8;lag++){const score=correlation(start,lag,n);if(score>best.correlation)best={lag,correlation:score};}
 return {at:time,lagMilliseconds:best.lag/rate*1000,correlation:best.correlation};
});
const drift=Math.max(...windows.map(w=>w.lagMilliseconds))-Math.min(...windows.map(w=>w.lagMilliseconds));
const report={passed:windows.every(w=>Math.abs(w.lagMilliseconds)<=20&&w.correlation>.95)&&drift<=5,method:'PCM cross-correlation, original versus encoded audio, three four-second windows, 8 kHz',windows,driftMilliseconds:drift,semanticTranscriptionVerified:false};
await fs.mkdir(path.dirname(path.resolve(out)),{recursive:true});await fs.writeFile(out,JSON.stringify(report,null,2));
console.log(JSON.stringify(report));process.exitCode=report.passed?0:1;
