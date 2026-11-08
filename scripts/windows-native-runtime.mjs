import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const healthy=directory=>['ffmpeg.exe','ffprobe.exe'].every(file=>{
 const r=spawnSync(path.join(directory,file),['-version'],{cwd:directory,encoding:'utf8',windowsHide:true,timeout:10000});
 return !r.error&&r.status===0;
});

export function truncatedCertificate(bytes){
 if(bytes.length<64||bytes.toString('ascii',0,2)!=='MZ')return false;
 const pe=bytes.readUInt32LE(60),optional=pe+24;
 if(optional+150>bytes.length)return false;
 const entry=optional+(bytes.readUInt16LE(optional)===0x20b?112:96)+32;
 const start=bytes.readUInt32LE(entry),size=bytes.readUInt32LE(entry+4);
 return start>0&&size>0&&start+size>bytes.length;
}

// Work around two malformed PE dependencies without editing node_modules or Windows.
// Uses the matching VC10 runtime from Windows and ABI-compatible zlib from Git.
// No downloads, signature stripping, security changes or arbitrary DLL search.
export function prepareWindowsNativeRuntime({root=process.cwd(),platform=process.platform}={}){
 if(platform!=='win32'||process.arch!=='x64')return null;
 const require=createRequire(path.join(root,'package.json'));
 const original=path.dirname(require.resolve('@remotion/compositor-win32-x64-msvc'));
 const broken=['msvcr100.dll','zlib1.dll'].filter(file=>truncatedCertificate(fs.readFileSync(path.join(original,file))));
 if(!broken.length)return null;
 const replacements={
  'msvcr100.dll':path.join(process.env.SystemRoot||'C:/Windows','System32','msvcr100.dll'),
  'zlib1.dll':['C:/Program Files/Git/ucrt64/bin/zlib1.dll','C:/Program Files/Git/mingw64/bin/zlib1.dll'].find(file=>fs.existsSync(file)),
 };
 const hash=createHash('sha256');
 const version=JSON.parse(fs.readFileSync(path.join(original,'package.json'),'utf8')).version;
 for(const file of broken){
  const replacement=replacements[file];
  if(!replacement||!fs.existsSync(replacement))throw Error(`Remotion incluye ${file} incompleto y no hay una copia compatible instalada. No se modificó la seguridad del equipo.`);
  const bytes=fs.readFileSync(replacement);
  if(truncatedCertificate(bytes))throw Error(`La dependencia de respaldo ${file} también está incompleta.`);
  hash.update(file).update(bytes);
 }
 const directory=path.join(root,'.motion-studio-cache','native-runtime',version+'-'+hash.digest('hex').slice(0,16));
 const marker=path.join(directory,'verified.json');
 if(fs.existsSync(marker))return directory;
 fs.mkdirSync(directory,{recursive:true});
 fs.cpSync(original,directory,{recursive:true});
 for(const file of broken)fs.copyFileSync(replacements[file],path.join(directory,file));
 if(!healthy(directory))throw Error('Los ejecutables multimedia siguen sin arrancar tras reparar las dependencias. Render detenido antes de procesar el proyecto.');
 fs.writeFileSync(marker,JSON.stringify({version,repaired:broken},null,2));
 return directory;
}
