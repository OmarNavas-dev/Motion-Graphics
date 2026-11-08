// Compile only explicit, safe camera/action keyframes into the existing GSAP scene clock.
// Unsupported plans are left untouched and reported instead of guessing movements.
const finite = value => typeof value === 'number' && Number.isFinite(value);
const fmt = n => Number(n.toFixed(4));
const CAMERA_CLASS = ['camera','cam','viewport','world','stage','organ','scene-world'];
const classesIn = html => new Set([...String(html||'').matchAll(/\bclass\s*=\s*["']([^"']+)["']/g)].flatMap(x=>x[1].split(/\s+/)));
const escapeClass = name => name.replace(/[.*+?^\x24{}()|[\]\\]/g,'\\$&');
const namedClass = (html, preferred) => {
  const classes=classesIn(html);
  if (preferred && /^\.[a-zA-Z][\w-]*$/.test(preferred) && classes.has(preferred.slice(1))) return preferred;
  const found=CAMERA_CLASS.find(c=>classes.has(c));
  return found?'.'+found:null;
};
const clamp = (n,a,b) => Math.min(b,Math.max(a,n));
const scaleFor = value => finite(value)?clamp(value,0.5,2.5):
 ({extreme:1.5,detail:1.45,close:1.32,medium:1,wide:.86,establishing:.8,macro:1.55,primer:1.32,general:.86,medio:1,detalle:1.45}[String(value||'').toLowerCase()]??null);
const numbers = input => input && typeof input==='object' && Object.entries(input).every(([k,v])=>['scale','x','y','rotation','opacity'].includes(k) && finite(v));
export function compileSceneDirection(scene) {
 const warnings=[],parts=[]; let cameraGenerated=false,actionsGenerated=0;
 const direction=scene?.direction??{},html=scene?.customScene?.html??'',existing=scene?.customScene?.script??'';
 const shots=Array.isArray(direction.shots)?direction.shots:[];
 const cameraTarget=namedClass(html,direction.cameraTarget);
 if(shots.length>1 && !cameraTarget) warnings.push('Cámara: falta grupo .camera/.world/.stage o direction.cameraTarget válido.');
 if(shots.length>1&&cameraTarget) {
  const manuallyAnimated=new RegExp('(?:\\btl\\.|\\bgsap\\.).{0,60}(?:\\b'+escapeClass(cameraTarget.slice(1))+'\\b)').test(existing);
  if(manuallyAnimated) warnings.push('Cámara personalizada existente: se conserva para evitar animaciones duplicadas.');
  else {
   const keyframes=shots.map((shot,i)=>({
     at: Number(shot.at), duration:Number(shot.duration),
     scale:scaleFor(shot.scale), x:finite(shot.x)?shot.x:0, y:finite(shot.y)?shot.y:0,
     i
   }));
   if(keyframes.some(k=>!finite(k.at)||k.at<0||!finite(k.duration)||k.duration<=0||k.scale===null||k.at+k.duration>(scene.duration??Infinity)+.01))
    warnings.push('Plan de cámara incompleto o fuera de duración; no se generó una animación aproximada.');
   else {
    const selector='S+'+JSON.stringify(' '+cameraTarget);
    for(const [index,k] of keyframes.entries()){
     const previous=keyframes[index-1];
     if(index===0) parts.push('tl.set('+selector+',{scale:'+fmt(k.scale)+',x:'+fmt(k.x)+',y:'+fmt(k.y)+',transformOrigin:"50% 50%"},T0+'+fmt(k.at)+');');
     else {
      const start=Math.max(k.at,previous.at);
      const dur=Math.min(k.duration,Math.max(.01,(scene.duration??Infinity)-start));
      parts.push('tl.to('+selector+',{scale:'+fmt(k.scale)+',x:'+fmt(k.x)+',y:'+fmt(k.y)+',duration:'+fmt(dur)+',ease:"power2.inOut",transformOrigin:"50% 50%"},T0+'+fmt(start)+');');
     }
    }
    cameraGenerated=true;
   }
  }
 }
 for(const action of direction.actions??[]){
  const motion=action?.motion;
  if(!motion)continue;
  const selector=action.selector;
  if(!/^\.[a-zA-Z][\w-]*$/.test(selector||'')||!classesIn(html).has(selector.slice(1))){
   warnings.push('Acción '+(action.id??'?')+': selector ausente o no compatible.');continue;
  }
  if((existing.includes(' .'+selector.slice(1))||existing.includes(''+selector))&&/(?:tl|gsap)\./.test(existing)){
   warnings.push('Acción '+(action.id??'?')+': ya existe movimiento manual; se evita duplicarlo.');continue;
  }
  const at=Number(action.at),duration=Number(action.duration),from=motion.from,to=motion.to;
  if(!finite(at)||at<0||!finite(duration)||duration<=0||at+duration>(scene.duration??Infinity)+.01||!numbers(from)||!numbers(to)||!Object.keys(to).length){
   warnings.push('Acción '+(action.id??'?')+': faltan valores numéricos o tiempos válidos.');continue;
  }
  const q='S+'+JSON.stringify(' '+selector),ease=['none','power1.inOut','power2.inOut','power2.out','sine.inOut'].includes(motion.ease)?motion.ease:'power2.inOut';
  const encoded=obj=>JSON.stringify(obj).replace(/}$/,',"duration":'+fmt(duration)+',"ease":'+JSON.stringify(ease)+'}');
  parts.push('tl.fromTo('+q+','+JSON.stringify(from)+','+encoded(to)+',T0+'+fmt(at)+');');
  actionsGenerated++;
 }
 return {script:parts.join('\n'),cameraGenerated,actionsGenerated,warnings};
}
