import {listStylePresets,getStylePreset,getStyleGuide} from './src/style-catalog.mjs';
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {spawn, spawnSync} from 'node:child_process';
import {pipeline} from 'node:stream/promises';
import {buildPreviewHtml} from './preview-player.mjs';
import {collectProjectAssets, BUNDLED_FONT_FACES} from './src/project-assets.mjs';
import {MOTION_STUDIO_CONTRACT} from './src/motion-capabilities.mjs';
import {hyperframesProgress} from './src/hyperframes-progress.mjs';
import {Transform} from 'node:stream';
import {
  MAX_ASSET_BYTES, MAX_PROJECT_BYTES, assetExtension,
  validMediaSignature, validateProject, assertApproved, safeFilename, validateAsset,
} from './server-utils.mjs';
import {searchFreeMedia, downloadFreeMedia, transcribeWithGroq} from './cloud-integrations.mjs';
import {aiPlannerConfig, requestAiPlan, requestSceneCode, requestFullVideoCode} from './ai-planner.mjs';
import {exportHyperframesProject} from './src/hyperframes-bridge.mjs';
import {checkCustomScenePreflight} from './src/custom-scene-preflight.mjs';
import {auditVisualDirection} from './src/visual-direction-audit.mjs';
import {auditRenderedVideo} from './src/render-quality-audit.mjs';
import {auditLoopSeam} from './src/loop-quality-audit.mjs';
import {auditRenderedPacing} from './src/pacing-quality-audit.mjs';
import {renderSoundWav,muxSoundtrack} from './src/sound-design.mjs';
import {createFrameContactSheet} from './src/quality-contact-sheet.mjs';
import {createVisualDefectReport,compareVisualReports,projectFingerprint,validateIterationRequest} from './plugins/motion-graphics/skills/motion-graphics/scripts/visual-iteration.mjs';
import {assertVisionModel,visionModelConfig,proposeVisionRevisions,judgeVisionRevision} from './src/visual-vision-review.mjs';
import {runVisualAutoLoop} from './src/visual-auto-loop.mjs';
import {inspectAlphaMov,compositeBrollAlpha} from './src/broll-export.mjs';
import {auditTimelineAudio,auditAudioAssets,measureAudioLoudness} from './src/audio-quality-audit.mjs';
import {inspectCharacterMotion} from './src/character-motion.mjs';
import {addWindowsMediaPaths} from './scripts/windows-media-path.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
addWindowsMediaPaths({projectRoot: root});
// Optional, machine-local secrets. Do not include .env in project archives.
if (fs.existsSync(path.join(root, '.env'))) {
  if (typeof process.loadEnvFile !== 'function') throw new Error('Se necesita Node.js 22 o superior para .env.');
  process.loadEnvFile(path.join(root, '.env'));
}
const runtimeRoot = process.env.MOTION_STUDIO_TEST_ROOT
  ? path.resolve(process.env.MOTION_STUDIO_TEST_ROOT)
  : root;
