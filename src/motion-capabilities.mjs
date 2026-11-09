// Persistent brand and reference style rules: explicit user colors override selected style palette.
export function normalizeBrandProfile(raw){
 if(raw===undefined||raw===null)return undefined;
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Ficha de identidad visual inválida.');
 const clean=(v,max)=>String(v??'').trim().slice(0,max);
 const colors={};
 for(const [key,value]of Object.entries(raw.colors||{})){
  if(!['background','ink','accent'].includes(key)||typeof value!=='string'||!/^#[0-9a-fA-F]{6}$/.test(value))throw Error('Color de identidad inválido: '+key);
  colors[key]=value.toUpperCase();
 }
 const rules=(input,label)=>{
  if(!Array.isArray(input)||input.length>12)throw Error('Demasiadas reglas en '+label);
  return input.map(v=>clean(v,240)).filter(Boolean);
 };
 return {name:clean(raw.name,100),colors,typography:clean(raw.typography,200),
  motionRules:rules(raw.motionRules??[],'motionRules'),avoid:rules(raw.avoid??[],'avoid'),
  narrativePromise:clean(raw.narrativePromise,300)};
}
export const SOUND_KINDS=Object.freeze(['whoosh','impact','click','pop','riser','chime','pad','wind']);
export const SIMULATION_KINDS=Object.freeze(['orbit','pendulum','spring','bounce']);
export function normalizeSimulation(raw,duration){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||!SIMULATION_KINDS.includes(raw.kind))throw Error('P6: simulación no compatible.');
 const result={kind:raw.kind};
 const rules={count:[1,32],seed:[0,4294967295],speed:[.1,8],amplitude:[0,1],damping:[0,5],gravity:[.1,30],phase:[-100,100],radius:[.02,.48],start:[0,duration]};
 for(const [key,value]of Object.entries(raw)){
  if(key==='kind')continue;
  if(!rules[key])throw Error('P6: parámetro de simulación desconocido: '+key);
  const [lo,hi]=rules[key];
  if(!Number.isFinite(value)||value<lo||value>hi||(key==='count'||key==='seed')&&!Number.isInteger(value))throw Error('P6: parámetro de simulación inválido: '+key);
  result[key]=value;
 }
 return result;
}
export function normalizeSoundDesign(raw,duration){
 if(!raw||raw.enabled!==true)return {enabled:false,cues:[]};
 if(!Array.isArray(raw.cues)||raw.cues.length>150)throw Error('El diseño sonoro admite hasta 150 eventos.');
 const cues=raw.cues.map((cue,i)=>{
  const at=cue?.at,span=cue?.duration,gain=cue?.gain??.2,pan=cue?.pan??0,fadeIn=cue?.fadeIn??0,fadeOut=cue?.fadeOut??0;
  if(!SOUND_KINDS.includes(cue?.type)||!Number.isFinite(at)||at<0||!Number.isFinite(span)||span<=0||span>10||
     at+span>duration+.001||!Number.isFinite(gain)||gain<0||gain>1||!Number.isFinite(pan)||Math.abs(pan)>1||
     !Number.isFinite(fadeIn)||!Number.isFinite(fadeOut)||fadeIn<0||fadeOut<0||fadeIn+fadeOut>span)throw Error('Evento sonoro inválido: '+(i+1));
  return {at,duration:span,type:cue.type,gain,...(cue.pan!==undefined?{pan}:{}),...(cue.fadeIn!==undefined?{fadeIn}:{}),...(cue.fadeOut!==undefined?{fadeOut}:{})};
 });
 const rawMix=raw.mix??{};
 if(!rawMix||typeof rawMix!=='object'||Array.isArray(rawMix)||Object.keys(rawMix).some(k=>!['voicePriority','sfxGain','limit'].includes(k))||
   rawMix.voicePriority!==undefined&&typeof rawMix.voicePriority!=='boolean'||
   rawMix.sfxGain!==undefined&&(!Number.isFinite(rawMix.sfxGain)||rawMix.sfxGain<0||rawMix.sfxGain>2)||
   rawMix.limit!==undefined&&(!Number.isFinite(rawMix.limit)||rawMix.limit<.2||rawMix.limit>1))throw Error('P6: configuración de mezcla inválida.');
 return {enabled:true,cues,...(raw.mix!==undefined?{mix:{voicePriority:rawMix.voicePriority??true,sfxGain:rawMix.sfxGain??.75,limit:rawMix.limit??.95}}:{})};
}
export const STYLE_PRESET_IDS=Object.freeze(["paper-world","ink-line","weather-widget","data-story","swiss-kinetic","particle-field","growing-city","explainer-diagram","time-travel","editor-ui","motion-app-ui","design-app-ui","audio-app-ui","swiss-grid","editorial-paper","midnight-grid","paper-cut","risograph","blueprint","graphite-ui","poster-pop"]);
import {CUSTOM_SCENE_LIMITS} from './scene-limits.mjs';

// Shared by the local service and the authoring plugin, not a quality certificate.
export const MOTION_STUDIO_CONTRACT=Object.freeze({
 version:1,
 customScene:{engine:'hyperframes-gsap',fields:['html','css','script'],limits:CUSTOM_SCENE_LIMITS,
  timeBase:'seconds',sceneClock:'T0 + local seconds; D is the scene duration',
  selectorToken:'__SCENE__',optionalMediaTokens:['__IMAGE__','__VIDEO__'],
  scriptBindings:['tl','S','T0','D','gsap']},
 fps:[24,30],
 formats:['vertical','horizontal'],
 captionModes:['embedded','global','none'],
 wordTimings:{timeBase:'global seconds',fields:['text','start','end','emphasis']},
 motionCheckpoints:{version:1,timeBase:'seconds relative to action.at',fields:['at','state','phase'],verification:['forward seek','backward seek']},
 directionCompiler:{version:2,shots:['at','duration','scale','x','y'],actionMotion:['from','to','ease'],safeCameraTarget:'CSS class',manualAnimationsPreserved:true},
 qualityReview:{postRenderContactSheet:true,audioLoudness:true,visualApprovalRequired:true},
 stylePresets:STYLE_PRESET_IDS,
 soundDesign:{version:2,optIn:true,types:SOUND_KINDS,timeBase:'global seconds',cueOptions:['pan','fadeIn','fadeOut'],mixOptions:['voicePriority','sfxGain','limit']},
 simulation:{version:1,kinds:SIMULATION_KINDS,timeBase:'scene seconds',deterministicSeek:true},
 externalP7:{version:1,providers:['removebg','openverse','pixabay','higgsfield'],
  segment:{provider:'removebg',alpha:'png',requiresConfirmation:true},
  higgsfield:{planOnly:true,dispatchable:false,requiresModelApiAndPriceConfirmation:true}},
 brandProfile:{version:1,fields:['name','colors','typography','motionRules','avoid','narrativePromise'],colors:['background','ink','accent']},
 looping:{seamCheckAfterRender:true},
 remotionCustomScene:false,
 approval:{technicalChecksAreVisualApproval:false,technicalChecksVerifyAudioAlignment:false},
});
