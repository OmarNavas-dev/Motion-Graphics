import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {openBrowser} from '@remotion/renderer';
import {validateProject} from '../server-utils.mjs';

// Isolated project: never replace the user's saved montage.
const root = path.resolve(import.meta.dirname, '..');
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'ms-editor-preview-'));
const socket = net.createServer();
socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
const port = socket.address().port; await new Promise(resolve => socket.close(resolve));
const project = validateProject({name:'Prueba de vista fiel', fps:30, format:'vertical', scenes:[
  {id:'first', title:'Escena HTML',duration:3, customScene:{html:'<div class="proof">ESCENA REAL</div>',
    css:'__SCENE__{background:#163c52}__SCENE__ .proof{position:absolute;top:35%;color:white;font:60px Arial}',
    script:"tl.to(S+' .proof',{x:180,duration:D,ease:'none'},T0);"}},
  {id:'second', title:'Segunda escena',duration:3, customScene:{html:'<div class="proof">SEGUNDA ESCENA</div>',
    css:'__SCENE__{background:#70372d}__SCENE__ .proof{position:absolute;top:35%;color:white;font:60px Arial}',
    script:"tl.to(S+' .proof',{x:200,duration:5,repeat:20,yoyo:true},T0);"}},
]});
await fs.mkdir(path.join(temp, 'data'),{recursive:true});
await fs.writeFile(path.join(temp,'data/studio-project.json'),JSON.stringify(project));
const child = spawn(process.execPath,['server.mjs'],{cwd:root,windowsHide:true,
  env:{...process.env,MOTION_STUDIO_PORT:String(port),MOTION_STUDIO_TEST_ROOT:temp},stdio:'pipe'});
let browser;
try {
  const address = 'http://127.0.0.1:'+port;
  for(let i=0;i<100;i++) {
    try {if((await fetch(address+'/api/health')).ok) break;} catch {}
    await new Promise(r=>setTimeout(r,100));
  }
  browser = await openBrowser('chrome',{browserExecutable:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',chromiumOptions:{headless:true}});
  const page = await browser.newPage({context:null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});
  await page.setViewport({width:1366,height:1000,deviceScaleFactor:1});
  await page.goto({url:address,timeout:30000,options:{waitUntil:'load'}});
  const state = () => page.evaluate(() => {
    const frame=document.querySelector('iframe[title="Vista previa del video"]');
    const win=frame?.contentWindow,doc=frame?.contentDocument;
    const tl=win?.__timelines?.['motion-studio-7'];
    return {ready:!!tl,time:tl?.time(),duration:tl?.duration(),html:doc?.body.innerHTML,
      visible:doc ? [...doc.querySelectorAll('.clip')].filter(n=>win.getComputedStyle(n).display!=='none').map(n=>n.textContent):[],
      controls:!!doc?.querySelector('#ms-play')};
  });
  for(let i=0;i<100;i++){if((await state()).ready)break;await new Promise(r=>setTimeout(r,100));}
  let result=await state();assert.ok(result.ready,'iframe must initialize');assert.ok(result.controls);
  assert.equal(result.duration,6,'long repeats must not lengthen the video or retime words');
  assert.ok(result.html.includes('ESCENA REAL'));assert.ok(result.visible.some(s=>s.includes('ESCENA REAL')));
  await page.evaluate(()=>document.querySelectorAll('.timeline-segment')[1].click());
  await new Promise(r=>setTimeout(r,100));
  result=await state();assert.ok(Math.abs(result.time-3)<.05);assert.ok(result.visible.some(s=>s.includes('SEGUNDA ESCENA')));
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Ver mitad').click());
  await new Promise(r=>setTimeout(r,100));assert.ok((await state()).time>4.4);
  await page.evaluate(()=>document.querySelector('iframe').contentDocument.querySelector('#ms-play').click());
  const before=(await state()).time;await new Promise(r=>setTimeout(r,250));assert.ok((await state()).time>before);
  await page.evaluate(()=>document.querySelector('iframe').contentDocument.querySelector('#ms-play').click());
  // Unsaved edits must update the preview and retain its playhead.
  await page.evaluate(()=>{
    const input=document.querySelector('.inspector textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'Titulo editado');
    input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await new Promise(r=>setTimeout(r,700));
  assert.ok((await state()).ready);assert.ok((await state()).time>4.4);
  const saved=JSON.parse(await fs.readFile(path.join(temp,'data/studio-project.json'),'utf8'));
  assert.equal(saved.scenes[1].title,'Segunda escena','preview does not autosave over project');
  console.log('OK: editor principal muestra HTML/GSAP, controles, cambio de escena, inspector, reproduccion y edicion sin guardar a 30 FPS.');
} finally {
  if(browser)await browser.close({silent:true});
  const stopped=once(child,'exit');child.kill();await stopped;
}
