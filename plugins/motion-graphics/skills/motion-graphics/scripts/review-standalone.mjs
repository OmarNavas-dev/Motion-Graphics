import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {validateProject} from './compat/server-utils.mjs';
import {reviewTimes} from './runtime-review-utils.mjs';
import {compareScreenshotPixels} from './compare-png.mjs';

// Real DOM + GSAP fallback. This intentionally does not certify Motion Studio's
// exporter, audio, visual fidelity, or the host's media/resource pipeline.
const args=process.argv.slice(2),opt=k=>{const i=args.indexOf(k);return i<0?undefined:args[i+1];};
let browser;
const log=s=>{if(args.includes('--verbose'))console.log(s);};
try{
 if(!args[0]||!opt('--gsap')||!opt('--out'))throw Error('Uso: review-standalone.mjs proyecto.json --gsap archivo.js --out carpeta-nueva [--browser ejecutable] [--modules node_modules] [--dense-fps 6] [--scenes id1,id2]');
 const raw=JSON.parse(await fs.readFile(args[0],'utf8')),p=raw.project??raw;validateProject(p);
 const out=path.resolve(opt('--out'));try{await fs.access(out);throw Error('Elegir carpeta nueva.');}catch(e){if(e.code!=='ENOENT')throw e;}
 const modules=opt('--modules')??process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
 const req=createRequire(modules?path.join(path.resolve(modules),'__motion_review__.cjs'):import.meta.url);
 const {chromium}=req('playwright');
 const browserArgs=opt('--browser-args')?JSON.parse(await fs.readFile(opt('--browser-args'),'utf8')):args.includes('--single-process')?['--single-process','--no-zygote','--disable-dev-shm-usage','--in-process-gpu','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-features=NetworkServiceInProcess2','--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process']:[];
 if(!Array.isArray(browserArgs)||!browserArgs.every(v=>typeof v==='string'))throw Error('browser-args debe contener una lista JSON de argumentos.');
 log('Iniciando navegador');browser=await chromium.launch({headless:true,args:browserArgs,timeout:15000,...(opt('--browser')?{executablePath:opt('--browser')}:{})});log('Navegador disponible');
 await fs.mkdir(out,{recursive:true});
 const gsap=await fs.readFile(opt('--gsap'),'utf8'),W=p.format==='horizontal'?1280:720,H=p.format==='horizontal'?720:1280;
 const report={projectHash:crypto.createHash('sha256').update(JSON.stringify(p)).digest('hex'),engine:'standalone-dom-gsap',motionStudioExportVerified:false,runtimePassed:false,audioAlignmentVerified:false,artisticReview:'PENDING_IMAGE_AND_PLAYBACK_INSPECTION',samples:[],motionAudit:[],errors:[],warnings:[]};
 const denseFps=Number(opt('--dense-fps')??0),wanted=opt('--scenes')?.split(',');let offset=0,page;
 for(const scene of p.scenes){
  if(wanted&&!wanted.includes(scene.id)){offset+=scene.duration;continue;}
  log('Escena '+scene.id);page??=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});const errors=[];page.setDefaultTimeout(15000);page.removeAllListeners('pageerror');page.removeAllListeners('console');await page.goto('about:blank');log('Pagina creada');
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning'&&/not found/.test(m.text()))errors.push(m.text());});
  const root='.motion-scene',c=scene.customScene;
  const html=`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#070d21}.motion-scene{position:relative;width:${W}px;height:${H}px;overflow:hidden}${c.css.replaceAll('__SCENE__',root)}</style><div class="motion-scene">${c.html}</div>`;
  await page.setContent(html);await page.addScriptTag({content:gsap});log('DOM y GSAP cargados');
  await page.evaluate(({code,S,D})=>{const tl=gsap.timeline({paused:true});new Function('tl','S','T0','D','gsap',code)(tl,S,0,D,gsap);window.__reviewTimeline=tl;},{code:c.script,S:root,D:scene.duration});
  await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Font loading timed out')),15000))]));
  const natural=await page.evaluate(()=>window.__reviewTimeline.duration());
  const overflow=Math.max(0,natural-scene.duration);report.motionAudit.push({scene:scene.id,naturalDuration:natural,assignedDuration:scene.duration,overflow});if(overflow>.001)report.errors.push(scene.id+': animaciones fuera de duración.');
  const times=reviewTimes(scene,{fps:p.fps??24,denseFps});
  const explicit=(opt('--times')??'').split(',').filter(Boolean).map(Number);for(const t of explicit){if(!Number.isFinite(t)||t<0||t>=scene.duration)throw Error('Tiempo local invalido.');times.push(t);}times.sort((a,b)=>a-b);
  for(const [i,t]of [...new Set(times)].entries()){
   await page.evaluate(t=>{window.__reviewTimeline.time(t,false);},t);
   const start=Date.now(),first=await page.screenshot({type:'png'}),file=`${scene.id}-${String(i).padStart(4,'0')}.png`;await fs.writeFile(path.join(out,file),first);
   const state=await page.evaluate(()=>{const nodes=[...document.querySelectorAll('[data-motion-actor],[data-character-id]')];return {actors:nodes.map(n=>{const r=n.getBoundingClientRect();return {id:n.dataset.motionActor??n.dataset.characterId,x:r.x,y:r.y,width:r.width,height:r.height,outside:r.right<0||r.left>innerWidth||r.bottom<0||r.top>innerHeight};}),nodes:document.querySelectorAll('*').length,filters:document.querySelectorAll('filter').length};});
   await page.evaluate(t=>{const tl=window.__reviewTimeline;tl.time(t+.31,false);tl.time(Math.max(0,t-.21),false);tl.time(t,false);},t);
   const again=await page.screenshot({type:'png'}),pixelComparison=compareScreenshotPixels(first,again),deterministic=pixelComparison.passed;
   if(!deterministic)report.errors.push(`${scene.id} @${t}: imagen depende del historial temporal.`);
   report.samples.push({scene:scene.id,time:offset+t,localTime:t,file,deterministic,pixelComparison,...state,captureAndCheckMs:Date.now()-start});
  }
  for(const e of errors)report.errors.push(scene.id+': '+e);
  offset+=scene.duration;
 }
 report.errors=[...new Set(report.errors)];report.runtimePassed=!report.errors.length;
 if(wanted)report.warnings.push('Solo se revisaron las escenas seleccionadas.');
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 await fs.writeFile(path.join(out,'review.html'),`<!doctype html><meta charset="utf-8"><title>Revisión temporal</title><style>body{background:#101827;color:#edf4ff;font:16px system-ui}main{display:flex;flex-wrap:wrap;gap:16px}figure{margin:0;width:260px}img{width:100%}figcaption{padding:8px}</style><h1>Revisión de imágenes y continuidad</h1><p>La estabilidad técnica no aprueba el dibujo, ritmo o audio. Abrir las muestras consecutivas, comparar con referencia y registrar defectos.</p><main>${report.samples.map(s=>`<figure><img src="${s.file}"><figcaption>${escape(s.scene)} · ${s.localTime.toFixed(3)} s</figcaption></figure>`).join('')}</main>`);
 console.log(JSON.stringify({runtimePassed:report.runtimePassed,samples:report.samples.length,errors:report.errors,report:path.join(out,'report.json')},null,2));process.exitCode=report.runtimePassed?0:1;
}catch(e){console.error(e.stack??e.message);process.exitCode=1;}finally{await browser?.close();}
