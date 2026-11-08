export function reviewTimes(scene,{fps=30,denseFps=0,maxSamples=1500}={}){
 const duration=scene.duration;if(!Number.isFinite(duration)||duration<=0||![fps,denseFps].every(Number.isFinite)||fps<=0||denseFps<0)throw Error('Muestreo invalido.');
 const ts=new Set([0,duration*.1,duration*.5,duration*.9,Math.max(0,duration-1/fps)]);
 const add=t=>ts.add(Math.max(0,Math.min(duration-.000001,t)));
 for(const a of scene.direction?.actions??[]){for(const t of [a.at,a.at+a.duration/2,a.at+a.duration]){add(t-1/fps);add(t);add(t+1/fps);}for(const p of a.checkpoints??[])add(a.at+p.at);}
 if(denseFps){if(duration*denseFps>maxSamples)throw Error('Muestreo denso supera el presupuesto.');for(let i=0;i<Math.ceil(duration*denseFps);i++)add(i/denseFps);}
 const out=[...ts].map(t=>+t.toFixed(6)).sort((a,b)=>a-b);if(out.length>maxSamples)throw Error('Demasiadas muestras.');return [...new Set(out)];
}
export function runtimeFindings(report){
 const errors=[],warnings=[];
 for(const warning of report?.warnings??[])warnings.push(typeof warning==='string'?warning:JSON.stringify(warning));
 for(const row of report?.motionAudit??[]){
  if(Number(row.overflow)>.001)errors.push(`${row.scene}: animaciones exceden el clip en ${Number(row.overflow).toFixed(3)} s; corregir la coreografia.`);
  if(row.fixedPlacementAnimated?.length)errors.push(`${row.scene}: colocacion fija animada.`);
 }
 for(const sample of report?.samples??[])if(sample.deterministic===false||sample.backwardPassed===false)errors.push(`${sample.scene}: estado no estable al retroceder.`);
 return {errors,warnings};
}
