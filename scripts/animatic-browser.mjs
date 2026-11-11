import fs from 'node:fs/promises';
import path from 'node:path';
import {launch} from 'puppeteer-core';
import {ensureBrowser} from '@remotion/renderer';
import {exportHyperframesProject} from '../src/hyperframes-bridge.mjs';
import {validateProject} from '../server-utils.mjs';
import {collectProjectAssets} from '../src/project-assets.mjs';
import {checkCustomScenePreflight} from '../src/custom-scene-preflight.mjs';
import {renderBrowserArgs,closeRenderBrowser} from './render-browser.mjs';

const studio=path.resolve(import.meta.dirname,'..');
const imageMime={'.png':'image/png','.jpeg':'image/jpeg','.jpg':'image/jpeg','.webp':'image/webp'};
const policy="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'";

export async function withAnimaticPage(raw,{browserExecutable=process.env.MOTION_STUDIO_BROWSER}={},run){
 const project=validateProject(raw);
 const preflight=checkCustomScenePreflight(project);
 if(!preflight.passed)throw Error(preflight.errors.join('\n'));
 const assets={};
 for(const asset of collectProjectAssets(project)){
  const ext=path.extname(asset).toLowerCase();
  if(ext==='.mp4')throw Error('La previsualización del animatic requiere escenas sin clips MP4 incrustados.');
  if(imageMime[ext])assets[asset]='data:'+imageMime[ext]+';base64,'+(await fs.readFile(path.join(studio,'public',asset))).toString('base64');
 }
 const gsap=await fs.readFile(path.join(studio,'public/hyperframes/gsap.min.js'),'utf8');
 const html=exportHyperframesProject(project,undefined,gsap,assets).replace('<head>',`<head><meta http-equiv="Content-Security-Policy" content="${policy}">`);
 if(!browserExecutable){
  try{browserExecutable=(await ensureBrowser({onBrowserDownload:()=>{throw Error('No se descarga un navegador durante el animatic.');}})).path;}
  catch{throw Error('Configura --browser o MOTION_STUDIO_BROWSER con el navegador de render instalado.');}
 }
 const browser=await launch({executablePath:browserExecutable,headless:'shell',pipe:true,args:renderBrowserArgs(),timeout:30000});
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request',request=>{
   if(request.url().startsWith('data:')||request.url()==='about:blank')void request.continue();
   else void request.abort();
  });
  const scale=project.resolution==='1080p'?1.5:1;
  const [width,height]=(project.format==='vertical'?[720,1280]:[1280,720]).map(n=>n*scale);
  await page.setViewport({width,height,deviceScaleFactor:1});
  await page.setContent(html,{waitUntil:'load'});
  const duration=project.scenes.reduce((t,s)=>t+s.duration,0);
  const actual=await page.evaluate(async()=>{
   await document.fonts.ready;
   return window.__timelines?.['motion-studio-7']?.duration();
  });
  if(!Number.isFinite(actual)||Math.abs(actual-duration)>.002)throw Error('La composición no coincide con la línea de tiempo del proyecto.');
  const seek=async frame=>{
   const state=await page.evaluate(t=>{
    window.__timelines['motion-studio-7'].time(t,false);
    let active=0;
    for(const clip of document.querySelectorAll('.clip')){
     const start=Number(clip.dataset.start),end=start+Number(clip.dataset.duration);
     const visible=t>=start-1e-9&&t<end-1e-9;
     clip.style.display=visible?'':'none';
     if(visible)active++;
    }
    return {active,errors:window.__motionStudioErrors??[]};
   },frame/project.fps);
   if(!state.active||state.errors.length||errors.length)throw Error('Fotograma '+frame+': '+[...state.errors,...errors].join(' | '));
  };
  return await run({page,seek,project,duration,width,height});
 }finally{await closeRenderBrowser(browser);}
}