const uiDir = path.join(root, 'dist-ui');
const publicDir = path.join(runtimeRoot, 'public');
const assetsDir = path.join(publicDir, 'user-assets');
const outDir = path.join(runtimeRoot, 'out');
const dataDir = path.join(runtimeRoot, 'data');
const projectPath = path.join(dataDir, 'studio-project.json');
const creditsPath = path.join(dataDir, 'media-credits.json');
const cliPath = path.join(root, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');
const port = Number(process.env.MOTION_STUDIO_PORT || 4317);
const appVersion = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const HYPERFRAMES_VERSION = '0.8.225';
const MAX_HYPERFRAMES_ASSETS = 512 * 1024 * 1024;

const jobs = new Map();
const visualSessions = new Map();
let activeVisualSession = null;
const mediaChoices = new Map();
const mediaSearchCache = new Map();
let currentJob = null;
let creatingJob = false;

const mimeType = (file) => {
  const ext = path.extname(file).toLowerCase();
  return ({
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
  })[ext] || 'application/octet-stream';
};

function respond(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function reportError(res, error) {
  const message = error instanceof Error ? error.message : 'Error desconocido.';
  if (!res.headersSent) respond(res, 400, {error: message});
}

async function bodyJson(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_PROJECT_BYTES) throw new Error('El proyecto supera el tamano permitido.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('El JSON no se pudo interpretar.');
  }
}

async function readProject() {
  let raw;
  try {
    raw = JSON.parse(await fsp.readFile(projectPath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    raw = {scenes:[]};
  }
  try {
    return validateProject(raw);
  } catch (error) {
    if (process.env.MOTION_STUDIO_TEST_ROOT || !fs.existsSync(projectPath)) throw error;
    const backup = path.join(dataDir, `studio-project-recovery-${Date.now()}.json`);
    await fsp.rename(projectPath, backup);
    console.warn(`[Motion Studio] Proyecto anterior inválido apartado en ${backup}: ${error.message}`);
    return validateProject({scenes:[]});
  }
}

async function saveProject(project) {
  const temp = path.join(dataDir, `project-${randomUUID()}.tmp`);
  await fsp.writeFile(temp, JSON.stringify(project, null, 2), 'utf8');
  await fsp.rename(temp, projectPath);
}

async function resetLocalContent() {
  if (process.env.MOTION_STUDIO_TEST_ROOT) {
    throw new Error('La limpieza total no está disponible en un entorno de pruebas.');
  }
  if (currentJob?.status === 'renderizando' || creatingJob || activeVisualSession) {
    throw new Error('Espera a que termine el render antes de limpiar los datos.');
  }
  for (const directory of [assetsDir, outDir, dataDir]) {
    await fsp.rm(directory, {recursive:true, force:true});
    await fsp.mkdir(directory, {recursive:true});
  }
  mediaChoices.clear();
  mediaSearchCache.clear();
  jobs.clear();
  currentJob = null;
}

async function waitForVisualRender(job,{timeoutMs=20*60*1000}={}) {
  const deadline=Date.now()+timeoutMs;
  while(Date.now()<deadline){
    if(job.status!=='renderizando'&&currentJob?.id!==job.id)return job;
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  throw Error('La iteración superó el tiempo límite de render. Revisa el trabajo '+job.id+'.');
}

async function beginAutonomousVisualReview(session,project,previous,modelConfig){
  try{
    const result=await runVisualAutoLoop({
      project,sourceJob:previous,maxAttempts:3,validateProject,
      validateCustomScene:(code,scene)=>{
        const candidate=validateProject({...project,scenes:project.scenes.map(s=>
          s.id===scene.id?{...s,customScene:code}:s)});
        const preflight=checkCustomScenePreflight(candidate);
        if(!preflight.passed)throw Error('Selector de escena inválido: '+preflight.errors.slice(0,3).join(' | '));
        const valid=candidate.scenes.find(s=>s.id===scene.id).customScene;
        new vm.Script('(function(tl,S,T0,D,gsap){'+valid.script+'\n})');
        return valid;
      },
      onProgress:progress=>{session.progress=progress;},
      propose:async (candidate,source,{validationFeedback}={})=>proposeVisionRevisions(candidate,source.visualDefects,
        path.join(outDir,source.output),{modelConfig,validationFeedback}),
      render:async (candidate,source,context)=>{
        await ensureMediaAvailable(candidate);
        const begin=source.engine==='hyperframes'?beginHyperframesRender:beginRender;
        return begin(candidate,context);
      },
      wait:waitForVisualRender,
      judge:async (source,trial,candidate,edits)=>judgeVisionRevision(
        path.join(outDir,source.output),path.join(outDir,trial.output),candidate,edits,{modelConfig}),
    });
    session.status=result.status;session.result=result;
    for(const round of result.rounds??[]){
      const dir=path.join(outDir,'quality-reviews',round.jobId);
      await fsp.mkdir(dir,{recursive:true});
      await fsp.writeFile(path.join(dir,'vision-iteration.json'),JSON.stringify({
        sourceJobId:round.sourceJobId,attempt:round.attempt,status:round.status,
        technical:round.technical,perceptual:round.perceptual,changes:round.manifest?.applied,
        approval:'PENDING_VISUAL_REVIEW',
      },null,2));
    }
  }catch(error){
    session.status='error';session.error=error instanceof Error?error.message:'Error visual desconocido.';
  }finally{
    session.finishedAt=Date.now();
    if(activeVisualSession===session.id)activeVisualSession=null;
  }
}

async function ensureMediaAvailable(project) {
  const references = collectProjectAssets(project, {includeReferences: true});
  for (const reference of references) {
    validateAsset(reference);
    try {
      await fsp.access(path.join(assetsDir, path.basename(reference)));
    } catch {
      throw new Error(`Falta un archivo importado: ${reference}. Vuelve a cargarlo antes de exportar.`);
    }
  }
  if (project.workflow?.id === 'model-showdown' && !project.workflow.demo) {
    const length=project.scenes.reduce((sum,scene)=>sum+scene.duration,0);
    for (const asset of project.workflow.media ?? []) {
      const full=path.join(assetsDir,path.basename(asset));
      const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration',
        '-of','default=noprint_wrappers=1:nokey=1',full],{encoding:'utf8',windowsHide:true,timeout:15000});
      const seconds=Number(probe.stdout?.trim());
      if(probe.status!==0||!Number.isFinite(seconds)||seconds<length-.04)
        throw Error('P4: el vídeo '+asset+' debe cubrir los '+length+' segundos completos de la comparativa.');
    }
  }
}

async function sendFile(res, base, relative, download = false, req = null) {
  const full = path.resolve(base, relative);
  if (!full.startsWith(path.resolve(base) + path.sep)) {
    respond(res, 403, {error: 'Ruta no permitida.'});
    return;
  }
  const stat = await fsp.stat(full);
  if (!stat.isFile()) throw new Error('Archivo no encontrado.');
  const range = req && /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, stat.size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
    if (start > end || start >= stat.size) {
      res.writeHead(416, {'Content-Range': `bytes */${stat.size}`});
      res.end();
      return;
    }
    res.writeHead(206, {
      'Content-Type': mimeType(full), 'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store',
    });
    fs.createReadStream(full, {start, end}).pipe(res);
    return;
  }
  res.writeHead(200, {
    'Content-Type': mimeType(full),
    'Content-Length': stat.size,
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
    ...(download ? {'Content-Disposition': `attachment; filename="${path.basename(full)}"`} : {}),
  });
  fs.createReadStream(full).pipe(res);
}

async function uploadAsset(req, url, res) {
  const ext = assetExtension(url.searchParams.get('name') || '');
  const declared = Number(req.headers['content-length'] ?? 0);
  if (declared > MAX_ASSET_BYTES) throw new Error('Archivo demasiado grande (maximo 50 MB).');
  const filename = `${randomUUID()}${ext}`;
  const destination = path.join(assetsDir, filename);
  let transferred = 0;
  const limiter = new Transform({
    transform(chunk, _encoding, done) {
      transferred += chunk.length;
      done(transferred > MAX_ASSET_BYTES
        ? new Error('Archivo demasiado grande (maximo 50 MB).') : null, chunk);
    },
  });
  try {
    await pipeline(req, limiter, fs.createWriteStream(destination, {flags: 'wx'}));
    const handle = await fsp.open(destination, 'r');
    const signature = Buffer.alloc(16);
    try {
      await handle.read(signature, 0, signature.length, 0);
    } finally {
      await handle.close();
    }
    if (!validMediaSignature(signature, ext)) throw new Error('El contenido no coincide con el formato del archivo.');
    respond(res, 201, {asset: `user-assets/${filename}`});
  } catch (error) {
    await fsp.unlink(destination).catch(() => {});
    throw error;
  }
}

async function searchMedia(url, res) {
  const provider = String(url.searchParams.get('provider') || 'openverse');
  const query = String(url.searchParams.get('q') || '').trim();
  const cacheKey = `${provider}\n${query.toLowerCase()}`;
  const now = Date.now();
  for (const [key, value] of mediaChoices) if (value.expires <= now) mediaChoices.delete(key);
  for (const [key, value] of mediaSearchCache) if (value.expires <= now) mediaSearchCache.delete(key);
  let items = mediaSearchCache.get(cacheKey)?.items;
  if (!items) {
    items = await searchFreeMedia(provider, query, {pixabayKey: process.env.PIXABAY_API_KEY});
    // Pixabay requests 24-hour result caching; Openverse uses a shorter cache.
    const ttl = provider === 'pixabay' ? 24 * 60 * 60 * 1000 : 5 * 60 * 1000;
    mediaSearchCache.set(cacheKey, {items, expires: now + ttl});
  }
  const results = items.map((item) => {
    const id = randomUUID();
    mediaChoices.set(id, {item, expires: now + 10 * 60 * 1000});
    return {id, thumbnail: item.thumbnail, title: item.title,
      creator: item.creator, license: item.license, sourceUrl: item.sourceUrl};
  });
  if (mediaChoices.size > 300) mediaChoices.delete(mediaChoices.keys().next().value);
  return respond(res, 200, {provider, results});
}

async function importMedia(req, res) {
  const {id} = await bodyJson(req);
  const choice = mediaChoices.get(id);
  if (!choice || choice.expires < Date.now()) throw new Error('La búsqueda ha caducado. Vuelve a buscar el recurso.');
  const {bytes, ext} = await downloadFreeMedia(choice.item);
  if (!validMediaSignature(bytes.subarray(0, 16), ext)) throw new Error('La imagen descargada no es válida.');
  const filename = `${randomUUID()}${ext}`;
  await fsp.writeFile(path.join(assetsDir, filename), bytes, {flag: 'wx'});
  const asset = `user-assets/${filename}`;
  const attribution = {asset, title: choice.item.title, creator: choice.item.creator,
    license: choice.item.license, sourceUrl: choice.item.sourceUrl, importedAt: new Date().toISOString()};
  let credits = [];
  try { credits = JSON.parse(await fsp.readFile(creditsPath, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!Array.isArray(credits)) credits = [];
  credits.push(attribution);
  await fsp.writeFile(creditsPath, JSON.stringify(credits.slice(-500), null, 2));
  return respond(res, 201, {asset, attribution});
}

async function transcribeAsset(req, res) {
  const {asset} = await bodyJson(req);
  const validated = validateAsset(asset, 'audio');
  if (!validated) throw new Error('Importa un audio antes de transcribir.');
  const full = path.join(assetsDir, path.basename(validated));
  const stat = await fsp.stat(full);
  if (stat.size > 25 * 1024 * 1024) throw new Error('El audio supera los 25 MB del nivel gratuito de Groq.');
  const transcription = await transcribeWithGroq(await fsp.readFile(full), path.basename(full), process.env.GROQ_API_KEY);
  return respond(res, 200, transcription);
}

const latestLog = (value, incoming) =>
  (value + incoming.toString('utf8')).slice(-4500);

async function renderBrollMov(project,id,job) {
  if (!project.broll?.length) throw Error('P2: añade planos B-roll antes de exportar alfa.');
  const props=path.join(outDir,`broll-props-${id}.json`);
  const output=path.join(outDir,`studio-${id}.mov`);
  await fsp.writeFile(props,JSON.stringify({project}),'utf8');
  try {
    await new Promise((resolve,reject)=>{
      const args=[cliPath,'render','TransparentBroll',output,`--props=${props}`,
        `--public-dir=${publicDir}`,'--codec=prores','--prores-profile=4444',
        '--pixel-format=yuva444p10le','--image-format=png','--concurrency=1',
        '--hardware-acceleration=disable'];
      const child=spawn(process.execPath,args,{cwd:root,env:process.env,windowsHide:true});
      child.stdout.on('data',chunk=>{job.log=latestLog(job.log,chunk);});
      child.stderr.on('data',chunk=>{job.log=latestLog(job.log,chunk);});
      child.on('error',reject);
      child.on('close',code=>code===0?resolve():reject(Error('P2: falló ProRes 4444: '+job.log.slice(-1200))));
    });
    job.alphaAudit=await inspectAlphaMov(output);
    job.alphaDownload=`/exports/studio-${id}.mov`;
    job.log+='[P2] Canal alfa decodificado: '+job.alphaAudit.pixelFormat+'\n';
    return output;
  } finally {await fsp.rm(props,{force:true}).catch(()=>{});}
}

async function beginBrollAlpha(project) {
  if(creatingJob||currentJob?.status==='renderizando')throw Error('Espera a que termine el render actual.');
  creatingJob=true;
  const id=randomUUID();
  const job={id,engine:'alpha-broll',status:'renderizando',progress:1,error:'',log:'',
    output:`studio-${id}.mov`,startedAt:Date.now(),projectHash:projectFingerprint(project)};
  jobs.set(id,job);currentJob=job;creatingJob=false;
  if(jobs.size>20)jobs.delete(jobs.keys().next().value);
  void(async()=>{
    try{await renderBrollMov(project,id,job);job.status='completado';job.progress=100;}
    catch(error){job.status='error';job.error=error.message;job.log=latestLog(job.log,error.message);}
    finally{if(currentJob?.id===id)currentJob=null;}
  })();
  return job;
}

// Shared post-render pipeline: both Remotion and HyperFrames are audited.
async function reviewCompletedRender(job,project,output,id){
  const total=project.scenes.reduce((sum,scene)=>sum+scene.duration,0);
  const expectedAudio=Boolean(project.audioAsset||project.voiceClips?.length||project.musicAsset||project.soundDesign?.enabled&&project.soundDesign?.cues.length);
  if(project.soundDesign?.enabled && project.soundDesign.cues.length){
    const wav=path.join(outDir,'sfx-'+id+'.wav'),mixed=path.join(outDir,'mix-'+id+'.mp4');
    try{
      const created=await renderSoundWav(project.soundDesign,wav,{seconds:total});
      const probe=spawnSync('ffprobe',['-v','error','-select_streams','a:0','-show_entries','stream=index','-of','csv=p=0',output],{encoding:'utf8',windowsHide:true});
      if(probe.error||probe.status!==0)throw Error('FFprobe no pudo detectar la pista de audio.');
      await muxSoundtrack(output,wav,mixed,{hasExistingAudio:Boolean(probe.stdout?.trim())});
      await fsp.rename(mixed,output);
      job.soundtrackAudit={mixed:true,cues:created.cues,seconds:created.seconds,types:[...new Set(project.soundDesign.cues.map(c=>c.type))]};
      job.log+='[Efectos] '+created.cues+' eventos sintetizados y mezclados.\\n';
    }catch(error){
      job.soundtrackAudit={mixed:false,error:error.message};
      job.log+='[Efectos] No se pudo mezclar diseño sonoro: '+error.message+'\\n';
    }finally{
      await fsp.rm(wav,{force:true}).catch(()=>{});
      await fsp.rm(mixed,{force:true}).catch(()=>{});
    }
  }
  try{
    job.visualAudit=await auditRenderedVideo(output,{expectedAudio});
    job.log+='[Video] '+job.visualAudit.metrics.sampledFrames+' fotogramas evaluados; '+job.visualAudit.warnings.length+' observaciones.\\n';
    for(const warning of job.visualAudit.warnings)job.log+='- '+warning+'\\n';
  }catch(error){job.log+='[Video] Auditoría no disponible: '+error.message+'\\n';}
  try{
    job.pacingAudit=await auditRenderedPacing(output);
    for(const gap of job.pacingAudit.deadGaps)job.log+='[Ritmo] Intervalo de baja actividad '+gap.start+'–'+gap.end+' s.\\n';
    if(job.pacingAudit.flashSuspects.length)job.log+='[Ritmo] '+job.pacingAudit.flashSuspects.length+' posible(s) destello(s).\\n';
  }catch(error){job.log+='[Ritmo] No disponible: '+error.message+'\\n';}
  job.audioTimingAudit=auditTimelineAudio(project);
  for(const warning of job.audioTimingAudit.warnings)job.log+='[Narración] '+warning+'\\n';
  try{
    job.audioAssetsAudit=await auditAudioAssets(project,assetsDir);
    for(const warning of job.audioAssetsAudit.warnings)job.log+='[Audio] '+warning+'\\n';
  }catch(error){job.log+='[Audio] Inspección de recursos no disponible: '+error.message+'\\n';}
  if(job.visualAudit?.video?.audioPresent){
    try{job.audioLoudnessAudit=await measureAudioLoudness(output);
      for(const warning of job.audioLoudnessAudit.warnings)job.log+='[Sonoridad] '+warning+'\\n';
    }catch(error){job.log+='[Sonoridad] No disponible: '+error.message+'\\n';}
  }
  if(project.loop){
    try{job.loopAudit=await auditLoopSeam(output);
      if(!job.loopAudit.seamlessByHeuristic)job.log+='[Loop] Salto en cierre: revisar primera y última imagen.\\n';
    }catch(error){job.loopAudit={measured:false,error:error.message};}
  }
  const characterScenes=project.scenes.flatMap((scene,index)=>scene.authored?.layers
    ?.filter(layer=>layer.type==='character').map(layer=>({scene:scene.id,index,
      action:layer.actor?.action||'custom',duration:scene.duration,rig:layer.actor}))||[]);
  if(characterScenes.length){
    const results=characterScenes.map(({scene,index,action,duration,rig})=>({scene,index,action,
      ...inspectCharacterMotion(rig,{duration,width:project.format==='vertical'?720:1280,fps:project.fps})}));
    job.characterMotionAudit={measured:true,rigs:results.length,
      passed:results.every(r=>r.passed),results};
    job.log+='[P5] '+results.length+' personaje(s) articulado(s) medidos; '+
      results.reduce((n,r)=>n+r.findings.length,0)+' defectos de contacto.\n';
  }else job.characterMotionAudit={measured:false,rigs:0,passed:null,results:[]};
  const reviewDir=path.join(outDir,'quality-reviews',id);
  let sheet=null;
  try{
    sheet=await createFrameContactSheet(output,project,reviewDir,{maxFrames:36});
    job.contactSheet={captured:sheet.captured,requested:sheet.totalRequested,errors:sheet.errors.length,url:'/reviews/'+id+'/index.html'};
    job.log+='[Fotogramas] '+sheet.captured+' capturas: '+job.contactSheet.url+'\\n';
  }catch(error){job.log+='[Fotogramas] Revisión parcial: '+error.message+'\\n';}
  job.visualDefects=createVisualDefectReport(project,{visualAudit:job.visualAudit,pacingAudit:job.pacingAudit,
    loopAudit:job.loopAudit,contactSheet:sheet,expectedAudio},{jobId:id,sourceJobId:job.sourceJobId,attempt:job.attempt});
  if(job.sourceJobId){
    const previous=jobs.get(job.sourceJobId)?.visualDefects;
    if(previous)job.iterationComparison=compareVisualReports(previous,job.visualDefects);
  }
  await fsp.mkdir(reviewDir,{recursive:true});
  await fsp.writeFile(path.join(reviewDir,'character-audit.json'),JSON.stringify(job.characterMotionAudit,null,2));
  await fsp.writeFile(path.join(reviewDir,'defects.json'),JSON.stringify(job.visualDefects,null,2));
  job.log+='[P1] Informe de defectos: /reviews/'+id+'/defects.json ('+job.visualDefects.defects.length+' observaciones).\n';
  job.qualityEvidence={rendered:true,visualApproval:false,heuristicsOnly:true,
    screenshotEvidence:Boolean(job.contactSheet?.captured),audioMeasured:Boolean(job.audioLoudnessAudit),
    loopMeasured:project.loop?Boolean(job.loopAudit?.fps):null};
}

async function recordFailedRenderReview(job,project) {
  try {
    job.visualDefects=createVisualDefectReport(project,{runtimeErrors:[job.error]},
      {jobId:job.id,sourceJobId:job.sourceJobId,attempt:job.attempt,stage:'preflight'});
    const directory=path.join(outDir,'quality-reviews',job.id);
    await fsp.mkdir(directory,{recursive:true});
    await fsp.writeFile(path.join(directory,'defects.json'),JSON.stringify(job.visualDefects,null,2));
    job.log+='[P1] Error de render clasificado por escena: /reviews/'+job.id+'/defects.json\n';
  }catch(error){job.log+='[P1] No se pudo registrar el informe de fallo: '+error.message+'\n';}
}

async function beginRender(project,{sourceJobId=null,attempt=1}={}) {
  if (project.scenes.some(scene => scene.customScene?.html)) throw new Error('Las escenas HTML/GSAP requieren exportar con HyperFrames. Remotion no las sustituirá por una plantilla.');
  if (creatingJob || currentJob?.status === 'renderizando') {
    throw new Error('Ya hay un render en curso. Espera a que termine.');
  }
  creatingJob = true;
  const id = randomUUID();
  const name = `studio-${id}.mp4`;
  const output = path.join(outDir, name);
  const propsFile = path.join(outDir, `props-${id}.json`);
  try {
    await fsp.writeFile(propsFile, JSON.stringify({project}), 'utf8');
  } finally {
    // No further awaits before currentJob is set: a second request cannot
    // enter the render initialization concurrently.
    creatingJob = false;
  }
  const job = {
    id, engine: 'remotion', status: 'renderizando', progress: 0, error: '',
    output: name, log: '', startedAt: Date.now(),sourceJobId,attempt,projectHash:projectFingerprint(project),
  };
  jobs.set(id, job);
  currentJob = job;
  if (jobs.size > 20) jobs.delete(jobs.keys().next().value);

  const args = [
    cliPath, 'render', 'StudioVideo', output,
    `--props=${propsFile}`, `--public-dir=${publicDir}`,
    '--codec=h264', '--concurrency=1',
    '--hardware-acceleration=disable',
  ];
  const child = spawn(process.execPath, args, {cwd: root, env: process.env, windowsHide: true});
  const progressHandler = (data) => {
    job.log = latestLog(job.log, data);
    const matches = [...job.log.matchAll(/Rendered\s+(\d+)\/(\d+)/g)];
    if (matches.length > 0) {
      const [_, done, total] = matches[matches.length - 1];
      job.progress = Math.min(99, Math.floor((Number(done) / Number(total)) * 100));
    }
  };
  child.stdout.on('data', progressHandler);
  child.stderr.on('data', progressHandler);
  child.on('error', (error) => {
    job.status = 'error';
    job.error = error.message;
  });
  child.on('close', async (code) => {
    if (job.status !== 'error' && code === 0) {
      const stat = await fsp.stat(output).catch(() => null);
      if (stat?.isFile() && stat.size > 15000) {
        try{await reviewCompletedRender(job,project,output,id);job.status='completado';}
        catch(error){job.status='error';job.error='La auditoría P1 falló: '+error.message;}
        job.progress = 100;
      } else {
        job.status = 'error';
        job.error = 'Remotion termino pero no se encontro un MP4 valido.';
      }
    } else {
      job.status = 'error';
      job.error ||= `Remotion termino con el codigo ${code}. ${job.log.slice(-1500)}`;
    }
    if(job.status==='error')await recordFailedRenderReview(job,project);
    currentJob = null;
  });
  return job;
}

function appendJobLog(job, data) {
  job.log = latestLog(job.log, data);
  if (job.phase !== 'render') return;
  job.progress=hyperframesProgress(job.log,job.progress);
}

function runHyperframesCli(args, cwd, job) {
  return new Promise((resolve, reject) => {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const localCli=path.join(root,'node_modules','hyperframes','bin','hyperframes.mjs');
    const localManifest=path.join(root,'node_modules','hyperframes','package.json');
    const useLocal=fs.existsSync(localCli)&&fs.existsSync(localManifest)&&JSON.parse(fs.readFileSync(localManifest,'utf8')).version===HYPERFRAMES_VERSION;
    job.phase = args[0] === 'render' ? 'render' : 'setup';
    const cliArgs = useLocal ? [localCli,...args] : ['exec', '--yes', '--prefer-offline', '--fetch-retries=0', '--fetch-timeout=20000', `--package=hyperframes@${HYPERFRAMES_VERSION}`,
      '--', 'hyperframes', ...args];
    const child = spawn(useLocal?process.execPath:npmCommand, cliArgs, {
      cwd,
      env: {...process.env, HYPERFRAMES_NO_UPDATE_CHECK: '1', HYPERFRAMES_NO_TELEMETRY: '1'},
      windowsHide: true,
      shell: !useLocal&&process.platform === 'win32',
    });
    child.stdout.on('data', (data) => appendJobLog(job, data));
    child.stderr.on('data', (data) => appendJobLog(job, data));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`HyperFrames terminó con el código ${code}. ${job.log.slice(-1800)}`));
    });
  });
}

