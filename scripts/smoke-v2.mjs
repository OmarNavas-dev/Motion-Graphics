import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn, execFileSync} from 'node:child_process';
import net from 'node:net';
import {validateProject} from '../server-utils.mjs';
import {MOTION_STUDIO_CONTRACT} from '../src/motion-capabilities.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempParent = path.resolve(process.env.MOTION_STUDIO_SMOKE_TMP || os.tmpdir());
await fs.mkdir(tempParent, {recursive: true});
const temp = await fs.mkdtemp(path.join(tempParent, 'motion-studio-smoke-'));
if (path.dirname(path.resolve(temp)) !== tempParent) throw new Error('Directorio temporal fuera de su raíz.');
const project = validateProject({
  name:'Proyecto temporal de smoke', format:'vertical', palette:'aurora',
  audioAsset:'', musicAsset:'', script:'', creativeBrief:'', style:'modern',
  scenes:[{id:'smoke', layout:'hero', duration:1, title:'PRUEBA COMPLETA', subtitle:'',
    imageAsset:'', cues:[], approved:false}],
});

const freePort = async () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    server.close(() => resolve(port));
  });
});
const port = await freePort();
const address = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server.mjs'], {
  cwd: root, stdio: ['ignore', 'pipe', 'pipe'],
  env: {...process.env, MOTION_STUDIO_PORT: String(port), MOTION_STUDIO_TEST_ROOT: temp},
});
let serverLogs = '';
child.stdout.on('data', (data) => {serverLogs += data;});
child.stderr.on('data', (data) => {serverLogs += data;});

