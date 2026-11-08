import fs from 'node:fs/promises';
import {observeMotionCheckpoints} from './compat/scripts/observe-motion.mjs';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import crypto from 'node:crypto';
import {reviewTimes} from './runtime-review-utils.mjs';
import {compareScreenshotPixels} from './compare-png.mjs';
import {closeRenderBrowser,renderBrowserArgs} from './compat/scripts/render-browser.mjs';

// Runtime evidence, not an artistic score. Reuses an available Motion Studio checkout.
const args=process.argv.slice(2),option=flag=>{const i=args.indexOf(flag);return i<0?undefined:args[i+1];};
let browser,server;
try {
 if(!args[0]||!option('--repo')||!option('--out'))throw Error('Uso: node review-project.mjs proyecto.json --repo MOTION_STUDIO --out CARPETA_NUEVA [--browser EJECUTABLE] [--scenes id1,id2] [--times segundosGlobales]');
 const repo=path.resolve(option('--repo')),out=path.resolve(option('--out'));
 try{await fs.access(out);throw Error('La carpeta de salida ya existe; elegir otra.');}catch(e){if(e.code!=='ENOENT')throw e;}
 const raw=JSON.parse((await fs.readFile(args[0],'utf8')).replace(/^\uFEFF/,'')),p=raw.project??raw;
 const {validateProject}=await import(pathToFileURL(path.join(repo,'server-utils.mjs')).href);
 validateProject(p); // Do not execute unvalidated attached code.
 const {exportHyperframesProject}=await import(pathToFileURL(path.join(repo,'src/hyperframes-bridge.mjs')).href);
 const {collectProjectAssets,BUNDLED_FONT_FACES=[]}=await import(pathToFileURL(path.join(repo,'src/project-assets.mjs')).href);
 const {ensureBrowser}=createRequire(path.join(repo,'package.json'))('@remotion/renderer');
 const {launch}=createRequire(path.join(repo,'package.json'))('puppeteer-core');
 const assets=new Set(collectProjectAssets(p));
 for(const [,file] of BUNDLED_FONT_FACES){try{await fs.access(path.join(repo,'public',file));assets.add(file);}catch(e){if(e.code!=='ENOENT')throw e;}}
 let html=exportHyperframesProject(p,undefined,await fs.readFile(path.join(repo,'public/hyperframes/gsap.min.js'),'utf8'),Object.fromEntries([...assets].map(a=>[a,'/'+a])));
 html=html.replace('<head>','<head><script>window.__dvjErrors=[];addEventListener("error",e=>window.__dvjErrors.push(e.message));const oldError=console.error;console.error=(...a)=>{window.__dvjErrors.push(a.map(String).join(" "));oldError(...a);};const oldWarn=console.warn;console.warn=(...a)=>{const s=a.map(String).join(" ");if(s.includes("not found")&&/#hf-scene-\\d+\\s+\\S+/.test(s))window.__dvjErrors.push(s);oldWarn(...a);};</script>');
 const missing=[];
 server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; media-src 'self'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'");return res.end(html);}
  const a=decodeURIComponent(url.pathname.slice(1));if(!assets.has(a)){res.writeHead(404);return res.end();}
  const file=path.resolve(repo,'public',a),base=path.resolve(repo,'public')+path.sep;
  if(!file.startsWith(base))throw Error('Ruta fuera de public.');
  const bytes=await fs.readFile(file);res.setHeader('Content-Type',({'.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4'}[path.extname(file)]??'application/octet-stream'));res.end(bytes);
 }catch{missing.push(req.url);res.writeHead(404);res.end();}});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 await fs.mkdir(out,{recursive:true});
 let browserPath=option('--browser');
 if(!browserPath&&!process.env.MOTION_STUDIO_BROWSER){try{browserPath=(await ensureBrowser({onBrowserDownload:()=>{throw Error('No se descargan navegadores durante la revisión.');}})).path;}catch{}}
 if(!browserPath)for(const candidate of [process.env.CHROME_PATH,'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe','/usr/bin/chromium','/usr/bin/google-chrome','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean)){
  try{await fs.access(candidate);browserPath=candidate;break;}catch{}
 }
 if(!browserPath)throw Error('No hay navegador instalado detectado. Usar --browser con un ejecutable disponible; esta herramienta no descarga uno.');
 browser=await launch({executablePath:browserPath,headless:'shell',args:renderBrowserArgs()});
 const page=await browser.newPage();
 // Logical design size is preserved; gallery also displays frames at phone width.
 const width=Number(html.match(/data-width="(\d+)"/)?.[1]??(p.format==='horizontal'?1280:720));
 const height=Number(html.match(/data-height="(\d+)"/)?.[1]??(p.format==='horizontal'?720:1280));
 await page.setViewport({width,height,deviceScaleFactor:1});
 await page.goto('http://127.0.0.1:'+server.address().port,{timeout:30000,waitUntil:'load'});
 await page.evaluate(async()=>{await document.fonts.ready;});
 const timelineDuration=await page.evaluate(()=>window.__timelines?.['motion-studio-7']?.duration());
 const expected=p.scenes.reduce((s,c)=>s+c.duration,0),errors=[];
 const duplicateIds=await page.evaluate(()=>{const seen=new Set(),duplicates=[];for(const n of document.querySelectorAll('[id]')){if(seen.has(n.id))duplicates.push(n.id);seen.add(n.id);}return [...new Set(duplicates)];});
 if(duplicateIds.length)errors.push('IDs repetidos en el documento: '+duplicateIds.join(', '));
 if(!Number.isFinite(timelineDuration))throw Error('No se inicializo la timeline.');
 if(Math.abs(timelineDuration-expected)>1/(p.fps??24)+.001)errors.push('Timeline '+timelineDuration+' s != escenas '+expected+' s.');
 const wanted=option('--scenes')?.split(','),samples=[],warnings=[];
 let start=0;
 for(const [i,s] of p.scenes.entries()){
  const body=(s.customScene?.script??'').split('{const groups=')[0];
  for(const tag of (s.customScene?.html??'').match(/<g\b[^>]*\btransform=[^>]+>/g)??[]){
    const classes=tag.match(/\bclass=["']([^"']+)/)?.[1].split(/\s+/)??[];
    for(const cls of classes)if(body.includes(' .'+cls)&&/\b(?:x|y|scale|rotation)\s*["']?\s*:/.test(body))warnings.push({scene:s.id,reason:'Revisar '+cls+': grupo con transform de colocacion y selector animado. Envolver colocacion fija y animar un hijo; podria haber sobrescritura de posicion.'});
  }
  if(!wanted||wanted.includes(s.id))for(const local of reviewTimes(s,{fps:p.fps??24,denseFps:Number(option('--dense-fps')??0)}))samples.push({scene:s.id,sceneIndex:i,time:start+local,fraction:null});
  start+=s.duration;
 }
 for(const text of (option('--times')??'').split(',').filter(Boolean)){
  const time=Number(text);if(!Number.isFinite(time)||time<0||time>=expected)throw Error('Tiempo de muestra invalido: '+text);
  let offset=0;const index=p.scenes.findIndex(s=>{const hit=time>=offset&&time<offset+s.duration;offset+=s.duration;return hit;});
  samples.push({scene:p.scenes[index].id,sceneIndex:index,time,fraction:null});
 }
 samples.sort((a,b)=>a.time-b.time);
 const seek=async time=>page.evaluate(async t=>{
  const tl=window.__timelines['motion-studio-7'];tl.time(t,false);
  document.querySelectorAll('.clip').forEach(c=>{const s=+c.dataset.start||0,d=+c.dataset.duration||0;c.style.display=t>=s&&t<s+d?'':'none';});
  await Promise.all([...document.querySelectorAll('video')].map(async video=>{
    if(video.readyState<1)return;
    const local=Math.max(0,Math.min(video.duration-.001,t-(+video.dataset.start||0)));
    if(!Number.isFinite(local)||Math.abs(video.currentTime-local)<.001)return;
    await new Promise(resolve=>{video.addEventListener('seeked',resolve,{once:true});video.currentTime=local;setTimeout(resolve,2000);});
  }));
  const clipped=[];
  for(const group of document.querySelectorAll('.dvj-caption')){
   if(getComputedStyle(group).visibility==='hidden'||getComputedStyle(group.closest('.clip')).display==='none')continue;
   for(const w of group.querySelectorAll('.dvj-word'))if(getComputedStyle(w).display!=='none'){
    const r=w.getBoundingClientRect();if(r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight)clipped.push(w.textContent);
   }
  }
  const actors=[...document.querySelectorAll('.clip')].filter(c=>getComputedStyle(c).display!=='none').flatMap(c=>[...c.querySelectorAll('[data-motion-actor],[data-character-id],.hero,.ghost,.person,.child,.door,.piston')].map(n=>{const r=n.getBoundingClientRect();return {class:n.getAttribute('class'),x:r.x,y:r.y,width:r.width,height:r.height,outside:r.right<0||r.left>innerWidth||r.bottom<0||r.top>innerHeight};}));
  const rigAnchors=[...document.querySelectorAll('[data-dvj-joint],[data-dvj-held]')].filter(n=>getComputedStyle(n.closest('.clip')).display!=='none').map(n=>{const m=n.getCTM();return {class:n.getAttribute('class'),type:n.hasAttribute('data-dvj-joint')?'joint':'held',x:m.e,y:m.f};});
  return {clipped,actors,rigAnchors,errors:window.__dvjErrors};
 },time);
 const screenshot=async()=>Buffer.from(await page.screenshot({type:'png'}));
 for(const [i,sample] of samples.entries()){
  const state=await seek(sample.time);sample.file=String(i).padStart(3,'0')+'.png';sample.clippedWords=state.clipped;sample.actorBounds=state.actors;sample.rigAnchors=state.rigAnchors;
  const offset=p.scenes.slice(0,sample.sceneIndex).reduce((sum,s)=>sum+s.duration,0);
  const motion=await page.evaluate(observeMotionCheckpoints,{sceneIndex:sample.sceneIndex,local:sample.time-offset,actions:p.scenes[sample.sceneIndex].direction?.actions??[]});
  sample.motionObservations=motion.observations;
  errors.push(...motion.errors.map(e=>sample.scene+' @'+sample.time+': '+e));
  if(state.clipped.length)errors.push(sample.scene+' @'+sample.time+': texto fuera del lienzo.');
  await fs.writeFile(path.join(out,sample.file),await screenshot());
  {const first=await screenshot();await seek(Math.min(expected-.001,sample.time+.3));await seek(Math.max(0,sample.time-.17));await seek(sample.time);sample.pixelComparison=compareScreenshotPixels(first,await screenshot());sample.deterministic=sample.pixelComparison.passed;if(!sample.deterministic)errors.push(sample.scene+' @'+sample.time+': fotograma cambia tras saltos temporales.');}
  if(i%9===0)console.log('Capturas '+(i+1)+'/'+samples.length);
 }
 for(const sample of [...samples].reverse().filter(s=>s.motionObservations?.length)){
  await seek(sample.time);
  const offset=p.scenes.slice(0,sample.sceneIndex).reduce((sum,s)=>sum+s.duration,0);
  const motion=await page.evaluate(observeMotionCheckpoints,{sceneIndex:sample.sceneIndex,local:sample.time-offset,actions:p.scenes[sample.sceneIndex].direction?.actions??[]});
  sample.backwardPassed=!motion.errors.length;
  errors.push(...motion.errors.map(e=>sample.scene+' busqueda inversa: '+e));
 }
 const runtime=await page.evaluate(()=>[...window.__dvjErrors,...(window.__motionStudioErrors??[])]);
 errors.push(...runtime,...missing.map(a=>'Recurso no disponible: '+a));
 const motionAudit=await page.evaluate(()=>{
   const result=[],master=window.__timelines['motion-studio-7'],seen=new Set();
   const entries=window.__motionStudioSceneTimelines?.map(r=>({clock:r.timeline,assigned:r.duration,id:r.id}))??master.getChildren(false,true,false).flatMap(driver=>driver.targets().map(clock=>({clock,assigned:driver.duration()})));
   for(const {clock,assigned,id} of entries){
     if(!clock||typeof clock.getChildren!=='function'||seen.has(clock))continue;seen.add(clock);
     const children=clock.getChildren(true,true,false),nodes=children.flatMap(t=>t.targets()).filter(n=>n?.nodeType===1);
     const scene=id??nodes.map(n=>n.closest?.('.clip')?.id).find(Boolean)??'unknown';
     const natural=clock.duration();
     const fixedMoved=[];
     for(const tween of children)for(const node of tween.targets()){
       if(node?.hasAttribute?.('data-dvj-placement')&&['x','y','scale','scaleX','scaleY','rotation','transform'].some(k=>k in tween.vars))fixedMoved.push(node.getAttribute('data-dvj-placement'));
     }
     result.push({scene,assignedDuration:assigned,naturalDuration:natural,overflow:Math.max(0,natural-assigned),fixedPlacementAnimated:[...new Set(fixedMoved)]});
   }return result;
 });
 for(const row of motionAudit){
   if(row.overflow>.001)errors.push(row.scene+': animaciones exceden el clip en '+row.overflow.toFixed(3)+' s; revisar fases y repeats/stagger.');
   if(row.fixedPlacementAnimated.length)errors.push(row.scene+': se anima la colocacion fija del rig '+row.fixedPlacementAnimated.join(', '));
 }
 const report={motionAudit,projectHash:crypto.createHash('sha256').update(JSON.stringify(p)).digest('hex'),runtimePassed:!errors.length,artisticReview:'PENDING_HUMAN_OR_MODEL_IMAGE_INSPECTION',audioAlignmentVerified:false,expectedDuration:expected,timelineDuration,samples,warnings,errors:[...new Set(errors)]};
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 await fs.writeFile(path.join(out,'review.html'),'<!doctype html><meta charset="utf-8"><title>Revision visual</title><style>body{background:#101318;color:white;font:16px Arial}main{display:flex;flex-wrap:wrap;gap:16px}figure{margin:0;width:360px}img{width:100%}figcaption{padding:8px}</style><h1>Revision pendiente de las imagenes</h1><p>El chequeo de ejecucion no certifica arte, anatomia, movimiento ni alineacion de audio.</p><main>'+samples.map(s=>'<figure><img src="'+s.file+'"><figcaption>'+escape(s.scene)+' · '+s.time+' s · '+s.fraction+'</figcaption></figure>').join('')+'</main>');
 console.log(JSON.stringify({runtimePassed:report.runtimePassed,errors:report.errors,samples:samples.length,report:path.join(out,'report.json')}));
 process.exitCode=errors.length?1:0;
}catch(e){console.error(e.message);process.exitCode=1;}finally{if(server)server.closeAllConnections();try{await closeRenderBrowser(browser);}finally{if(server)await new Promise(r=>server.close(r));}}


