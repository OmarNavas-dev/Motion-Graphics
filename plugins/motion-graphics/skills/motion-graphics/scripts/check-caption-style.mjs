import {repairLegacyCaptionScript} from './compat/src/caption-compat.mjs';
import {addCaptions} from './add-captions.mjs';

// Recreate ONLY the subtitle suffix from the real source timings.
// Static titles, altered CSS and missing word animation must fail, even if the JSON is importable.
export function checkCaptionStyle(raw,timing) {
 const p=raw.project??raw,errors=[];
 if(p.showText===false || (p.scenes?.length && p.scenes.every(s=>s.captionMode==='none')))return errors;
 if(!Array.isArray(timing?.words)||!timing.words.length)return ['Faltan tiempos por palabra: pasar --words palabras.json. No sustituir subtitulos por titulos fijos.'];
 const skeleton={scenes:(p.scenes??[]).map(s=>({id:s.id,duration:s.duration,customScene:{html:'<div></div>',css:'',script:''}}))};
 let expected;
 try{expected=addCaptions(skeleton,timing);}catch(e){return ['Tiempos de subtitulos invalidos: '+e.message];}
 for(const [i,s] of (p.scenes??[]).entries()){
 const c=s.customScene??{},e=expected.scenes[i].customScene,label='Escena '+(i+1);
 if(/clip-title|clip-key|spoken-caption/.test(c.html??''))errors.push(label+': contiene titulos estaticos o un generador anterior; quitar esa pista antes de aplicar el estilo.');
 for(const key of ['html','css','script']){
 const suffix=key==='html'?e.html.slice('<div></div>'.length):e[key];
 if(suffix&&!(key==='script'?repairLegacyCaptionScript(c[key]):String(c[key]??'')).endsWith(suffix))errors.push(label+': '+key+' no coincide con el estilo animado generado desde las palabras reales; ejecutar add-captions.mjs sin reescribir su salida.');
 }
 }
 return errors;
}

