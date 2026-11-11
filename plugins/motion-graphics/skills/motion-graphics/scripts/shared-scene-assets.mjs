// Authoring-time helper. Embed the resulting SVG in each self-contained scene.
// Reuse the original model geometry across shots rather than redrawing identity.
import crypto from 'node:crypto';
const valid=s=>typeof s==='string'&&/^[a-z][a-z0-9-]*$/.test(s);
const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');

function scopeIds(svg,sceneId){
 const mapping=new Map([...svg.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>[m[1],sceneId+'-'+m[1]]));
 let out=svg;
 for(const [before,after] of mapping){
  if(!/^[A-Za-z][A-Za-z0-9_-]*$/.test(before))throw Error('ID SVG no seguro: '+before);
  out=out.replace(new RegExp('\\bid=(["\'])'+before+'\\1','g'),(_,quote)=>'id='+quote+after+quote);
  out=out.replaceAll('url(#'+before+')','url(#'+after+')');
  out=out.replaceAll('href="#'+before+'"','href="#'+after+'"');
  out=out.replaceAll("href='#"+before+"'","href='#"+after+"'");
 }
 return out;
}
export function createAssetRegistry(){
 const assets=new Map();
 return {
  register({assetId,appearanceToken,markup}){
   if(!valid(assetId)||!valid(appearanceToken)||!markup?.trim())throw Error('Asset requiere ID, apariencia y SVG válidos.');
   const modelToken=crypto.createHash('sha256').update(markup).digest('hex').slice(0,16);
   const prior=assets.get(assetId);
   if(prior&&(prior.modelToken!==modelToken||prior.appearanceToken!==appearanceToken))throw Error('La misma identidad no puede redefinirse con geometría o apariencia distinta: '+assetId);
   assets.set(assetId,{assetId,appearanceToken,markup,modelToken});
   return modelToken;
  },
  instantiate(assetId,{sceneId,className='',transform=''}={}){
   const a=assets.get(assetId);
   if(!a||!valid(sceneId)||className&&!/^[\w -]+$/.test(className))throw Error('Instancia inválida de '+assetId);
   const attrs=[`data-dvj-asset="${a.assetId}"`,`data-dvj-appearance="${a.appearanceToken}"`,`data-dvj-model="${a.modelToken}"`];
   if(className)attrs.push(`class="${escape(className)}"`);
   if(transform)attrs.push(`transform="${escape(transform)}"`);
   return `<g ${attrs.join(' ')}>${scopeIds(a.markup,sceneId)}</g>`;
  },
  inventory(){return [...assets.values()].map(({markup,...info})=>info);}
 };
}
