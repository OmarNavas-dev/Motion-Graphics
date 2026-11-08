// Word references live in authoring data. Only resolved numeric times go into
// Motion Studio's existing schema; original word timings are never stretched.
const clean=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function createTimingAnchors(timing,{sceneStart=0,sceneDuration=Infinity}={}){
 const words=Array.isArray(timing)?timing:timing?.words;
 if(!Array.isArray(words)||!words.length||!Number.isFinite(sceneStart)||sceneStart<0||!(sceneDuration>0))throw Error('Palabras y ventana temporal requeridas.');
 if(!Array.isArray(timing)&&timing.timeBase&&timing.timeBase!=='global')throw Error('Se requieren palabras globales.');
 let prev=-Infinity;
 words.forEach(w=>{if(!w.text||![w.start,w.end].every(Number.isFinite)||w.start<0||w.end<=w.start||w.start<prev)throw Error('Palabra temporal invalida.');prev=w.start;});
 const find=ref=>{
  if(Number.isInteger(ref?.index)){if(!words[ref.index])throw Error('Indice de palabra fuera de rango.');return [ref.index,ref.index];}
  const phrase=String(ref?.phrase??'').split(/\s+/).map(clean).filter(Boolean);if(!phrase.length)throw Error('Indicar indice o frase.');
  const hits=[];
  words.forEach((w,i)=>{if(phrase.every((s,j)=>words[i+j]&&clean(words[i+j].text)===s))hits.push([i,i+phrase.length-1]);});
  if(ref.occurrence===undefined&&hits.length>1)throw Error('Frase ambigua: indicar occurrence desde 1.');
  const occurrence=ref.occurrence??1;
  if(!Number.isInteger(occurrence)||occurrence<1||!hits[occurrence-1])throw Error('Frase u ocurrencia no encontrada.');
  return hits[occurrence-1];
 };
 const at=ref=>{
  const [a,b]=find(ref),edge=ref.edge??'start';if(!['start','end','center'].includes(edge))throw Error('Borde temporal invalido.');
  const global=edge==='start'?words[a].start:edge==='end'?words[b].end:(words[a].start+words[b].end)/2;
  const offset=ref.offset??0;if(!Number.isFinite(offset))throw Error('Offset invalido.');
  const local=global+offset-sceneStart;
  if(local<0||local>sceneDuration)throw Error('Anclaje fuera de la escena; cambiar montaje o referencia.');
  return local;
 };
 return {at,span:(from,to)=>{const a=at(from),b=at(to);if(b<=a)throw Error('Intervalo de accion no positivo.');return {at:a,duration:b-a};},words:()=>structuredClone(words)};
}
