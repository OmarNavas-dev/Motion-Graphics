// P6 declarative 2D simulations and synchronized sound cue planning.
import {SIMULATION_KINDS,normalizeSimulation,normalizeSoundDesign} from './motion-capabilities.mjs';
export {SIMULATION_KINDS,normalizeSimulation};
const colors=['#5CE0D8','#F5BA68','#A1A8FF','#F57A9A'];
const defaults={
 orbit:{count:5,speed:.42,radius:.32,seed:71},
 pendulum:{count:1,speed:.55,amplitude:.95,damping:.12,seed:73},
 spring:{count:3,speed:1.3,amplitude:.9,damping:.23,seed:79},
 bounce:{count:3,speed:1,gravity:9.8,seed:83},
};
const sounds={orbit:'pad',pendulum:'chime',spring:'whoosh',bounce:'impact'};
export function createAudioSimulationProject({kind='all',format='horizontal',seconds=4,mix={voicePriority:true,sfxGain:.75,limit:.95},overrides={}}={}){
 if(kind!=='all'&&!SIMULATION_KINDS.includes(kind))throw Error('P6: simulación no reconocida.');
 if(!['horizontal','vertical'].includes(format)||!Number.isFinite(seconds)||seconds<2||seconds>30)throw Error('P6: formato o duración no admitida.');
 const kinds=kind==='all'?SIMULATION_KINDS:[kind];
 const scenes=kinds.map((mode,i)=>{
  const config=normalizeSimulation({kind:mode,...defaults[mode],...overrides},seconds);
  return {id:'p6-'+mode,title:'P6 '+mode,duration:seconds,layout:'hero',captionMode:'none',approved:false,
   authored:{source:'simulation-p6/'+mode,background:{color:'#101C2E'},camera:{from:{zoom:1},to:{zoom:1}},
    layers:[{id:'p6-sim',type:'simulation',x:50,y:52,width:75,height:45,fill:colors[i%colors.length],stroke:'#F1FAFF',simulation:config},
      {id:'p6-heading',type:'text',x:50,y:12,width:80,height:8,text:mode.toUpperCase(),size:3.2,color:'#E7F5FF',font:'sansbold',fixed:true}]} };
 });
 const cues=kinds.flatMap((mode,i)=>Array.from({length:mode==='bounce'?3:2},(_,j)=>({
  type:sounds[mode],at:i*seconds+.3+j*(seconds-.6)/(mode==='bounce'?3:2),
  duration:mode==='bounce'?.22:.7,gain:.2,pan:Math.max(-1,Math.min(1,(j-(mode==='bounce'?1:.5))*.55)),fadeIn:.025,fadeOut:.08
 })));
 const soundDesign=normalizeSoundDesign({enabled:true,cues,mix},kinds.length*seconds);
 return {name:'P6 · Audio y simulaciones',format,resolution:'720p',fps:24,palette:'aurora',style:'modern',
  characterMode:'new',showText:true,scenes,soundDesign};
}
