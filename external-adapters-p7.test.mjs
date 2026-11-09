import test from 'node:test';
import assert from 'node:assert/strict';
import {planExternalRequest,EXTERNAL_PROVIDERS} from './src/external-adapters-p7.mjs';
import {generateExternalRequest} from './plugins/motion-graphics/skills/motion-graphics/scripts/plan-external-request.mjs';
import {planExternalRequest as pluginPlan} from './plugins/motion-graphics/skills/motion-graphics/scripts/compat/src/external-adapters-p7.mjs';
import {segmentWithRemoveBg} from './cloud-integrations.mjs';
import {MOTION_STUDIO_CONTRACT} from './src/motion-capabilities.mjs';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const asset='user-assets/00000000-0000-4000-8000-000000000000.png';
const samples=[
 {provider:'removebg',operation:'segment',asset,size:'preview'},
 {provider:'openverse',operation:'search',query:'bosque neblinoso'},
 {provider:'pixabay',operation:'search',query:'cielo nocturno'},
 {provider:'higgsfield',operation:'generate-video',prompt:'Movimiento suave de cámara sobre una ciudad de papel',model:'sample-model',duration:5,aspectRatio:'16:9'},
];
test('P7: cuatro planes compatibles y sin claves compartidos por complemento y sistema',()=>{
 assert.deepEqual(EXTERNAL_PROVIDERS,MOTION_STUDIO_CONTRACT.externalP7.providers);
 for(const s of samples){const a=planExternalRequest(s);assert.deepEqual(pluginPlan(s),a);assert.deepEqual(generateExternalRequest(s),a);
  assert.ok(!JSON.stringify(a).includes('secret'));}
 assert.equal(planExternalRequest(samples[3]).dispatchable,false);
 assert.equal(planExternalRequest(samples[0]).paid,true);
});
test('P7: bloquea URL arbitraria, proveedor desconocido, modelo dudoso y duración',()=>{
 assert.throws(()=>planExternalRequest({...samples[0],asset:'https://example.com/image.png'}),/P7/);
 assert.throws(()=>planExternalRequest({...samples[0],asset:'user-assets/../../x.png'}),/P7/);
 assert.throws(()=>planExternalRequest({...samples[3],model:'x;rm -rf /'}),/P7/);
 assert.throws(()=>planExternalRequest({...samples[3],duration:300}),/P7/);
 assert.throws(()=>planExternalRequest({provider:'random',operation:'search',query:'q'}),/P7/);
});
const png=()=>{const b=Buffer.alloc(45);Buffer.from('89504e470d0a1a0a','hex').copy(b,0);b.writeUInt32BE(13,8);b.write('IHDR',12);b.writeUInt32BE(1,16);b.writeUInt32BE(1,20);b[24]=8;b[25]=6;return b;};
test('P7: el adaptador remove.bg prepara multipart y aísla la clave del resultado',async()=>{
 let calls=0;const key='SECRETO_P7';
 const output=await segmentWithRemoveBg(Buffer.alloc(32,1),'photo.png',key,{fetcher:async(url,opts)=>{
  calls++;assert.equal(url,'https://api.remove.bg/v1.0/removebg');
  assert.equal(opts.headers['X-Api-Key'],key);
  assert.equal(opts.redirect,'manual');
  assert.equal(opts.body.get('size'),'preview');assert.equal(opts.body.get('format'),'png');
  return new Response(png(),{headers:{'content-type':'image/png'}});
 }});
 assert.equal(calls,1);assert.equal(output.ext,'.png');assert.equal(output.bytes[25],6);
 assert.ok(!JSON.stringify({provider:output.provider,size:output.size}).includes(key));
});
test('P7: rechaza falta de clave, imagen grande, HTTP fallido, MIME falso y PNG sin alfa',async()=>{
 await assert.rejects(segmentWithRemoveBg(Buffer.alloc(32),'photo.png',''),/REMOVE_BG_API_KEY/);
 await assert.rejects(segmentWithRemoveBg(Buffer.alloc(23*1024*1024),'photo.png','key'),/22 MB/);
 await assert.rejects(segmentWithRemoveBg(Buffer.alloc(32),'photo.png','key',{fetcher:async()=>new Response('cuota agotada',{status:402})}),/HTTP 402/);
 await assert.rejects(segmentWithRemoveBg(Buffer.alloc(32),'photo.png','key',{fetcher:async()=>new Response('{}',{headers:{'content-type':'application/json'}})}),/no es PNG/);
 const opaque=png();opaque[25]=2;
 await assert.rejects(segmentWithRemoveBg(Buffer.alloc(32),'photo.png','key',{fetcher:async()=>new Response(opaque,{headers:{'content-type':'image/png'}})}),/canal alfa/);
});
test('P7: el servidor de código puro no expone adaptadores externos',async()=>{
 const net=createServer();net.listen(0,'127.0.0.1');await once(net,'listening');
 const port=net.address().port;net.close();await once(net,'close');
 const root=await mkdtemp(path.join(tmpdir(),'ms-p7-http-'));
 const child=spawn(process.execPath,['server.mjs'],{cwd:import.meta.dirname,
  env:{...process.env,MOTION_STUDIO_PORT:String(port),MOTION_STUDIO_TEST_ROOT:root},stdio:'ignore'});
 try{
  let ready=false;
  for(let i=0;i<40;i++){
   await delay(120);
   try{const reply=await fetch(`http://127.0.0.1:${port}/api/health`);if(reply.ok){ready=true;break;}}
   catch{if(child.exitCode!==null)break;}
  }
  assert.equal(ready,true,'el servidor local debe iniciar');
  const url=`http://127.0.0.1:${port}`,post=async(endpoint,body)=>fetch(url+endpoint,{
   method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const planned=await post('/api/external/plan',samples[3]);
  assert.equal(planned.status,404);
  const denied=await post('/api/external/segment',{asset});
  assert.equal(denied.status,404);
  const invalid=await post('/api/external/plan',{provider:'higgsfield',operation:'generate-video',prompt:'x'});
  assert.equal(invalid.status,404);
 }finally{child.kill();await rm(root,{recursive:true,force:true});}
});
