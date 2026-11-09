import test from 'node:test';
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {legacyFontFilename} from './src/font-path-compat.mjs';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';

const root=path.dirname(fileURLToPath(import.meta.url));
test('resuelve la ruta Inter-Regular que fallaba con ENOENT en Windows',async()=>{
 const filename=legacyFontFilename('/assets/fonts/Inter-Regular.woff2');
 assert.equal(filename,'inter-500.woff2');
 await access(path.join(root,'public','fonts',filename));
});
test('los alias admitidos existen sin crear una ruta genérica insegura',async()=>{
 for(const variant of ['Inter-Medium.woff2','Inter-Bold.woff2']){
  const filename=legacyFontFilename('/assets/fonts/'+variant);
  assert.ok(filename);await access(path.join(root,'public','fonts',filename));
 }
 assert.equal(legacyFontFilename('/assets/fonts/../../secrets.txt'),null);
 assert.equal(legacyFontFilename('/assets/fonts/unknown.woff2'),null);
 assert.equal(legacyFontFilename('/assets/fonts/Inter-Regular.woff2/../../'),null);
});
test('servidor sirve Inter-Regular legado por HTTP sin ENOENT',async()=>{
 const freePort=await new Promise((resolve,reject)=>{
  const listener=createServer();listener.on('error',reject);
  listener.listen(0,'127.0.0.1',()=>{
   const port=listener.address().port;listener.close(()=>resolve(port));
  });
 });
 const runtime=await mkdtemp(path.join(tmpdir(),'motion-font-'));
 const child=spawn(process.execPath,['server.mjs'],{
  cwd:root,env:{...process.env,MOTION_STUDIO_TEST_ROOT:runtime,MOTION_STUDIO_PORT:String(freePort)},
  stdio:['ignore','pipe','pipe'],windowsHide:true,
 });
 let errors='';child.stderr.on('data',chunk=>{errors+=chunk.toString();});
 try{
  let response;
  for(let attempt=0;attempt<40;attempt++){
   try{response=await fetch(`http://127.0.0.1:${freePort}/assets/fonts/Inter-Regular.woff2`);break;}
   catch{await new Promise(resolve=>setTimeout(resolve,100));}
  }
  assert.ok(response,'Servidor no inició: '+errors);
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/font\/woff2/);
  assert.ok((await response.arrayBuffer()).byteLength>1000);
  assert.doesNotMatch(errors,/ENOENT/);
 }finally{
  child.kill();await rm(runtime,{recursive:true,force:true});
 }
});
