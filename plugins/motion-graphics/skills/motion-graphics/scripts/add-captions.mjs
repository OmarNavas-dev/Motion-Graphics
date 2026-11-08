import {repairLegacyCaptionScript} from './compat/src/caption-compat.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function captionGroups(words) {
 const groups=[];let current=[];
 words.forEach((w,i)=>{current.push(w);const next=words[i+1];
 if(!next||/[.,;:?!…]["”)»]*$/.test(w.text)||current.length>=5||next.start-w.end>=.4){groups.push(current);current=[];}
 });return groups;
}
export function addCaptions(raw,timing) {
 const p=structuredClone(raw.project??raw),words=timing.words;
 if(timing.timeBase && timing.timeBase!=='global')throw new Error('Se requieren tiempos globales del audio. No sumar offsets ni escalar tiempos locales sin una conversion explicita.');
 if(!Array.isArray(words)||!words.length)throw new Error('Faltan palabras temporizadas.');
 let previous=0;
 for(const w of words){if(typeof w.text!=='string'||!w.text.trim()||!Number.isFinite(w.start)||!Number.isFinite(w.end)||w.start<previous||w.end<=w.start||(w.box!==undefined&&typeof w.box!=='boolean'))throw new Error('Palabras, tiempos o box invalidos.');previous=w.end;}
 const duration=p.scenes.reduce((sum,s)=>sum+s.duration,0);
 if(timing.duration!==undefined && (!Number.isFinite(timing.duration)||Math.abs(timing.duration-duration)>1/(p.fps??24)+.001))throw new Error('La duracion del archivo de palabras no coincide con el proyecto. No estirar los tiempos para ajustarlos.');
 if(words.at(-1).end>duration+.001)throw new Error('Palabras fuera de la duracion del proyecto.');
 p.wordTimings=words.map(w=>({text:w.text,start:w.start,end:w.end,emphasis:!!w.box}));
 const width=timing.canvasWidth??720;
 if(!Number.isFinite(width)||width<=0)throw new Error('canvasWidth invalido.');
 const size=.045*width;
 let start=0;
 for(const scene of p.scenes){
 const end=start+scene.duration,c=scene.customScene;
 if(!c?.html||/dvj-caption|spoken-caption|clip-title|clip-key/.test(c.html)||scene.authored?.layers?.some(l=>l.type==='caption'))throw new Error('Requiere customScene sin titulos existentes.');
 const local=words.filter(w=>w.start<end-.00001&&w.end>start+.00001).map(w=>({...w,start:Math.max(0,w.start-start),end:Math.min(scene.duration,w.end-start)}));
 const groups=captionGroups(local);
 c.html+=groups.map((g,i)=>'<div class="dvj-caption dvj-g'+i+'">'+g.map((w,j)=>'<span class="dvj-word dvj-w'+j+(w.box?' dvj-box':'')+'">'+escape(w.text)+(w.box?'<i class="dvj-handle dvj-tl"></i><i class="dvj-handle dvj-tr"></i><i class="dvj-handle dvj-bl"></i><i class="dvj-handle dvj-br"></i>':'')+'</span>').join(' ')+'</div>').join('');
 c.css=(c.css||'')+'__SCENE__ .dvj-caption{position:absolute;z-index:30;top:11%;left:6%;width:88%;transform:translateY(-50%);text-align:center;font:500 '+size+'px/1.25 "MS Inter",Inter,Arial,Helvetica,sans-serif;color:#ffffff80;text-shadow:0 2px 14px #000000a6;opacity:0;visibility:hidden;pointer-events:none}__SCENE__ .dvj-word{position:relative;display:none;transform-origin:50% 50%;font-weight:500;color:#ffffff80}__SCENE__ .dvj-box{padding:0 '+size*.18+'px;outline:'+Math.max(1.5,size*.05)+'px solid transparent}__SCENE__ .dvj-handle{position:absolute;display:block;width:'+size*.2+'px;height:'+size*.2+'px;box-sizing:content-box;background:#fff;border:'+Math.max(1,size*.04)+'px solid #4c8dff;visibility:hidden}__SCENE__ .dvj-tl{left:'+-size*.1+'px;top:'+-size*.1+'px}__SCENE__ .dvj-tr{right:'+-size*.1+'px;top:'+-size*.1+'px}__SCENE__ .dvj-bl{left:'+-size*.1+'px;bottom:'+-size*.1+'px}__SCENE__ .dvj-br{right:'+-size*.1+'px;bottom:'+-size*.1+'px}';
 const data=groups.map((g,i)=>({w:g.map(w=>[w.start,w.end,!!w.box]),hide:Math.max(0,Math.min(scene.duration,g.at(-1).end+.45,groups[i+1]?Math.max(0,groups[i+1][0].start-.02):Infinity))}));
 c.script=(c.script||'')+'\n{const groups='+JSON.stringify(data)+';tl.set(S+" .dvj-caption",{autoAlpha:0},T0);tl.set(S+" .dvj-word",{display:"none",color:"#ffffff80",fontWeight:500,scale:1,outlineColor:"transparent"},T0);tl.set(S+" .dvj-handle",{visibility:"hidden"},T0);groups.forEach((g,i)=>{const e=document.querySelector(S+" .dvj-g"+i);g.w.forEach((w,j)=>{const n=e.querySelector(".dvj-w"+j),a=Math.max(0,w[0]-.02);if(j===0)tl.set(e,{autoAlpha:1},T0+a);if(j>0){const prev=e.querySelector(".dvj-w"+(j-1));tl.set(prev,{color:"#ffffff80",fontWeight:500,scale:1,outlineColor:"transparent"},T0+a);tl.set(prev.querySelectorAll(".dvj-handle"),{visibility:"hidden"},T0+a);}tl.set(n,{display:"inline-block",color:"#fff",fontWeight:800,scale:1.1,outlineColor:w[2]?"#4c8dff":"transparent"},T0+a);if(w[2])tl.set(n.querySelectorAll(".dvj-handle"),{visibility:"visible"},T0+a);tl.to(n,{scale:1,duration:Math.min(.14,Math.max(0,g.hide-a)),ease:"none"},T0+a);});tl.set(e,{autoAlpha:0},T0+g.hide);});}';
 c.script=repairLegacyCaptionScript(c.script);
 scene.captions=[];scene.captionMode='embedded';
 if(c.html.length>150000||c.css.length>50000||c.script.length>100000)throw new Error('Limite customScene excedido en '+scene.id+'; dividir escena.');
 start=end;
 }return raw.project?{...raw,project:p}:p;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){try{
 const [project,words,output]=process.argv.slice(2);if(!output)throw new Error('Uso: node add-captions.mjs proyecto-sin-titulos.json palabras.json proyecto.json');
 if(fs.existsSync(output))throw new Error('El archivo destino ya existe; elegir otro.');
 const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));fs.writeFileSync(output,JSON.stringify(addCaptions(read(project),read(words)),null,2),'utf8');console.log('JSON con titulos guardado. Validar antes de entregar.');
}catch(e){console.error(e.message);process.exitCode=1;}}

