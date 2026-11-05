import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {openBrowser} from '@remotion/renderer';
import {buildPreviewHtml} from '../preview-player.mjs';
const root=path.resolve(import.meta.dirname,'..');
const raw=JSON.parse(await fs.readFile(process.argv[2],'utf8')),project=raw.project??raw;
const html=buildPreviewHtml(project,await fs.readFile(path.join(root,'public/hyperframes/gsap.min.js'),'utf8'));
const audioPath=project.audioAsset;
const server=http.createServer(async(req,res)=>{
 if(req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(html);}
 if(req.url==='/'+audioPath){res.setHeader('Content-Type','audio/mpeg');return res.end(await fs.readFile(path.join(root,'public',audioPath)));}
 res.writeHead(404);res.end();
});server.listen(0,'127.0.0.1');await once(server,'listening');
let browser;
try{
 browser=await openBrowser('chrome',{browserExecutable:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',chromiumOptions:{headless:true}});
 const page=await browser.newPage({context:null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});
 await page.setViewport({width:720,height:1400,deviceScaleFactor:1});
 await page.goto({url:'http://127.0.0.1:'+server.address().port,timeout:30000,options:{waitUntil:'load'}});
 const duration=await page.evaluate(()=>window.__timelines['motion-studio-7'].duration());
 assert.ok(Math.abs(duration-132.05)<.001,'timeline must match audio; got '+duration);
 const inspect=async t=>page.evaluate(t=>{
  const tl=window.__timelines['motion-studio-7'];tl.time(t);
  const active=[...document.querySelectorAll('.dvj-word')].filter(n=>getComputedStyle(n.closest('.clip')).display!=='none'&&getComputedStyle(n.parentNode).visibility==='visible'&&getComputedStyle(n).display!=='none'&&getComputedStyle(n).fontWeight==='800').map(n=>n.childNodes[0].textContent);
  return {active,time:tl.time()};
 },t);
 assert.ok((await inspect(.8)).active.includes('momento.'));
 assert.deepEqual((await inspect(1.6)).active,[]);
 assert.ok((await inspect(1.8)).active.includes('Quiero'));
 assert.ok((await inspect(131.3)).active.includes('brazos.'));
 assert.ok((await inspect(.8)).active.includes('momento.'),'backward seek must preserve timing');
 console.log('OK: timeline real '+duration+' s; pausas y palabras comprobadas al inicio y al final; busqueda hacia atras sin desfase.');
}finally{if(browser)await browser.close({silent:true});await new Promise(resolve=>server.close(resolve));}