const request = async (route, options) => {
  const response = await fetch(address + route, options);
  const body = await response.json();
  return {status: response.status, body};
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  let healthy = false;
  for (let i = 0; i < 50; i++) {
    if (child.exitCode !== null) break;
    try {
      const answer = await request('/api/health');
      healthy = answer.body.ok === true;
      if (healthy) break;
    } catch {
      await sleep(100);
    }
  }
  if (!healthy) throw new Error(`El servidor no arranco. ${serverLogs}`);
  console.log('OK: servidor local disponible.');

  const home = await fetch(address + '/');
  if (!home.ok || !(await home.text()).includes('Motion Studio')) {
    throw new Error('No se pudo servir la interfaz del editor.');
  }
  console.log('OK: interfaz HTML disponible.');

  const saved = await request('/api/project', {
    method: 'PUT', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(project),
  });
  if (saved.status !== 200 || saved.body.project.scenes.length !== 1) {
    throw new Error(`No se pudo guardar el proyecto (${saved.status}): ${JSON.stringify(saved.body)}`);
  }
  const retrieved = await request('/api/project');
  if (retrieved.body.project.scenes[0].title !== 'PRUEBA COMPLETA') {
    throw new Error('El proyecto guardado no se recupero correctamente.');
  }
  console.log('OK: guardar y volver a abrir proyecto.');
  const wrongReset = await request('/api/reset-local-content', {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({confirm:'no'}),
  });
  if (wrongReset.status !== 400) throw new Error('Debe pedir la frase exacta de confirmación de limpieza.');
  const disabledReset = await request('/api/reset-local-content', {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({confirm:'BORRAR DATOS LOCALES'}),
  });
  if (disabledReset.status !== 400 || !/entorno de pruebas/.test(disabledReset.body.error ?? '')) {
    throw new Error('El endpoint de limpieza debe proteger los datos en el smoke test.');
  }
  const afterResetCheck = await request('/api/project');
  if (afterResetCheck.body.project.scenes[0].title !== 'PRUEBA COMPLETA') {
    throw new Error('Una solicitud de limpieza rechazada alteró el proyecto.');
  }
  console.log('OK: la limpieza local exige confirmación y no se ejecuta en tests.');

  const fake = await fetch(address + '/api/assets?name=script.exe', {
    method: 'PUT', body: new Uint8Array([77, 90]),
  });
  if (fake.status !== 400) throw new Error('Un archivo no permitido fue aceptado.');
  console.log('OK: importaciones peligrosas rechazadas.');

  const pixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL7nwAAAABJRU5ErkJggg==',
    'base64',
  );
  const accepted = await request('/api/assets?name=prueba.png', {
    method: 'PUT', headers: {'Content-Type': 'image/png'}, body: pixel,
  });
  if (accepted.status !== 201 || !accepted.body.asset.startsWith('user-assets/')) {
    throw new Error('La imagen valida no pudo importarse.');
  }
  const downloadedAsset = await fetch(address + '/' + accepted.body.asset);
  if (!downloadedAsset.ok || (await downloadedAsset.arrayBuffer()).byteLength !== pixel.length) {
    throw new Error('La imagen importada no pudo recuperarse.');
  }
  console.log('OK: imagen valida importada y recuperada.');

  const wav = Buffer.alloc(44 + 16000);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24);
  wav.writeUInt32LE(32000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(16000, 40);
  const voice = await request('/api/assets?name=voz.wav', {
    method: 'PUT', headers: {'Content-Type': 'audio/wav'}, body: wav,
  });
  if (voice.status !== 201) throw new Error('No se pudo importar un WAV valido.');
  console.log('OK: narracion WAV importada.');
  project.audioAsset = voice.body.asset;
  project.scenes[0].imageAsset = accepted.body.asset;
  project.scenes[0].approved = true;
  const unapproved = structuredClone(project);
  unapproved.scenes[0].approved = false;
  const blocked = await request('/api/render', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(unapproved),
  });
  if (blocked.status !== 400 || !/aprueba/.test(blocked.body.error ?? '')) {
    throw new Error('No se bloqueo un render sin aprobacion.');
  }
  console.log('OK: render denegado si hay escenas pendientes.');

  const started = await request('/api/render', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(project),
  });
  if (started.status !== 202) throw new Error(`Render rechazado: ${JSON.stringify(started.body)}`);
  const second = await request('/api/render', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(project),
  });
  if (second.status !== 400) throw new Error('No se bloqueo el segundo render concurrente.');
  console.log('OK: limite de un render simultaneo.');

  let job = null;
  for (let i = 0; i < 180; i++) {
    await sleep(500);
    const response = await request(`/api/jobs/${started.body.jobId}`);
    job = response.body;
    if (job.status !== 'renderizando') break;
  }
  if (!job || job.status !== 'completado') {
    throw new Error(`El MP4 no se genero. ${job?.error || serverLogs.slice(-1500)}`);
  }
  const filename = job.download.split('/').pop();
  const file = path.join(temp, 'out', filename);
  const size = (await fs.stat(file)).size;
  if (size < 15000) throw new Error('El MP4 generado esta vacio.');
  console.log(`OK: MP4 real producido por Remotion (${size} bytes).`);
  try {
    const metadata = JSON.parse(execFileSync('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name,width,height,r_frame_rate',
      '-of', 'json', file,
    ], {encoding: 'utf8'}));
    const stream = metadata.streams?.[0];
    if (stream?.codec_name !== 'h264' || stream.width !== 720 || stream.height !== 1280) {
      throw new Error('Los metadatos del MP4 son incorrectos.');
    }
    console.log('OK: codec H.264 y resolucion 720 x 1280.');
    const audioStreams = JSON.parse(execFileSync('ffprobe', [
      '-v', 'error', '-select_streams', 'a',
      '-show_entries', 'stream=codec_type',
      '-of', 'json', file,
    ], {encoding: 'utf8'}));
    if (!audioStreams.streams?.some((stream) => stream.codec_type === 'audio')) {
      throw new Error('La narracion no quedo incluida en el MP4.');
    }
    console.log('OK: imagen y narracion integradas en el video.');
  } catch (error) {
    if (error.code === 'ENOENT') console.log('NOTA: ffprobe no instalado; verificacion de cabecera completada.');
    else throw error;
  }
  const dialogue = structuredClone(project);
  dialogue.style = 'horror';
  dialogue.showText = false;
  dialogue.narrationMode = 'dialogues';
  dialogue.voiceClips = [
    {id: 'clip1', speaker: 'Narrador', asset: voice.body.asset, duration: 0.5},
    {id: 'clip2', speaker: 'Llorona', asset: voice.body.asset, duration: 0.5},
  ];
  const dialogueStarted = await request('/api/render', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(dialogue),
  });
  if (dialogueStarted.status !== 202) throw new Error('No pudo iniciarse el render con dialogos.');
  let dialogueJob = null;
  for (let i = 0; i < 180; i++) {
    await sleep(500);
    const result = await request(`/api/jobs/${dialogueStarted.body.jobId}`);
    dialogueJob = result.body;
    if (dialogueJob.status !== 'renderizando') break;
  }
  if (dialogueJob?.status !== 'completado') {
    throw new Error(`Falló render narrativo con diálogos: ${dialogueJob?.error || ''}`);
  }
  const dialogueVideo = path.join(temp, 'out', dialogueJob.download.split('/').pop());
  const dialogueSize = (await fs.stat(dialogueVideo)).size;
  if (dialogueSize < 15000) throw new Error('MP4 narrativo vacío.');
  console.log(`OK: estilo terror + dos dialogos exportados en MP4 (${dialogueSize} bytes).`);
  const importedVideo = await request('/api/assets?name=hyperframes-clip.mp4', {
    method: 'PUT', headers: {'Content-Type': 'video/mp4'}, body: await fs.readFile(file),
  });
  if (importedVideo.status !== 201) throw new Error('El video MP4 no pudo importarse como escena.');
  const withVideo = structuredClone(project);
  withVideo.scenes[0].videoAsset = importedVideo.body.asset;
  const videoRender = await request('/api/render', {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(withVideo),
  });
  if (videoRender.status !== 202) throw new Error('No inició el render con clip importado.');
  let videoJob = null;
  for (let i = 0; i < 180; i++) {
    await sleep(500);
    const result = await request(`/api/jobs/${videoRender.body.jobId}`);
    videoJob = result.body;
    if (videoJob.status !== 'renderizando') break;
  }
  if (videoJob?.status !== 'completado') {
    throw new Error(`Falló la composición con MP4 importado: ${videoJob?.error || ''}`);
  }
  console.log('OK: clip MP4 importado, integrado y reexportado con Remotion.');
  const cloudStatus = await request('/api/integrations');
  if (JSON.stringify(cloudStatus.body.sceneContract) !== JSON.stringify(MOTION_STUDIO_CONTRACT)) {
    throw new Error('El servidor no expone el contrato compartido con el complemento.');
  }
  if (cloudStatus.status !== 200 || cloudStatus.body.paidApisEnabled !== false || !cloudStatus.body.openverse) {
    throw new Error('La configuración híbrida gratuita no está disponible.');
  }
  console.log('OK: integraciones opcionales; ninguna API de pago habilitada.');
  console.log('PRUEBA INTEGRAL V4 SUPERADA.');
} finally {
  const stopped = child.exitCode !== null
    ? Promise.resolve()
    : new Promise((resolve) => child.once('close', resolve));
  child.kill();
  await Promise.race([stopped, sleep(3000)]);
  await fs.rm(temp, {recursive: true, force: true})
    .catch((error) => console.warn('Carpeta temporal pendiente de limpieza:', error.message));
}