function assertHyperframesRequirements() {
  const major = Number(process.versions.node.split('.')[0]);
  const minor = Number(process.versions.node.split('.')[1]);
  if (major < 22 || major === 23 || (major === 22 && minor < 13)) throw new Error('Motion Studio requiere Node.js 22.13 LTS o 24 y superiores.');
  const missing = ['ffmpeg', 'ffprobe'].filter((command) => {
    const result = spawnSync(command, ['-version'], {stdio: 'ignore', windowsHide: true});
    return Boolean(result.error) || result.status !== 0;
  });
  if (missing.length) {
    throw new Error(`HyperFrames no encuentra ${missing.join(' y ')}. Ejecuta instalar-ffmpeg.cmd en la carpeta de Motion Studio, cierra el editor y vuelve a abrirlo. Remotion sigue disponible como alternativa.`);
  }
}

async function beginHyperframesRender(project,{sourceJobId=null,attempt=1}={}) {
  if (project.workflow?.id === 'model-showdown' && project.workflow.media?.length)
    throw new Error('P4: model-showdown con tres MP4 requiere exportación Remotion para conservar los tres vídeos reales.');
  const preflight=checkCustomScenePreflight(project);
  if(!preflight.passed)throw Error('Corrige la escena antes de exportar: '+preflight.errors.slice(0,6).join(' | '));
  if (project.visualEngine === 'canvas') {
    throw new Error('El modo Canvas 3D requiere la ruta de exportación Remotion.');
  }
  assertHyperframesRequirements();
  if (creatingJob || currentJob?.status === 'renderizando') {
    throw new Error('Ya hay un render en curso. Espera a que termine.');
  }
  creatingJob = true;
  const id = randomUUID();
  const name = `studio-${id}.mp4`;
  const output = path.join(outDir, name);
  const workspace = path.join(outDir, `hyperframes-${id}`);
  const workspaceOutput = path.join(workspace, 'motion-studio-output.mp4');
  const job = {
    id, engine: 'hyperframes', status: 'renderizando', progress: 1, error: '',sourceJobId,attempt,projectHash:projectFingerprint(project),
    output: name, log: 'Preparando composición y recursos locales...\n',
    startedAt: Date.now(), workspace,
  };
  try {
    const assets = collectProjectAssets(project);
    await fsp.mkdir(path.join(workspace, 'assets'), {recursive: true});
    const embeddedAssets = {};
    let totalBytes = 0;
    for (const asset of assets) {
      const filename = path.basename(asset);
      if (!filename || filename === '.' || filename === '..') throw new Error('Hay una ruta multimedia no válida en el proyecto.');
      const source = path.join(assetsDir, filename);
      const stat = await fsp.stat(source);
      if (!stat.isFile()) throw new Error(`El recurso ${filename} no es un archivo válido.`);
      totalBytes += stat.size;
      if (totalBytes > MAX_HYPERFRAMES_ASSETS) {
        throw new Error('Los medios del proyecto superan 512 MB. Reduce o divide los recursos antes de renderizar con HyperFrames.');
      }
      await fsp.copyFile(source, path.join(workspace, 'assets', filename));
      embeddedAssets[asset] = `assets/${filename}`;
    }
    const gsapSource = await fsp.readFile(path.join(root, 'public', 'hyperframes', 'gsap.min.js'), 'utf8');
    for (const [, file] of BUNDLED_FONT_FACES) {
      const filename = path.basename(file);
      try {
        await fsp.copyFile(path.join(root, 'public', file), path.join(workspace, 'assets', filename));
        embeddedAssets[file] = `assets/${filename}`;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        job.log += `Fuente opcional ${filename} ausente; se usará la fuente de respaldo.\n`;
      }
    }
    const html = exportHyperframesProject(project, undefined, gsapSource, embeddedAssets);
    await fsp.writeFile(path.join(workspace, 'index.html'), html, 'utf8');
    jobs.set(id, job);
    currentJob = job;
    if (jobs.size > 20) jobs.delete(jobs.keys().next().value);
    creatingJob = false;
  } catch (error) {
    creatingJob = false;
    await fsp.rm(workspace, {recursive: true, force: true}).catch(() => {});
    throw error;
  }

  void (async () => {
    try {
      job.progress = 3;
      if (project.scenes.some(scene => scene.customScene || scene.authored)) {
        job.log += 'Revisando ejecución, tiempos y selectores antes del render...\n';
        const {reviewExplainer} = await import('./scripts/review-explainer.mjs');
        const review = await reviewExplainer(project, {root, publicDir, outputDir:path.join(workspace,'review'), capture:false});
        if (!review.passed) throw new Error('La revisión de ejecución falló: ' + review.errors.slice(0,6).join(' | '));
        job.log += `${review.samples.length} estados comprobados. La revisión técnica no certifica calidad artística ni sincronía de oído.\n`;
      }
      job.log += 'Validando la composición HTML con HyperFrames lint...\n';
      await runHyperframesCli(['lint'], workspace, job);
      job.progress = Math.max(job.progress, 5);
      job.log += `\nPreparando navegador HyperFrames ${HYPERFRAMES_VERSION}...\n`;
      await runHyperframesCli(['browser', 'ensure'], workspace, job);
      job.progress = Math.max(job.progress, 8);
      job.log += '\nComprobando Node, Chrome, FFmpeg y FFprobe con HyperFrames doctor...\n';
      await runHyperframesCli(['doctor'], workspace, job);
      job.progress = Math.max(job.progress, 10);
      const fps = project.fps === 30 ? 30 : 24;
      job.log += `\nRenderizando MP4 a ${fps} FPS, calidad estándar y un trabajador...\n`;
      await runHyperframesCli(['render', '--output', 'motion-studio-output.mp4', '--fps', String(fps),
        '--quality', 'standard', '--workers', '1', '--no-browser-gpu'], workspace, job);
      const stat = await fsp.stat(workspaceOutput).catch(() => null);
      if (!stat?.isFile() || stat.size < 15000) {
        throw new Error('HyperFrames terminó, pero no se encontró un MP4 válido.');
      }
      await fsp.copyFile(workspaceOutput, output);
      if(project.broll?.length){
        job.log+='[P2] Renderizando B-roll transparente y componiéndolo en el MP4...\n';
        const overlay=await renderBrollMov(project,id,job);
        await compositeBrollAlpha(output,overlay);
        job.log+='[P2] Planos sincronizados integrados; audio original conservado.\n';
      }
      await reviewCompletedRender(job,project,output,id);
      job.status = 'completado';
      job.progress = 100;
      job.log += `\nMP4 creado: ${name}\n`;
      await fsp.rm(workspace, {recursive: true, force: true}).catch(() => {});
    } catch (error) {
      job.status = 'error';
      job.error = error instanceof Error ? error.message : 'Error desconocido al renderizar con HyperFrames.';
      await recordFailedRenderReview(job,project);
      job.log = latestLog(job.log, `\n${job.error}`);
    } finally {
      if (currentJob?.id === id) currentJob = null;
    }
  })();
  return job;
}

