import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

export function probeVideo(file,{decode=false}={}){
 if(typeof file!=='string'||!file||!fs.statSync(file,{throwIfNoEntry:false})?.isFile())
  throw Error('No se dispone de un archivo de video: '+(file??'sin ruta'));
 const result=spawnSync('ffprobe',[
  '-v','error','-select_streams','V:0',...(decode?['-count_frames']:[]),
  '-show_entries','stream=width,height,avg_frame_rate,r_frame_rate,duration,nb_read_frames:format=duration',
  '-of','json',path.resolve(file)
 ],{encoding:'utf8',timeout:120000,windowsHide:true});
 if(result.error?.code==='ENOENT')throw Error('FFprobe no está disponible para verificar el video.');
 if(result.status!==0||result.stderr?.trim())throw Error('El archivo no es un video verificable: '+file);
 const info=JSON.parse(result.stdout),stream=info.streams?.[0];
 if(!stream?.width||!stream?.height||(decode&&!(Number(stream.nb_read_frames)>0)))
  throw Error('El archivo no contiene fotogramas de video verificables: '+file);
 const duration=[stream.duration,info.format?.duration].map(Number).find(n=>Number.isFinite(n)&&n>0);
 if(!duration)throw Error('No se pudo leer la duración del video: '+file);
 const fps=[stream.avg_frame_rate,stream.r_frame_rate].map(rate=>{
  const [n,d]=String(rate??'').split('/').map(Number);
  return n/d;
 }).find(n=>Number.isFinite(n)&&n>0);
 return {duration,fps};
}
