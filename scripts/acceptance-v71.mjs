import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import net from 'node:net';
import {execFileSync} from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'motion-studio-acceptance-'));
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL7nwAAAABJRU5ErkJggg==', 'base64');
const freePort = () => new Promise((resolve, reject) => {
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
let logs = '';
child.stdout.on('data', (data) => {logs += data;});
child.stderr.on('data', (data) => {logs += data;});
const request = async (route, options) => {
  const response = await fetch(address + route, options);
  const body = await response.json();
  return {status: response.status, body};
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitForServer = async () => {
  for (let i = 0; i < 50; i++) {
    try {
      const result = await request('/api/health');
      if (result.body.ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error(`Servidor no arrancó. ${logs}`);
};
const upload = async (name, bytes) => request(`/api/assets?name=${encodeURIComponent(name)}`, {
  method: 'PUT', headers: {'Content-Type': 'application/octet-stream'}, body: bytes,
});
const probe = (file) => JSON.parse(execFileSync('ffprobe', [
  '-v', 'error', '-select_streams', 'v:0',
  '-show_entries', 'stream=codec_name,width,height,r_frame_rate',
  '-of', 'json', file,
], {encoding: 'utf8'})).streams?.[0];

try {
  await waitForServer();
  console.log('OK servidor local');
  const base = (await request('/api/project')).body.project;
  const image = await upload('acceptance.png', pixel);
  if (image.status !== 201) throw new Error('Debe aceptar PNG válido.');
  const project = structuredClone(base);
  project.name = 'Prueba 1080p 30 FPS';
  project.resolution = '1080p';
  project.audioAsset = '';
  project.musicAsset = '';
  project.fps = 30;
  project.scenes = [{...project.scenes[0], id: 'acceptance', duration: 1, title: 'PRUEBA 1080P', imageAsset: image.body.asset, approved: true}];
  const saved = await request('/api/project', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(project)});
  if (saved.status !== 200 || saved.body.project.resolution !== '1080p' || saved.body.project.fps !== 30) throw new Error('No conserva resolución/FPS.');
  console.log('OK guarda proyecto 1080p/30 FPS');
  const rejected = await request('/api/assets?name=fuente.exe', {method: 'PUT', body: Buffer.from('MZ')});
  if (rejected.status !== 400) throw new Error('Debe rechazar extensiones peligrosas.');
  console.log('OK rechaza archivo no permitido');
  const pending = structuredClone(project);
  pending.scenes[0].approved = false;
  const blocked = await request('/api/render', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(pending)});
  if (blocked.status !== 400 || !/aprueba/i.test(blocked.body.error ?? '')) throw new Error('Debe bloquear escena no aprobada.');
  console.log('OK bloquea exportación sin aprobación');
  const started = await request('/api/render', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(project)});
  if (started.status !== 202) throw new Error(`Render no iniciado: ${JSON.stringify(started.body)}`);
  let job;
  for (let i = 0; i < 180; i++) {
    await sleep(500);
    job = (await request(`/api/jobs/${started.body.jobId}`)).body;
    if (job.status !== 'renderizando') break;
  }
  if (job?.status !== 'completado') throw new Error(`Render falló: ${job?.error || logs.slice(-1500)}`);
  const output = path.join(temp, 'out', path.basename(job.download));
  const stat = await fs.stat(output);
  if (stat.size < 15000) throw new Error('MP4 demasiado pequeño.');
  const stream = probe(output);
  if (stream?.codec_name !== 'h264' || stream.width !== 1080 || stream.height !== 1920 || stream.r_frame_rate !== '30/1') {
    throw new Error(`Metadatos inesperados: ${JSON.stringify(stream)}`);
  }
  console.log('OK MP4 real: H.264, 1080x1920, 30 FPS');
  console.log('PRUEBA DE ACEPTACIÓN V7.1 SUPERADA');
} finally {
  child.kill();
  await sleep(300);
  await fs.rm(temp, {recursive: true, force: true});
}
