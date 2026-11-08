// Opt-in measurement of planted feet: SVG nodes carry data-dvj-foot and data-dvj-contact="planted".
// Missing instrumentation means NOT TESTED, never an automatic pass.
export function inspectContactSamples(samples,{slideThresholdPx=7,teleportThresholdPx=100}={}){
 if(!Array.isArray(samples))throw Error('Muestras de apoyo inválidas.');
 const findings=[],track=new Map();let plantedPairs=0;
 for(const sample of [...samples].sort((a,b)=>a.time-b.time)){
  for(const foot of sample.feet||[]){
   if(!foot.id||!Number.isFinite(foot.x)||!Number.isFinite(foot.y))continue;
   const key=(sample.scene||'')+':'+foot.id;
   const prior=track.get(key);
   if(prior&&sample.time>prior.time){
    const distance=Math.hypot(foot.x-prior.x,foot.y-prior.y);
    const planted=prior.contact==='planted'&&foot.contact==='planted';
    if(planted){plantedPairs++;if(distance>slideThresholdPx)findings.push({scene:sample.scene,foot:foot.id,time:sample.time,code:'FOOT_SLIDE',pixels:Number(distance.toFixed(2))});}
    else if(distance>teleportThresholdPx && sample.time-prior.time<.5)findings.push({scene:sample.scene,foot:foot.id,time:sample.time,code:'FOOT_JUMP',pixels:Number(distance.toFixed(2))});
   }
   track.set(key,{...foot,time:sample.time});
  }
 }
 return {measured:samples.some(s=>(s.feet||[]).length>0),plantedPairs,findings,
  limitation:'Mide anclas declaradas y pies plantados; no certifica biomecánica, anatomía ni contacto visual por sí solo.'};
}
