import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
const exec=promisify(execFile);
const round=n=>Number(n.toFixed(3));
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function planSceneSamples(project,{maxFrames=36}={}) {
 if(!Array.isArray(project?.scenes))throw Error('Proyecto sin escenas.');
 const samples=[];let offset=0;
 for(const scene of project.scenes){
  const duration=Number(scene.duration);
  if(!Number.isFinite(duration)||duration<=0)throw Error('Duración de escena inválida.');
  const points=[.08,.5,.92].map(t=>offset+Math.min(duration-.01,Math.max(.01,duration*t)));
  for(const time of points)samples.push({scene:scene.id||'escena',seconds:round(time),localSeconds:round(time-offset)});
  offset+=duration;
 }
 if(samples.length>maxFrames) {
  const indices=new Set(Array.from({length:maxFrames},(_,i)=>Math.round(i*(samples.length-1)/Math.max(1,maxFrames-1))));
  return [...indices].sort((a,b)=>a-b).map(i=>samples[i]);
 }
 return samples;
}
// Generates PNG frames plus a browser-openable contact sheet: no extra packages.
export async function createFrameContactSheet(video,project,outputDir,{maxFrames=36}={}){
 const frames=planSceneSamples(project,{maxFrames});
 await fs.mkdir(outputDir,{recursive:true});
 const errors=[],completed=[];
 for(let i=0;i<frames.length;i++){
  const sample=frames[i],file=String(i+1).padStart(3,'0')+'.png';
  try{
   await exec('ffmpeg',['-hide_banner','-loglevel','error','-ss',String(sample.seconds),'-i',video,'-frames:v','1','-vf','scale=270:-2','-y',path.join(outputDir,file)],{windowsHide:true,timeout:45000});
   completed.push({...sample,file});
  }catch(error){errors.push({scene:sample.scene,seconds:sample.seconds,error:error.message});}
 }
 const report={video:path.basename(video),totalRequested:frames.length,captured:completed.length,frames:completed,errors,
  note:'Inspección visual asistida: requiere observar imágenes y corregir; los fotogramas no certifican estética.'};
 await fs.writeFile(path.join(outputDir,'report.json'),JSON.stringify(report,null,2));
 const blocks=completed.map(f=>'<figure><img loading="lazy" src="'+f.file+'"><figcaption>'+escapeHtml(f.scene)+' · '+f.seconds.toFixed(3)+' s</figcaption></figure>').join('\n');
 const html='<!doctype html><html lang="es"><meta charset="utf-8"><title>Revisión de escenas</title><style>body{background:#111827;color:#f9fafb;font:15px system-ui;padding:24px}section{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px}figure{margin:0;background:#1f2937;border-radius:10px;overflow:hidden}img{width:100%;display:block}figcaption{padding:12px}</style><h1>Hoja de contactos · '+escapeHtml(path.basename(video))+'</h1><p>'+completed.length+' fotogramas, principio, mitad y final de cada escena. Revisar continuidad y composición.</p><section>'+blocks+'</section></html>';
 await fs.writeFile(path.join(outputDir,'index.html'),html);
 return {...report,folder:outputDir,index:path.join(outputDir,'index.html')};
}
