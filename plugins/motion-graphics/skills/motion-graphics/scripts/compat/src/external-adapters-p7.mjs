// P7 shared authoring contract. No credentials, payments, or remote calls here.
export const EXTERNAL_PROVIDERS=Object.freeze(['removebg','openverse','pixabay','higgsfield']);
const check=(ok,message)=>{if(!ok)throw Error('P7: '+message);};
const assetPattern=/^user-assets\/[0-9a-f-]{36}\.(?:png|jpg|jpeg|webp|mp4)$/i;
const clean=(value,max)=>String(value??'').trim().slice(0,max);
export function planExternalRequest(raw){
 check(raw&&typeof raw==='object'&&!Array.isArray(raw),'solicitud inválida.');
 const provider=raw.provider,operation=raw.operation;
 check(EXTERNAL_PROVIDERS.includes(provider),'proveedor no admitido.');
 if(provider==='removebg'){
  check(operation==='segment','remove.bg solo admite segment en este adaptador.');
  check(assetPattern.test(raw.asset||'')&&!String(raw.asset).endsWith('.mp4'),'segmentación requiere PNG/JPG/WebP local.');
  const size=raw.size??'preview';check(['preview','full'].includes(size),'tamaño de segmentación inválido.');
  return {version:1,provider,operation,asset:raw.asset,size,output:'png-alpha',
   status:'ready-with-key-and-explicit-confirmation',paid:true,requires:['REMOVE_BG_API_KEY','explicit-user-confirmation']};
 }
 if(provider==='openverse'||provider==='pixabay'){
  check(operation==='search','operación de medios no admitida.');
  const query=clean(raw.query,100);
  check(query.length>=2,'consulta de búsqueda demasiado corta.');
  return {version:1,provider,operation,query,status:'ready',paid:false,
   requires:provider==='pixabay'?['PIXABAY_API_KEY']:[]};
 }
 check(provider==='higgsfield'&&operation==='generate-video','operación Higgsfield no admitida.');
 const prompt=clean(raw.prompt,1800),model=clean(raw.model,120);
 check(prompt.length>=10,'se necesita una descripción de video.');
 check(!model||new RegExp('^[a-zA-Z0-9_.:/-]{2,120}$').test(model),'identificador de modelo inválido.');
 const duration=raw.duration??5,ratio=raw.aspectRatio??'9:16';
 check(Number.isFinite(duration)&&duration>=1&&duration<=30,'duración inválida.');
 check(['9:16','16:9','1:1'].includes(ratio),'aspect ratio inválido.');
 check(!raw.asset||assetPattern.test(raw.asset),'referencia de medio inválida.');
 return {version:1,provider,operation,model: model||null,prompt,duration,aspectRatio:ratio,
  ...(raw.asset?{asset:raw.asset}:{}),status:'requires-model-specific-api-mapping',paid:true,
  requires:['HIGGSFIELD_API_KEY','model-specific-endpoint','price-confirmation','explicit-user-confirmation'],
  dispatchable:false};
}
