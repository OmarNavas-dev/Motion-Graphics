import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const videoPath = path.resolve(process.argv[2] ?? 'out/motion-profesional.mp4');
if (!fs.existsSync(videoPath)) {
  console.error(`ERROR: el MP4 no existe: ${videoPath}`);
  process.exit(1);
}
const stats = fs.statSync(videoPath);
const header = Buffer.alloc(12);
const file = fs.openSync(videoPath, 'r');
try {
  fs.readSync(file, header, 0, 12, 0);
} finally {
  fs.closeSync(file);
}
if (stats.size < 15000 || header.toString('ascii', 4, 8) !== 'ftyp') {
  console.error('ERROR: archivo demasiado pequeno o sin cabecera MP4 valida.');
  process.exit(1);
}
console.log(`Archivo MP4 encontrado: ${(stats.size / 1024 / 1024).toFixed(2)} MiB`);

const check = spawnSync('ffprobe', [
  '-v', 'error', '-select_streams', 'v:0',
  '-show_entries', 'stream=codec_name,width,height,r_frame_rate,nb_frames:format=duration',
  '-of', 'json', videoPath,
], {encoding: 'utf8'});
if (check.error?.code === 'ENOENT') {
  console.log('VERIFICACION PARCIAL: archivo MP4 y cabecera correctos.');
  console.log('Para revisar codec, FPS y duracion, instale FFmpeg (incluye ffprobe).');
  process.exit(0);
}
if (check.status !== 0) {
  console.error('ERROR: ffprobe no pudo leer el video:', check.stderr);
  process.exit(1);
}
let metadata;
try {
  metadata = JSON.parse(check.stdout);
} catch {
  console.error('ERROR: datos invalidos de ffprobe.');
  process.exit(1);
}
const stream = metadata.streams?.[0];
const duration = Number(metadata.format?.duration);
const passed = Boolean(
  stream?.codec_name === 'h264' &&
  stream?.width === 720 &&
  stream?.height === 1280 &&
  stream?.r_frame_rate === '24/1' &&
  Math.abs(duration - 12) < 0.08 &&
  (stream?.nb_frames === undefined || Number(stream.nb_frames) === 288)
);
console.log(JSON.stringify({
  codec: stream?.codec_name,
  width: stream?.width,
  height: stream?.height,
  fps: stream?.r_frame_rate,
  frames: stream?.nb_frames ?? 'no reportado',
  seconds: duration,
}, null, 2));
if (!passed) {
  console.error('ERROR: las caracteristicas del MP4 no coinciden con la prueba.');
  process.exit(1);
}
console.log('VERIFICACION COMPLETA: H.264, 720 x 1280, 24 FPS, 12 segundos.');
