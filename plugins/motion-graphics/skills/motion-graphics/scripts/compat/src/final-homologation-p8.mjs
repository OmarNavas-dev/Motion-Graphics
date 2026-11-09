// P8: 33 full importable JSON fixtures. A fixture is NOT source parity certification.
import {SPECIALIZED_FLOW_IDS,generateSpecializedProject} from './specialized-workflows.mjs';
import {STYLE_PRESET_IDS} from './motion-capabilities.mjs';
import {createCharacterProject} from './character-motion.mjs';
import {createAudioSimulationProject} from './audio-simulation-p6.mjs';

const flows=new Set(SPECIALIZED_FLOW_IDS);
const sim=new Set(['sound-effects','sound-design','web-sims']);
const safe=(id)=>id.toLowerCase().replace(/[^a-z0-9-]/g,'-').slice(0,45);
export function buildP8CapabilityFixture(capability){
 const id=capability?.id;
 if(typeof id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9-]{1,69}$/.test(id))throw Error('P8: capacidad inválida.');
 if(flows.has(id))return {project:generateSpecializedProject({workflow:id,demo:true,compact:true,duration:3}),
  fixtureKind:'specialized-direct',referenceEquivalence:false};
 if(id==='21-style-gallery')return {project:{name:'P8 · 21 estilos',format:'horizontal',resolution:'720p',fps:24,
  scenes:STYLE_PRESET_IDS.map((style,i)=>({id:'p8-style-'+i,duration:2,title:'Ejemplo '+style,stylePreset:style,captionMode:'none'}))},
  fixtureKind:'gallery-direct',referenceEquivalence:false};
 if(id==='natural-character-acting')return {project:createCharacterProject({demo:true,action:'all'}),
  fixtureKind:'character-direct',referenceEquivalence:false};
 if(id==='motion-broll'||id==='transparent-ProRes-4444')return {project:{name:'P8 · B-roll alfa',format:'horizontal',resolution:'720p',fps:24,
  scenes:[{id:'p8-broll',duration:3,title:'Capas con canal alfa',captionMode:'none'}],
  wordTimings:[{text:'alfa',start:.2,end:.6}],
  broll:[{id:'overlay-alfa',sceneId:'p8-broll',duration:2,kind:'overlay',motion:'static',
   narration:{wordIndex:0,edge:'start',offset:0,phrase:'alfa'},objects:[
    {id:'objeto-alfa',type:'shape',shape:'rect',x:20,y:30,width:30,height:30,color:'#FF0000'}]}]},
  fixtureKind:'broll-direct',referenceEquivalence:false};
 if(sim.has(id))return {project:createAudioSimulationProject({kind:'all',seconds:3}),
  fixtureKind:'audio-simulation-direct',referenceEquivalence:false};
 const variant=STYLE_PRESET_IDS[id.length%STYLE_PRESET_IDS.length];
 return {project:{name:'P8 · '+id,format:'horizontal',resolution:'720p',fps:24,
  scenes:[{id:'p8-'+safe(id),duration:3,title:'Prueba de compatibilidad '+id,
   stylePreset:variant,captionMode:'none',approved:false}]},
  fixtureKind:'contract-proxy',referenceEquivalence:false};
}
