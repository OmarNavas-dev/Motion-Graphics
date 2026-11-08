import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
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
  if (currentJob?.status === 'renderizando' || creatingJob) {
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

async function beginRender(project) {
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
    output: name, log: '', startedAt: Date.now(),
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
        job.status = 'completado';
        job.progress = 100;
      } else {
        job.status = 'error';
        job.error = 'Remotion termino pero no se encontro un MP4 valido.';
      }
    } else {
      job.status = 'error';
      job.error ||= `Remotion termino con el codigo ${code}. ${job.log.slice(-1500)}`;
    }
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

async function beginHyperframesRender(project) {
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
    id, engine: 'hyperframes', status: 'renderizando', progress: 1, error: '',
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
      job.status = 'completado';
      job.progress = 100;
      job.log += `\nMP4 creado: ${name}\n`;
      await fsp.rm(workspace, {recursive: true, force: true}).catch(() => {});
    } catch (error) {
      job.status = 'error';
      job.error = error instanceof Error ? error.message : 'Error desconocido al renderizar con HyperFrames.';
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
  if (req.method === 'GET' && pathname === '/api/integrations') {
    const llm = aiPlannerConfig();
    return respond(res, 200, {version: appVersion, sceneContract:MOTION_STUDIO_CONTRACT, customScene: true, openverse: true,
      pixabay: Boolean(process.env.PIXABAY_API_KEY),
      groq: Boolean(process.env.GROQ_API_KEY),
      ollama: {enabled:llm.ollamaConfigured, model:llm.ollamaModel, endpoint:llm.ollamaEndpoint},
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
      const {reviewExplainer} = await import('./scripts/review-explainer.mjs');
      return respond(res, 200, await reviewExplainer(project, {root, publicDir, capture:false}));
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
    const project = validateProject(await bodyJson(req));
    assertApproved(project);
    await ensureMediaAvailable(project);
    await saveProject(project);
    const job = await beginHyperframesRender(project);
    return respond(res, 202, {jobId: job.id, engine: job.engine});
  }
  if (req.method === 'POST' && pathname === '/api/render') {
    const project = validateProject(await bodyJson(req));
    assertApproved(project);
    await ensureMediaAvailable(project);
    await saveProject(project);
    const job = await beginRender(project);
    return respond(res, 202, {jobId: job.id});
  }
  const jobMatch = pathname.match(/^\/api\/jobs\/([0-9a-f-]{36})$/);
  if (req.method === 'GET' && jobMatch) {
    const job = jobs.get(jobMatch[1]);
    return job ? respond(res, 200, {
      id: job.id, engine: job.engine || 'remotion', status: job.status, progress: job.progress,
      error: job.error, log: job.log.slice(-1000),
      download: job.status === 'completado' ? `/exports/${job.output}` : null,
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
  const exportMatch = pathname.match(/^\/exports\/(studio-[0-9a-f-]{36}\.mp4)$/);
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