async function handle(req, res) {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  const pathname = url.pathname;
  if (req.method === 'GET' && BUNDLED_FONT_FACES.some(([, file]) => pathname === '/' + file)) {
    return sendFile(res, path.join(root, 'public', 'fonts'), path.basename(pathname));
  }
  if (req.method === 'GET' && pathname === '/hyperframes/gsap.min.js') {
    return sendFile(res, path.join(root, 'public', 'hyperframes'), 'gsap.min.js');
  }
  if (req.method === 'GET' && pathname === '/api/health') {
    return respond(res, 200, {ok: true, active: currentJob?.status === 'renderizando'});
  }
  if (req.method === 'GET' && pathname === '/api/project') {
    return respond(res, 200, {project: await readProject()});
  }
  if (req.method === 'POST' && pathname === '/api/reset-local-content') {
    const confirmation = await bodyJson(req);
    if (confirmation?.confirm !== 'BORRAR DATOS LOCALES') {
      return respond(res, 400, {error:'Confirmación de limpieza no válida.'});
    }
    await resetLocalContent();
    return respond(res, 200, {ok:true, project:await readProject()});
  }
  if(req.method==='GET'&&pathname==='/api/styles')
    return respond(res,200,{styles:listStylePresets()});
  const styleId=pathname.startsWith('/api/styles/')?pathname.slice('/api/styles/'.length):'';
  const styleMatch=/^[a-z0-9-]+$/.test(styleId)?styleId:null;
  if(req.method==='GET'&&styleMatch)
    return respond(res,200,{...getStylePreset(styleMatch),guide:getStyleGuide(styleMatch)});
  if (req.method === 'GET' && pathname === '/api/integrations') {
    const llm = aiPlannerConfig();
    const vision = visionModelConfig();
    return respond(res, 200, {version: appVersion, sceneContract:MOTION_STUDIO_CONTRACT, customScene: true, openverse: true,
      pixabay: Boolean(process.env.PIXABAY_API_KEY),
      groq: Boolean(process.env.GROQ_API_KEY),
      ollama: {enabled:llm.ollamaConfigured, model:llm.ollamaModel, endpoint:llm.ollamaEndpoint},
      ollamaVision:{configured:vision.configured,model:vision.model,localOnly:true},
      freeLLMApi: {configured: llm.configured, model: llm.model},
      hyperframes: `renderizador directo ${HYPERFRAMES_VERSION} (instalación automática al primer uso)`, paidApisEnabled: false});
  }
  if (req.method === 'POST' && pathname === '/api/ai/plan') {
    const body = await bodyJson(req);
    const provider = body.provider ?? 'freellmapi';
    return respond(res, 200, await requestAiPlan(body.project ?? body, {provider}));
  }
  if (req.method === 'POST' && pathname === '/api/ollama/check') {
    const config = aiPlannerConfig();
    if (!config.ollamaConfigured) return respond(res, 200, {ok:false, model:config.ollamaModel, error:'Ollama está desactivado.'});
    try {
      const response = await fetch(new URL('/api/tags', config.ollamaEndpoint), {signal:AbortSignal.timeout(3000)});
      if (!response.ok) return respond(res, 200, {ok:false, model:config.ollamaModel, error:`Ollama respondió HTTP ${response.status}.`});
      const payload = await response.json();
      const models = Array.isArray(payload.models) ? payload.models : [];
      const found = models.some((item) => item.name === config.ollamaModel || item.model === config.ollamaModel);
      return respond(res, 200, {ok:found, model:config.ollamaModel,
        error:found ? '' : `Ollama responde, pero no aparece ${config.ollamaModel}. Ejecuta: ollama pull ${config.ollamaModel}`});
    } catch {
      return respond(res, 200, {ok:false, model:config.ollamaModel,
        error:'No responde Ollama en 127.0.0.1:11434. Abre Ollama y vuelve a comprobar.'});
    }
  }
  if (req.method === 'POST' && pathname === '/api/ai/scene') {
    return respond(res, 200, await requestSceneCode(await bodyJson(req)));
  }
  if (req.method === 'POST' && pathname === '/api/ai/full-video') {
    return respond(res, 200, await requestFullVideoCode(await bodyJson(req)));
  }
  if (req.method === 'GET' && pathname === '/api/media/search') return searchMedia(url, res);
  if (req.method === 'POST' && pathname === '/api/media/import') return importMedia(req, res);
    if (req.method === 'POST' && pathname === '/api/transcribe') return transcribeAsset(req, res);
    if (req.method === 'POST' && pathname === '/api/review') {
      const project = validateProject(await bodyJson(req));
      if (!project.scenes.length) throw new Error('Añade escenas antes de revisar.');
      const preflight=checkCustomScenePreflight(project);
      if(!preflight.passed)return respond(res,200,{passed:false,errors:preflight.errors,warnings:preflight.warnings,visualAudit:auditVisualDirection(project)});
      const {reviewExplainer} = await import('./scripts/review-explainer.mjs');
      const review=await reviewExplainer(project, {root, publicDir, capture:false});
      return respond(res,200,{...review,visualAudit:auditVisualDirection(project)});
    }
  if (req.method === 'PUT' && pathname === '/api/project') {
    const project = validateProject(await bodyJson(req));
    await saveProject(project);
    return respond(res, 200, {project});
  }
  if (req.method === 'PUT' && pathname === '/api/assets') {
    return uploadAsset(req, url, res);
  }
  if (req.method === 'POST' && pathname === '/api/render/hyperframes') {
    if(activeVisualSession)throw Error('Espera a que finalice la revisión visual automática.');
    const project = validateProject(await bodyJson(req));
    assertApproved(project);
    await ensureMediaAvailable(project);
    await saveProject(project);
    const job = await beginHyperframesRender(project);
    return respond(res, 202, {jobId: job.id, engine: job.engine});
  }
  if (req.method === 'POST' && pathname === '/api/render') {
    if(activeVisualSession)throw Error('Espera a que finalice la revisión visual automática.');
    const project = validateProject(await bodyJson(req));
    assertApproved(project);
    await ensureMediaAvailable(project);
    await saveProject(project);
    const job = await beginRender(project);
    return respond(res, 202, {jobId: job.id});
  }
  if(req.method==='POST'&&pathname==='/api/export/alpha-broll'){
    if(activeVisualSession)throw Error('Espera a que finalice la revisión visual automática.');
    const project=validateProject(await bodyJson(req));
    assertApproved(project);
    if(!project.broll.length)throw Error('P2: agrega un plano B-roll antes de exportar alfa.');
    await ensureMediaAvailable(project);
    await saveProject(project);
    const job=await beginBrollAlpha(project);
    return respond(res,202,{jobId:job.id,engine:job.engine});
  }
  if (req.method === 'POST' && pathname === '/api/iterations/rerender') {
    if(activeVisualSession)throw Error('Espera a que finalice la revisión visual automática.');
    const body=await bodyJson(req),previous=jobs.get(body.sourceJobId);
    const project=validateProject(body.project);
    const context=validateIterationRequest(previous,project);
    assertApproved(project);
    await ensureMediaAvailable(project);
    await saveProject(project);
    const begin=previous.engine==='hyperframes'?beginHyperframesRender:beginRender;
    const job=await begin(project,context);
    return respond(res,202,{jobId:job.id,sourceJobId:previous.id,attempt:job.attempt});
  }
  if(req.method==='POST'&&pathname==='/api/iterations/auto'){
    if(activeVisualSession||creatingJob||currentJob?.status==='renderizando')
      throw Error('Hay un render o una revisión visual en marcha.');
    const body=await bodyJson(req),project=validateProject(body.project);
    const previous=jobs.get(body.sourceJobId);
    if(previous?.status!=='completado'||previous?.visualDefects?.stage!=='post-render'||
       previous.projectHash!==projectFingerprint(project))
      throw Error('Selecciona un MP4 terminado y su JSON original exacto.');
    if(previous.attempt>=3)throw Error('Se alcanzó el máximo de tres renders relacionados.');
    await ensureMediaAvailable(project);
    const config=await assertVisionModel();
    const session={id:randomUUID(),status:'running',sourceJobId:previous.id,
      progress:{phase:'queued',attempt:previous.attempt},result:null,error:null,createdAt:Date.now()};
    visualSessions.set(session.id,session);
    if(visualSessions.size>12)visualSessions.delete(visualSessions.keys().next().value);
    activeVisualSession=session.id;
    void beginAutonomousVisualReview(session,project,previous,config);
    return respond(res,202,{sessionId:session.id,status:session.status});
  }
  const autoMatch=pathname.match(/^\/api\/iterations\/auto\/([0-9a-f-]{36})$/);
  if(req.method==='GET'&&autoMatch){
    const session=visualSessions.get(autoMatch[1]);
    return session?respond(res,200,{id:session.id,status:session.status,
      sourceJobId:session.sourceJobId,progress:session.progress,
      error:session.error,result:session.result}):respond(res,404,{error:'Revisión visual desconocida.'});
  }
  const jobMatch = pathname.match(/^\/api\/jobs\/([0-9a-f-]{36})$/);
  if (req.method === 'GET' && jobMatch) {
    const job = jobs.get(jobMatch[1]);
    return job ? respond(res, 200, {
      id: job.id, engine: job.engine || 'remotion', status: job.status, progress: job.progress,
      error: job.error, log: job.log.slice(-1000),
      download: job.status === 'completado' ? `/exports/${job.output}` : null,
      visualAudit:job.visualAudit??null, audioTimingAudit:job.audioTimingAudit??null,
      audioLoudnessAudit:job.audioLoudnessAudit??null, audioAssetsAudit:job.audioAssetsAudit??null, contactSheet:job.contactSheet??null,
      soundDesignAudit:job.soundtrackAudit??null,loopAudit:job.loopAudit??null,qualityEvidence:job.qualityEvidence??null,pacingAudit:job.pacingAudit??null,
      characterMotionAudit:job.characterMotionAudit??null,
      visualDefects:job.visualDefects??null,sourceJobId:job.sourceJobId,attempt:job.attempt,iterationComparison:job.iterationComparison??null,
      alphaAudit:job.alphaAudit??null,alphaDownload:job.alphaDownload??null,
    }) : respond(res, 404, {error: 'Trabajo no encontrado.'});
  }
  if (req.method === 'GET' && pathname === '/preview') {
    const project = await readProject();
    if (url.searchParams.get('engine') === 'remotion') {
      res.writeHead(302, {Location: '/?preview=remotion'});
      res.end();
      return;
    }
    const gsapSource = await fsp.readFile(path.join(root, 'public', 'hyperframes', 'gsap.min.js'), 'utf8');
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store'});
    res.end(buildPreviewHtml(project, gsapSource));
    return;
  }
  const assetMatch = pathname.match(/^\/user-assets\/([0-9a-f-]{36}\.[a-z0-9]+)$/);
  if (req.method === 'GET' && assetMatch) {
    return sendFile(res, assetsDir, assetMatch[1], false, req);
  }
  const reviewMatch=pathname.match(/^\/reviews\/([0-9a-f-]{36})\/(index\.html|report\.json|defects\.json|vision-iteration\.json|[0-9]{3}\.png)$/);
  if(req.method==='GET'&&reviewMatch){
    return sendFile(res,path.join(outDir,'quality-reviews',reviewMatch[1]),reviewMatch[2],false);
  }
  const exportMatch = pathname.match(/^\/exports\/(studio-[0-9a-f-]{36}\.(?:mp4|mov))$/);
  if (req.method === 'GET' && exportMatch) {
    return sendFile(res, outDir, exportMatch[1], true);
  }
  if (req.method === 'GET' && pathname.startsWith('/assets/')) {
    const filename = pathname.slice(1);
    if (!safeFilename(path.basename(filename))) return respond(res, 403, {error: 'Ruta no permitida.'});
    return sendFile(res, uiDir, filename);
  }
  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    return sendFile(res, uiDir, 'index.html');
  }
  return respond(res, 404, {error: 'Ruta no encontrada.'});
}

await Promise.all([fsp.mkdir(assetsDir, {recursive: true}), fsp.mkdir(outDir, {recursive: true}), fsp.mkdir(dataDir, {recursive: true})]);

// Conservar el trabajo guardado. El arranque limpio es opcional y crea un respaldo.
if (process.env.MOTION_STUDIO_START_CLEAN === 'true' && !process.env.MOTION_STUDIO_TEST_ROOT) {
  const backup = path.join(dataDir, `studio-project-backup-${Date.now()}-${randomUUID()}.json`);
  try { await fsp.rename(projectPath, backup); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const server = http.createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error('[Motion Studio]', error);
    reportError(res, error);
  });
});
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\nERROR: el puerto ${port} ya esta en uso. Probablemente hay otra copia de Motion Studio abierta (por ejemplo una version anterior).`);
    console.error('Cierra la ventana "Motion Studio - Servidor" anterior y vuelve a abrir esta version.');
  } else {
    console.error('[Motion Studio]', error);
  }
  process.exit(1);
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Motion Studio ${appVersion} listo en http://127.0.0.1:${port}`);
  console.log('Servidor local: no expuesto a Internet. HyperFrames principal; Remotion alternativo.');
});
