import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {validateProject} from '../server-utils.mjs';
import {collectProjectAssets} from '../src/project-assets.mjs';

const root=path.resolve(import.meta.dirname,'..');
const args=process.argv.slice(2),i=args.indexOf('--out');
if(!args[0]||i<0)throw Error('Uso: node scripts/verify-stable-render.mjs proyecto.json --out carpeta-nueva');
const out=path.resolve(args[i+1]);
await fs.mkdir(out,{recursive:true});
const run=await fs.mkdtemp(path.join(out,'isolated-server-'));
const raw=JSON.parse(await fs.readFile(path.resolve(args[0]),'utf8'));
const project=validateProject(raw.project??raw);
await fs.mkdir(path.join(run,'public/user-assets'),{recursive:true});
await fs.cp(path.join(root,'public/fonts'),path.join(run,'public/fonts'),{recursive:true});
for(const asset of collectProjectAssets(project)){
 const target=path.join(run,'public',asset);
 await fs.mkdir(path.dirname(target),{recursive:true});
 await fs.copyFile(path.join(root,'public',asset),target);
}
const probe=net.createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');
const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
const address='http://127.0.0.1:'+port;
await fs.writeFile(path.join(out,'isolated-server.json'),JSON.stringify({address,run},null,2));
const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,MOTION_STUDIO_PORT:String(port),MOTION_STUDIO_TEST_ROOT:run},windowsHide:true,stdio:['ignore','pipe','pipe']});
let logs='';const record=v=>{logs+=v;void fs.writeFile(path.join(out,'server.log'),logs);};child.stdout.on('data',record);child.stderr.on('data',record);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const request=async(route,method='GET',body)=>{
 let response;
 for(let attempt=0;attempt<3;attempt++){
  try{response=await fetch(address+route,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});break;}
  catch(error){if(method!=='GET'||attempt===2)throw error;await sleep(250);}
 }
 const value=await response.json();if(!response.ok)throw Error(`${response.status} ${route}: ${value.error||JSON.stringify(value)}`);return value;
};
try{
 let ready=false;
 for(let tries=0;tries<100;tries++){try{ready=(await request('/api/health')).ok;if(ready)break;}catch{}if(child.exitCode!==null)throw Error(logs);await sleep(100);}
 if(!ready)throw Error('El servidor de prueba no arrancó: '+logs);
 const imported=(await request('/api/project','PUT',project)).project;
 const reopened=(await request('/api/project')).project;
 if(JSON.stringify(reopened)!==JSON.stringify(imported))throw Error('Guardar y volver a abrir cambia el proyecto.');
 const contract=await request('/api/integrations');
 if(contract.sceneContract?.customScene?.engine!=='hyperframes-gsap')throw Error('Contrato de render incompatible.');
 // Only isolated test fixtures are approved here; the user's saved project is untouched.
 const approved={...reopened,scenes:reopened.scenes.map(s=>({...s,approved:true}))};
 const started=await request('/api/render/hyperframes','POST',approved);
 const id=started.jobId??started.id;if(!id)throw Error('El servidor no devolvió el trabajo de render.');
 let job,last='';
 for(let tries=0;tries<2400;tries++){
  job=await request('/api/jobs/'+id);
  if(tries%20===0)await fs.writeFile(path.join(out,'latest-job.json'),JSON.stringify(job,null,2));
  const progress=job.status+' '+job.progress+'%';if(progress!==last){console.log(progress);last=progress;}
  if(job.status!=='renderizando')break;
  await sleep(500);
 }
 await fs.writeFile(path.join(out,'render-job.json'),JSON.stringify(job,null,2));
 if(job?.status!=='completado')throw Error((job?.error||'Render incompleto')+'\n'+(job?.log||''));
 const download=job.download??('/exports/'+job.output);
 if(!/^\/exports\/studio-[a-f0-9-]+\.mp4$/.test(download))throw Error('Ruta de descarga inválida.');
 const result=await fetch(address+download);
 if(!result.ok)throw Error('El MP4 no se puede descargar.');
 const bytes=Buffer.from(await result.arrayBuffer()),video=path.join(out,'verified.mp4');
 await fs.writeFile(video,bytes);
 const inspection=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,codec_name,width,height,r_frame_rate','-of','json',video],{encoding:'utf8',windowsHide:true,timeout:30000});
 if(inspection.status!==0)throw Error('FFprobe no puede leer el MP4: '+inspection.stderr);
 const media=JSON.parse(inspection.stdout),duration=project.scenes.reduce((n,s)=>n+s.duration,0),fps=project.fps;
 if(Math.abs(Number(media.format.duration)-duration)>1/fps+.025)throw Error('Duración del MP4 distinta del proyecto.');
 const v=media.streams.find(s=>s.codec_type==='video');
 if(v?.codec_name!=='h264'||v.r_frame_rate!==fps+'/1')throw Error('Codec o FPS incorrectos.');
 if((project.audioAsset||project.voiceClips?.length)&&!media.streams.some(s=>s.codec_type==='audio'))throw Error('Falta el audio en el MP4.');
 const decode=spawnSync('ffmpeg',['-v','error','-i',video,'-f','null','-'],{encoding:'utf8',windowsHide:true,timeout:120000});
 if(decode.status!==0)throw Error('El MP4 presenta errores de decodificación: '+decode.stderr);
 const report={importAndSavePassed:true,renderPassed:true,downloadPassed:true,decodePassed:true,visualApproval:false,audioAlignmentVerified:false,sourceHash:createHash('sha256').update(JSON.stringify(project)).digest('hex'),videoHash:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,expectedDuration:duration,media};
 await fs.writeFile(path.join(out,'render-verification.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}finally{
 await fs.writeFile(path.join(out,'server.log'),logs);
 if(child.exitCode===null){const closed=once(child,'close');child.kill();await Promise.race([closed,sleep(3000)]);}
}
