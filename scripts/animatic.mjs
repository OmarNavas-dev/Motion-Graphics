import fs from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateProject} from '../server-utils.mjs';
import {compileStoryboard as compileAnimatic} from './compile-storyboard.mjs';
import {probeVideo} from '../plugins/motion-graphics/skills/motion-graphics/scripts/video-evidence.mjs';
import {withAnimaticPage} from './animatic-browser.mjs';
import {auditAnimaticContinuity,continuityPlan} from './animatic-continuity.mjs';

export {compileAnimatic};

const read=async p=>(await fs.readFile(p,'utf8')).replace(/^\uFEFF/,'');
const readJson=async p=>JSON.parse(await read(p));
const writeJson=(p,value)=>fs.writeFile(p,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const ff=(cmd,args,extra={})=>execFileSync(cmd,args,{windowsHide:true,timeout:120000,...extra});
const hash=async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex');
function audioDuration(voice){
 const info=JSON.parse(ff('ffprobe',['-v','error','-select_streams','a:0','-show_entries','stream=duration:format=duration','-of','json',voice],{encoding:'utf8'}));
 const duration=[info.streams?.[0]?.duration,info.format?.duration].map(Number).find(n=>Number.isFinite(n)&&n>0);
 if(!info.streams?.length||!duration)throw Error('La narración debe contener una pista de audio con duración medible.');
 return duration;
}

async function render(context,voice,video,out){
 const {page,seek,project,duration}=context,fps=project.fps;
 const n=Math.ceil(duration*fps-1e-7);
 const dir=await fs.mkdtemp(path.join(out,'.frames-'));
 try{
  for(let i=0;i<n;i++){
   await seek(i);
   await page.screenshot({path:path.join(dir,String(i).padStart(5,'0')+'.jpg'),type:'jpeg',quality:89});
  }
  ff('ffmpeg',['-nostdin','-v','error','-framerate',String(fps),'-i',path.join(dir,'%05d.jpg'),'-i',voice,
   '-map','0:v:0','-map','1:a:0','-vf','scale=in_range=full:out_range=limited,format=yuv420p','-af','apad',
   '-c:v','libx264','-preset','fast','-threads','4','-crf','19','-c:a','aac','-b:a','160k',
   '-t',String(n/fps),'-movflags','+faststart',video],{timeout:300000});
 }finally{await fs.rm(dir,{recursive:true,force:true});}
}

export async function runAnimatic({storyboard,script,voice,words,existingProject,existingVideo,out,browserExecutable}){
 if(Boolean(existingProject)!==Boolean(existingVideo))throw Error('La revisión requiere el JSON y su MP4.');
 if(!storyboard||typeof storyboard!=='object')throw Error('Falta el storyboard.');
 const project=existingProject??compileAnimatic(storyboard,script,{words,fps:storyboard.fps??30});
 const normalized=validateProject(project);
 const duration=normalized.scenes.reduce((t,s)=>t+s.duration,0);
 const cuts=continuityPlan(storyboard.continuity,normalized);
 if(!existingProject&&Math.abs(audioDuration(voice)-duration)>1/normalized.fps+.025)
  throw Error('La duración de la narración no coincide con el storyboard.');
 await fs.mkdir(out,{recursive:false});
 const projectPath=path.join(out,'proyecto.json'),storyboardPath=path.join(out,'storyboard.json');
 await writeJson(projectPath,project);
 await writeJson(storyboardPath,storyboard);
 const video=existingVideo??path.join(out,'animatic.mp4');
 const report=await withAnimaticPage(project,{browserExecutable},async context=>{
  if(!existingVideo)await render(context,voice,video,out);
  const info=probeVideo(video);
  if(!info.fps||Math.abs(info.fps-context.project.fps)>.01||Math.abs(info.duration-duration)>1/context.project.fps+.025)
   throw Error('La cadencia o duración del MP4 no coincide con el proyecto.');
  return auditAnimaticContinuity(context,cuts,video,out);
 });
 report.projectSha256=await hash(projectPath);
 report.storyboardSha256=await hash(storyboardPath);
 report.videoSha256=await hash(video);
 await writeJson(path.join(out,'empalmes.json'),report);
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const {values:a}=parseArgs({options:Object.fromEntries(
   ['storyboard','script','voice','words','project','video','out','browser'].map(k=>[k,{type:'string'}])
  )});
  const reviewing=Boolean(a.project||a.video);
  if(!a.storyboard||!a.out||(reviewing?!(a.project&&a.video):!(a.script&&a.voice)))
   throw Error('Uso: npm run animatic -- --storyboard plan.json --script guion.txt --voice voz.m4a --out CARPETA_NUEVA [--words palabras.json] [--browser EJECUTABLE]\nRevisión de un render: --storyboard plan.json --project proyecto.json --video render.mp4 --out CARPETA_NUEVA');
  const storyboard=await readJson(a.storyboard);
  const wordFile=a.words?await readJson(a.words):undefined;
  const raw=reviewing?await readJson(a.project):null;
  const report=await runAnimatic({storyboard,script:a.script?await read(a.script):undefined,voice:a.voice&&path.resolve(a.voice),
   words:wordFile?.words??wordFile,existingProject:raw?.project??raw,existingVideo:a.video&&path.resolve(a.video),
   out:path.resolve(a.out),browserExecutable:a.browser});
  console.log(JSON.stringify({out:a.out,status:report.status,cuts:report.cuts.length},null,2));
  if(report.status==='review-required')process.exitCode=2;
 }catch(error){console.error(error.message);process.exitCode=1;}
}
