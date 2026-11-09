// P8 release gate: a re-rendered candidate must be measured against the SAME
// source reference and not regress. Perceptual and human approvals remain separate.
export function assessReferenceRevision(before,after,{minimumGain=.03}={}){
 if(!Number.isFinite(minimumGain)||minimumGain<0||minimumGain>.5)throw Error('Ganancia mínima inválida.');
 const b=before?.report,a=after?.report;
 if(b?.schema!=='motion-studio.reference-comparison/1'||a?.schema!==b.schema||
  !b.referenceHash||b.referenceHash!==a.referenceHash||b.renderHash===a.renderHash)
  throw Error('Las revisiones deben usar una misma referencia real y dos renders distintos.');
 const bs=before.samples,as=after.samples;
 if(!Array.isArray(bs)||!Array.isArray(as)||!bs.length||bs.length!==as.length)
  throw Error('La revisión necesita pares de fotogramas equivalentes.');
 const distance=(sample)=>{
  const d=sample?.comparison?.deltas;
  if(!d||!['luminance','saturation','leftWeight','topWeight'].every(k=>Number.isFinite(d[k])))
   throw Error('Métricas de referencia incompletas.');
  return Math.abs(d.luminance)+Math.abs(d.saturation)+Math.abs(d.leftWeight)+Math.abs(d.topWeight);
 };
 let beforeDistance=0,afterDistance=0,beforeAlerts=0,afterAlerts=0;
 for(let i=0;i<bs.length;i++){
  if(bs[i].sceneId!==as[i].sceneId||Math.abs(bs[i].seconds-as[i].seconds)>.05||
    Math.abs(bs[i].referenceSeconds-as[i].referenceSeconds)>.05)
    throw Error('Muestreo temporal de referencia no coincide.');
  beforeDistance+=distance(bs[i]);afterDistance+=distance(as[i]);
  beforeAlerts+=bs[i].comparison.issues.length;afterAlerts+=as[i].comparison.issues.length;
 }
 const relativeGain=(beforeDistance-afterDistance)/(beforeDistance||1);
 const passed=afterAlerts<=beforeAlerts&&afterDistance<beforeDistance&&relativeGain>=minimumGain;
 return {passed,beforeDistance:+beforeDistance.toFixed(4),afterDistance:+afterDistance.toFixed(4),
  relativeGain:+relativeGain.toFixed(4),beforeAlerts,afterAlerts,
  approval:'PENDING_HUMAN_REVIEW',reason:passed?'Las métricas mejoraron; falta evaluación artística.':'La evidencia no demuestra mejora de fidelidad visual.'};
}
