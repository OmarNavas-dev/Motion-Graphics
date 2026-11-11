import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {probeVideo} from './video-evidence.mjs';

const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const option=(args,k)=>{const i=args.indexOf('--'+k);return i>=0?args[i+1]:null;};
const safe=x=>String(x).replace(/[^a-z0-9_-]/gi,'_').slice(0,44);
const call=(cmd,args)=>execFileSync(cmd,args,{encoding:'utf8',maxBuffer:1024*1024});

function still(video,t,out){
 call('ffmpeg',['-hide_banner','-loglevel','error','-ss',String(t),'-i',video,
  '-frames:v','1','-vf','scale=360:-2','-y',out]);
 if(!fs.statSync(out,{throwIfNoEntry:false})?.size)throw Error('No se pudo extraer un fotograma a '+t+' s de '+video);
}
export function samplePilot({video,storyboard,out,reference=null,maxSeconds=12,startSeconds=0}){
 if(!storyboard||!Array.isArray(storyboard.shots)||!storyboard.shots.length)
  throw Error('Se requiere un storyboard con planos antes de revisar el piloto.');
 if(!Number.isFinite(startSeconds)||startSeconds<0||!Number.isFinite(maxSeconds)||maxSeconds<=0)
  throw Error('El inicio global debe ser no negativo y la duración máxima, positiva.');
 const target=path.resolve(out||'pilot-review-v3');
 if(fs.existsSync(target)&&fs.readdirSync(target).length)
  throw Error('La carpeta de salida ya contiene archivos: '+target+'. Elegir otra.');
 const {duration,fps}=probeVideo(video);
 const end=Math.min(startSeconds+Math.min(maxSeconds,duration),storyboard.duration??Infinity);
 const lastFrameTime=Math.max(0,duration-1/(fps??30));
 const picks=[],seen=new Set();
 const add=(globalAt,label,shotId)=>{
  const at=Math.min(Math.round((globalAt-startSeconds)*1e6),Math.floor(lastFrameTime*1e6))/1e6;
  const key=at+'|'+shotId;
  if(seen.has(key))return;
  seen.add(key);
  picks.push({at,globalAt:Math.round((startSeconds+at)*1e6)/1e6,label,shotId});
 };
 for(const shot of storyboard.shots){
  if(!Number.isFinite(shot.start)||!Number.isFinite(shot.end))continue;
  const first=Math.max(shot.start,startSeconds),last=Math.min(shot.end,end);
  if(last<=first)continue;
  const midpoint=(first+last)/2;
  add(Math.min(first+.12,midpoint),'Inicio: '+shot.visualPurpose,shot.id);
  for(const phase of shot.phases??[]){
   if(!['cause','contact','reaction','result'].includes(phase.kind))continue;
   const phaseStart=Math.max(phase.start,first),phaseEnd=Math.min(phase.end,last);
   if(phaseEnd>phaseStart)add((phaseStart+phaseEnd)/2,phase.kind+': '+phase.change,shot.id);
  }
  add(Math.max(last-.12,midpoint),'Salida y raccord: '+shot.raccord,shot.id);
 }
 if(!picks.length)throw Error('El clip no coincide con ningún plano. Indica el segundo global de inicio con --start.');
 picks.sort((a,b)=>a.at-b.at);
 const limited=picks.slice(0,42);
 const referenceInfo=reference?probeVideo(reference):null;
 fs.mkdirSync(target,{recursive:true});
 for(const [i,p] of limited.entries()){
  const name=String(i+1).padStart(2,'0')+'-'+safe(p.shotId)+'-'+String(p.at).replace('.','_')+'.png';
  still(video,p.at,path.join(target,name));p.image=name;
 }
 const refs=[];
 if(referenceInfo){
  const d=referenceInfo.duration;
  for(let i=0;i<4;i++){
   const at=Math.floor(Math.min(Math.max(0,d-1/(referenceInfo.fps??30)),(i+.5)*d/4)*1e6)/1e6,name='referencia-'+i+'.png';
   still(reference,at,path.join(target,name));refs.push({at,image:name});
  }
 }
 const images=limited.map(p=>'<figure><img src="'+esc(p.image)+'" loading="lazy"><figcaption><strong>'+esc(p.at.toFixed(2))+' s del clip / '+esc(p.globalAt.toFixed(2))+' s del proyecto · '+esc(p.shotId)+'</strong><p>'+esc(p.label)+'</p></figcaption></figure>').join('');
 const benchmarks=refs.map(p=>'<figure><img src="'+esc(p.image)+'"><figcaption>Referencia, '+esc(p.at.toFixed(2))+' s</figcaption></figure>').join('');
 const html='<!doctype html><html lang="es"><meta charset="utf-8"><title>Revisión piloto v3</title>'+
  '<style>body{margin:24px;background:#111827;color:#eef2ff;font:16px system-ui}h1,h2{margin:25px 0 10px}'+
  '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(195px,1fr));gap:12px}'+
  'figure{background:#273448;border:1px solid #43516b;padding:8px;margin:0;border-radius:8px}img{width:100%;height:auto}'+
  'figcaption{font-size:12px}p{font-size:12px;margin:4px 0;color:#c7d2fe}</style>'+
  '<h1>Revisión de piloto · SIN APROBACIÓN AUTOMÁTICA</h1>'+
  '<p>Inspecciona contacto, articulaciones, oclusión, continuidad y semejanza con las referencias. Reproduce el MP4 también.</p>'+
  '<h2>Fotogramas del proyecto</h2><div class="grid">'+images+'</div>'+
  (refs.length?'<h2>Referencia (muestras temporales, no planos equivalentes)</h2><div class="grid">'+benchmarks+'</div>':'')+
  '<h2>Decisión</h2><p>Registrar por escrito los defectos y corregirlos. No marcar approved:true por generar esta página.</p></html>';
 fs.writeFileSync(path.join(target,'review.html'),html,'utf8');
 const report={schema:'motion-studio.pilot-frames/v3',video:path.resolve(video),reference:reference?path.resolve(reference):null,
  visualApproved:false,reviewRequired:true,startSeconds,samples:limited,referenceSamples:refs,
  note:'Imagen fija y HTML solo facilitan inspección: no juzgan anatomía ni fluidez.'};
 fs.writeFileSync(path.join(target,'review.json'),JSON.stringify(report,null,2),'utf8');
 return {out:target,frames:limited.length,referenceFrames:refs.length,visualApproved:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2),video=option(args,'video'),plan=option(args,'storyboard'),out=option(args,'out');
  if(!video||!plan||!out)throw Error('Uso: sample-pilot-v3.mjs --video render.mp4 --storyboard storyboard.json --out carpeta-nueva [--reference ref.mp4] [--start 29.45] [--max 12]');
  const result=samplePilot({video,storyboard:read(plan),out,reference:option(args,'reference'),
   maxSeconds:Number(option(args,'max')??12),startSeconds:Number(option(args,'start')??0)});
  console.log(JSON.stringify(result,null,2));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
