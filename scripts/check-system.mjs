import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import process from 'node:process';
import {spawnSync} from 'node:child_process';
import {addWindowsMediaPaths} from './windows-media-path.mjs';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
addWindowsMediaPaths({projectRoot});

const gb = (os.totalmem() / (1024 ** 3)).toFixed(1);
console.log('Comprobacion del equipo para Motion Studio');
console.log('------------------------------------------');
console.log(`Sistema: ${os.platform()} ${os.release()}`);
console.log(`Procesador: ${os.cpus()[0]?.model ?? 'desconocido'}`);
console.log(`RAM total: ${gb} GB`);
console.log(`Node.js: ${process.version} (${process.arch})`);
console.log('Motor principal: HyperFrames, 24 FPS por defecto; admite 30 FPS/1080p. Remotion queda como alternativa.');
for (const command of ['ffmpeg', 'ffprobe']) {
  const result = spawnSync(command, ['-version'], {stdio: 'ignore', windowsHide: true});
  if (!result.error && result.status === 0) console.log(`${command}: disponible.`);
  else console.warn(`AVISO: ${command} no aparece en PATH. Ejecuta instalar-ffmpeg.cmd para preparar HyperFrames.`);
}
const major = Number(process.versions.node.split('.')[0]);
if (major < 22) console.warn('AVISO: HyperFrames requiere Node.js 22 o superior.');
if (os.totalmem() < 6 * (1024 ** 3)) {
  console.warn('ADVERTENCIA: menos de 6 GB de memoria; cierre otros programas.');
}
if (process.arch !== 'x64' && process.arch !== 'arm64') {
  console.warn('ADVERTENCIA: arquitectura no probada por este prototipo.');
}
