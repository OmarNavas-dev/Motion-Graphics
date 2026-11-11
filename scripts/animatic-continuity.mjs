import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {decodeScreenshotPNG} from '../plugins/motion-graphics/skills/motion-graphics/scripts/compare-png.mjs';

const round=n=>Number(n.toFixed(5));
const selector=/^[.#][A-Za-z_][\w-]*$/;
const center=b=>[b.x+b.width/2,b.y+b.height/2];
const defaults={position:.02,scale:.12,appearance:18};
const limits={position:1,scale:4,appearance:255};

export function continuityPlan(raw,project){
 if(raw==null)return [];
 if(!Array.isArray(raw))throw Error('continuity debe contener una lista de empalmes.');
 const seen=new Set();
 return raw.map(cut=>{
  const index=project.scenes.findIndex(s=>s.id===cut?.from);
  if(index<0||project.scenes[index+1]?.id!==cut?.to)throw Error('Empalme inválido: '+cut?.from+' → '+cut?.to);
  if(seen.has(index))throw Error('Empalme repetido: '+cut.from+' → '+cut.to);
  seen.add(index);
  if(!Array.isArray(cut.objects)||!cut.objects.length)throw Error('Faltan objetos del empalme '+cut.from);
  const ids=new Set();
  return {from:cut.from,to:cut.to,index,objects:cut.objects.map(object=>{
   if(typeof object?.id!=='string'||!object.id.trim()||ids.has(object.id)||!selector.test(object.exit)||!selector.test(object.entry))
    throw Error('Objeto o selector inválido en '+cut.from+' → '+cut.to);
   ids.add(object.id);
   if(object.tolerance!==undefined&&(!object.tolerance||typeof object.tolerance!=='object'||Array.isArray(object.tolerance)))
    throw Error('Tolerancia inválida para '+object.id);
   const tolerance={...defaults,...object.tolerance};
   if(Object.entries(tolerance).some(([key,value])=>!Object.hasOwn(limits,key)||!Number.isFinite(value)||value<0||value>limits[key]))
    throw Error('Tolerancia inválida para '+object.id);
   return {id:object.id,exit:object.exit,entry:object.entry,tolerance};
  })};
 });
}

function appearanceDifference(a,b,boxA,boxB){
 const values=(image,box,x,y)=>{
  const i=Math.floor(box.x+(x+.5)*box.width/16);
  const j=Math.floor(box.y+(y+.5)*box.height/16);
  return (j*image.width+i)*image.channels;
 };
 let total=0;
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){
  const i=values(a,boxA,x,y),j=values(b,boxB,x,y);
  for(let channel=0;channel<3;channel++)total+=Math.abs(a.pixels[i+channel]-b.pixels[j+channel]);
 }
 return total/(16*16*3);
}

async function readBoundary({page,seek,width,height},frame,sceneIndex,selectors,video,file){
 await seek(frame);
 const boxes=await page.evaluate(({sceneIndex,selectors})=>{
  const scene=document.getElementById('hf-scene-'+sceneIndex);
  return selectors.map(selector=>{
   const nodes=scene?.querySelectorAll(selector);
   if(nodes?.length!==1)return null;
   const node=nodes[0],box=node.getBoundingClientRect();
   for(let n=node;n;n=n.parentElement){
    const style=getComputedStyle(n);
    if(style.display==='none'||style.visibility!=='visible'||Number(style.opacity)<.05)return null;
    if(n===scene)break;
   }
   if(box.width<1||box.height<1||box.x<0||box.y<0||box.right>innerWidth||box.bottom>innerHeight)return null;
   return {x:box.x,y:box.y,width:box.width,height:box.height};
  });
 },{sceneIndex,selectors});
 const png=execFileSync('ffmpeg',['-nostdin','-v','error','-i',video,'-an','-vf','select=eq(n\\,'+frame+')',
  '-frames:v','1','-pix_fmt','rgb24','-f','image2pipe','-c:v','png','-threads','1','-'],{maxBuffer:24*1024*1024,timeout:120000,windowsHide:true});
 if(!png.length)throw Error('El MP4 no contiene el fotograma '+frame+'.');
 const image=decodeScreenshotPNG(png);
 if(image.width!==width||image.height!==height)throw Error('El MP4 no coincide con las dimensiones del proyecto.');
 await fs.writeFile(file,png);
 return {boxes,image};
}

export async function auditAnimaticContinuity(context,plan,video,out){
 const {project,width,height}=context;
 const cuts=[];
 for(const [i,cut] of plan.entries()){
  const time=project.scenes.slice(0,cut.index+1).reduce((t,s)=>t+s.duration,0);
  const entryFrame=Math.ceil(time*project.fps-1e-7),exitFrame=entryFrame-1;
  const exitFile='empalme-'+(i+1)+'-salida.png',entryFile='empalme-'+(i+1)+'-entrada.png';
  const a=await readBoundary(context,exitFrame,cut.index,cut.objects.map(o=>o.exit),video,path.join(out,exitFile));
  const b=await readBoundary(context,entryFrame,cut.index+1,cut.objects.map(o=>o.entry),video,path.join(out,entryFile));
  const objects=cut.objects.map((object,k)=>{
   const [before,after]=[a.boxes[k],b.boxes[k]];
   if(!before||!after)return {...object,status:'unverified',reason:'El selector no es único o el objeto no está completamente visible.'};
   const [x,y]=center(before),[u,v]=center(after);
   const measured={position:round(Math.hypot(x-u,y-v)/Math.min(width,height)),
    scale:round(Math.max(Math.abs(after.width/before.width-1),Math.abs(after.height/before.height-1))),
    appearance:round(appearanceDifference(a.image,b.image,before,after))};
   const flags=Object.keys(measured).filter(key=>measured[key]>object.tolerance[key]);
   return {...object,status:flags.length?'changed':'matched',before,after,measured,flags};
  });
  cuts.push({from:cut.from,to:cut.to,time:round(time),exitFrame,entryFrame,exitFile,entryFile,objects});
 }
 return {schema:'motion-studio.animatic-continuity/1',fps:project.fps,
  status:!cuts.length?'not-declared':cuts.every(c=>c.objects.every(o=>o.status==='matched'))?'matched':'review-required',cuts};
}
