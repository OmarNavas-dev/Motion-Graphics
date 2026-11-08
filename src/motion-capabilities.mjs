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
export function normalizeSoundDesign(raw,duration){
 if(!raw||raw.enabled!==true)return {enabled:false,cues:[]};
 if(!Array.isArray(raw.cues)||raw.cues.length>150)throw Error('El diseño sonoro admite hasta 150 eventos.');
 const cues=raw.cues.map((cue,i)=>{
  const at=cue?.at,span=cue?.duration,gain=cue?.gain??.2;
  if(!SOUND_KINDS.includes(cue?.type)||!Number.isFinite(at)||at<0||!Number.isFinite(span)||span<=0||span>10||
     at+span>duration+.001||!Number.isFinite(gain)||gain<0||gain>1)throw Error('Evento sonoro inválido: '+(i+1));
  return {at,duration:span,type:cue.type,gain};
 });
 return {enabled:true,cues};
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
 soundDesign:{version:1,optIn:true,types:SOUND_KINDS,timeBase:'global seconds'},
 brandProfile:{version:1,fields:['name','colors','typography','motionRules','avoid','narrativePromise'],colors:['background','ink','accent']},
 looping:{seamCheckAfterRender:true},
 remotionCustomScene:false,
 approval:{technicalChecksAreVisualApproval:false,technicalChecksVerifyAudioAlignment:false},
});
