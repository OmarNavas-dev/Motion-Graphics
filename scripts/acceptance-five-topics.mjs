#!/usr/bin/env node
// Five deterministic cross-domain acceptance fixtures. Technical checks never certify artistic quality.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateProject} from '../server-utils.mjs';
import {checkCustomScenePreflight} from '../src/custom-scene-preflight.mjs';
import {auditVisualDirection} from '../src/visual-direction-audit.mjs';
import {exportHyperframesProject} from '../src/hyperframes-bridge.mjs';
import {createFrameContactSheet} from '../src/quality-contact-sheet.mjs';
import {auditRenderedVideo} from '../src/render-quality-audit.mjs';
import {auditTimelineAudio,measureAudioLoudness} from '../src/audio-quality-audit.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const COLOR={anatomia:'#fa627c',volcanes:'#fa8c4a',personajes:'#76b9eb',historia:'#eebd6e',graficos:'#70dfb4'};
const subjects={
 anatomia:{title:'Latido y circulación',label:'CORAZÓN',shape:'<path class="subject" d="M360 770 C180 625 230 435 360 545 C490 435 540 625 360 770Z" fill="#fa627c"/><circle class="pulse" cx="360" cy="628" r="35" fill="#fff2cf"/>'},
 volcanes:{title:'La presión del magma',label:'VOLCÁN',shape:'<path class="subject" d="M100 940 L316 510 L410 510 L620 940Z" fill="#4b5666"/><path class="pulse" d="M353 840L353 500" stroke="#fa8c4a" stroke-width="48"/>'},
 personajes:{title:'Caminar y apoyar el pie',label:'PERSONAJE',shape:'<circle cx="360" cy="420" r="48" fill="#f5c096"/><path class="subject" d="M360 468L360 700 M360 540L270 610 M360 540L450 610 M360 700L280 880 M360 700L450 880" stroke="#76b9eb" stroke-width="30" fill="none" stroke-linecap="round"/><circle data-dvj-foot="izquierdo" data-dvj-contact="planted" cx="280" cy="880" r="6" fill="#fff"/><circle data-dvj-foot="derecho" data-dvj-contact="air" cx="450" cy="880" r="6" fill="#fff"/><circle class="pulse" cx="360" cy="550" r="10" fill="#fff"/>'},
 historia:{title:'Un manuscrito histórico',label:'HISTORIA',shape:'<rect class="subject" x="190" y="480" width="340" height="440" rx="18" fill="#d6bea0"/><path class="pulse" d="M225 540H490M225 590H490M225 640H470M225 690H490" stroke="#645246" stroke-width="15"/>'},
 graficos:{title:'Datos que crecen',label:'GRÁFICOS',shape:'<rect class="subject" x="170" y="600" width="100" height="340" fill="#70dfb4"/><rect x="310" y="460" width="100" height="480" fill="#55a9cf"/><rect x="450" y="700" width="100" height="240" fill="#caa0ff"/><circle class="pulse" cx="360" cy="450" r="20" fill="#fff"/>'}
};
export function makeAcceptanceFixtures(){
 return Object.entries(subjects).map(([topic,theme])=>{
  const scene=i=>({
   id:topic+'-'+i,duration:3,title:theme.title,scriptExcerpt:theme.title,
   approved:false,transition:i===2&&['anatomia','historia'].includes(topic)?'fade':'cut',captionMode:'none',
   customScene:{html:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 1280"><rect width="720" height="1280" fill="#101d2e"/><g class="world">'+theme.shape+'</g><text x="360" y="290" text-anchor="middle" fill="'+COLOR[topic]+'" font-size="36">'+theme.label+'</text></svg>',css:'',script:i===1?'tl.fromTo(S+\' .pulse\',{opacity:.5},{opacity:1,duration:1.2,yoyo:true,repeat:1},T0+.2);':''},
   direction:{objective:'Mostrar la relación de causa y efecto: '+theme.title,before:{},after:{},actions:i===2?[{id:'mostrar-'+topic,at:.3,duration:1.2,selector:'.pulse',description:'Revelar foco',result:'Foco visible',motion:{from:{opacity:.2},to:{opacity:1}}}]:[],shots:[{at:0,duration:1.5,scale:'wide',target:'world',purpose:'Contexto'},{at:1.5,duration:1.5,scale:'close',target:'world',purpose:'Detalle'}],cameraTarget:'.world'}
  });
  return {topic,project:{name:'Aceptación '+topic,format:'vertical',resolution:'720p',fps:24,showText:false,script:theme.title,creativeBrief:'Prueba técnica reproducible, no aprobada artísticamente.',scenes:[scene(1),scene(2)]}};
 });
}
const run=(bin,args,cwd)=>new Promise((resolve,reject)=>{
 const child=spawn(bin,args,{cwd,windowsHide:true,stdio:'pipe'});let log='';
 child.stdout.on('data',x=>log+=x.toString().slice(-2500));
 child.stderr.on('data',x=>log+=x.toString().slice(-2500));
 child.on('error',reject);child.on('close',code=>code===0?resolve(log):reject(Error('Error '+code+': '+log.slice(-1200))));
});
export async function runAcceptanceSuite({out=path.join(root,'out','acceptance-five-topics'),runtime=false,render=false}={}){
 await fs.mkdir(out,{recursive:true});
 const gsap=await fs.readFile(path.join(root,'public','hyperframes','gsap.min.js'),'utf8');
 const results=[];
 for(const {topic,project:raw} of makeAcceptanceFixtures()){
  const r={topic,json:'pending',contract:'pending',browser:'not-run',mp4:'not-run',inspection:'not-run',visualApproval:false,errors:[]};
  results.push(r);
  try{
   const project=validateProject(raw);r.json='passed';
   const preflight=checkCustomScenePreflight(project);if(!preflight.passed)throw Error(preflight.errors.join('; '));
   r.directionAudit=auditVisualDirection(project);
   r.audioTimingAudit=auditTimelineAudio(project);
   const folder=path.join(out,topic);await fs.mkdir(folder,{recursive:true});
   await fs.writeFile(path.join(folder,'project.json'),JSON.stringify(project,null,2));
   const html=exportHyperframesProject(project,undefined,gsap);
   if(!html.includes('window.__timelines'))throw Error('Timeline GSAP ausente.');
   await fs.writeFile(path.join(folder,'index.html'),html);r.contract='passed';
   if(runtime||render){
    const {reviewExplainer}=await import('./review-explainer.mjs');
    const review=await reviewExplainer(project,{outputDir:path.join(folder,'browser')});
    r.browser=review.passed?'passed':'failed';if(!review.passed)throw Error(review.errors.join('; '));
   }
   if(render){
    const cli=path.join(root,'node_modules','hyperframes','bin','hyperframes.mjs');
    await run(process.execPath,[cli,'render','--output','result.mp4','--fps','24','--quality','standard','--workers','1','--no-browser-gpu'],folder);
    r.mp4='passed';r.videoAudit=await auditRenderedVideo(path.join(folder,'result.mp4'));
    if(r.videoAudit.video.audioPresent)r.loudness=await measureAudioLoudness(path.join(folder,'result.mp4'));
    const sheet=await createFrameContactSheet(path.join(folder,'result.mp4'),project,path.join(folder,'frames'),{maxFrames:12});
    r.inspection=sheet.captured===sheet.totalRequested?'frames-generated':'partial';r.reviewFile=path.join(folder,'frames','index.html');
   }
  }catch(error){r.errors.push(error.message);for(const stage of ['json','contract','browser','mp4','inspection'])if(r[stage]==='pending')r[stage]='failed';}
 }
 const report={timestamp:new Date().toISOString(),runtimeRequested:runtime,renderRequested:render,visualApproval:false,tests:results,
  note:'Los cinco casos verifican compatibilidad y render técnico. La evaluación artística requiere inspección humana de los fotogramas.'};
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
 return report;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const args=process.argv.slice(2),i=args.indexOf('--out');
 const report=await runAcceptanceSuite({out:i>=0?path.resolve(args[i+1]):undefined,runtime:args.includes('--runtime'),render:args.includes('--render')});
 console.log(JSON.stringify(report,null,2));
 if(report.tests.some(x=>x.errors.length))process.exitCode=1;
}
