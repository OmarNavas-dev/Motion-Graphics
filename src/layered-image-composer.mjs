// Build an import-safe layered 2.5D scene from images already uploaded to Motion Studio.
// Image order is back-to-front. The editor owns asset ingestion and preview rendering.
const ASSET=/^user-assets\/[0-9a-f-]{36}\.(?:png|jpg|jpeg|webp)$/;

export function createLayeredImageComposition(assets,{duration=8}={}){
  if(!Array.isArray(assets)||assets.length<3||assets.length>12)
    throw Error('La composición 2.5D necesita entre 3 y 12 imágenes importadas.');
  if(assets.some(asset=>typeof asset!=='string'||!ASSET.test(asset))||new Set(assets).size!==assets.length)
    throw Error('Las capas requieren imágenes importadas únicas en user-assets/UUID.ext.');
  if(!Number.isFinite(duration)||duration<=0)
    throw Error('Duración de composición inválida.');
  const layers=assets.map((asset,index)=>{
    const depth=Number((.18+(.68*index)/(assets.length-1)).toFixed(3));
    return {id:'layer-'+String(index+1).padStart(2,'0'),type:'image',asset,
      x:50,y:50,width:100,height:100,depth,opacity:1,shadow:index>0};
  });
  return {
    source:'user-layered-parallax/v1',
    layers,
    camera:{from:{x:-4,y:0,zoom:1,rotate:0},keyframes:[
      {at:0,x:-4,y:0,zoom:1,rotate:0},
      {at:Number((duration/2).toFixed(3)),x:4,y:0,zoom:1,rotate:0},
      {at:duration,x:-4,y:0,zoom:1,rotate:0}
    ]}
  };
}
