// Reusable 2D IK and planted-foot gait; independent of scene topic and render FPS.
import {smoothstep} from './continuous-motion.mjs';
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
const vec=(p,name)=>{if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))throw Error(name+' no es un punto válido');};
export function twoBoneIK(root,target,upper,lower,{bend=1}={}){
 vec(root,'root');vec(target,'target');
 if(!(upper>0&&lower>0)||![-1,1].includes(bend))throw Error('Longitudes o flexión inválidas');
 const dx=target.x-root.x,dy=target.y-root.y,r=Math.hypot(dx,dy);
 const min=Math.abs(upper-lower),max=upper+lower;
 const reach=cl(r,Math.max(min,1e-7),max-1e-7);
 const ux=r?dx/r:1,uy=r?dy/r:0;
 const along=(upper*upper-lower*lower+reach*reach)/(2*reach);
 const normal=Math.sqrt(Math.max(0,upper*upper-along*along));
 const elbow={x:root.x+ux*along-bend*uy*normal,y:root.y+uy*along+bend*ux*normal};
 const end={x:root.x+ux*reach,y:root.y+uy*reach};
 return {root:{...root},joint:elbow,end,reached:r<=max&&r>=min,error:Math.hypot(end.x-target.x,end.y-target.y)};
}

/** Global-world foot trajectory: each stance foot stays fixed until liftoff. */
export function gait2D({startX=0,groundY=100,stepLength=60,stepTime=.6,hipHeight=85,lift=20,startTime=0}={}){
 if(!(stepLength>0&&stepTime>0&&hipHeight>0&&lift>=0))throw Error('Parámetros de marcha inválidos');
 return t=>{
  const elapsed=Math.max(0,t-startTime),i=Math.floor(elapsed/stepTime),u=cl((elapsed-i*stepTime)/stepTime,0,1);
  // Swing foot takes one step from the previous support to the next.
  // Separate knees and hips ensure contact is never faked by moving a flat sprite.
  const swingSide=i%2===0?'left':'right';
  const foot0=startX+(i-2)*stepLength,foot1=startX+i*stepLength;
  const swingX=foot0+(foot1-foot0)*smoothstep(u);
  const swingY=groundY-4*lift*u*(1-u);
  const stanceX=startX+(i-1)*stepLength;
  const left=swingSide==='left'?{x:swingX,y:swingY}:{x:stanceX,y:groundY};
  const right=swingSide==='right'?{x:swingX,y:swingY}:{x:stanceX,y:groundY};
  const hip={x:(left.x+right.x)/2,y:groundY-hipHeight+3*Math.cos(4*Math.PI*u)};
  const legs={left:twoBoneIK(hip,left,hipHeight*.56,hipHeight*.58,{bend:-1}),right:twoBoneIK(hip,right,hipHeight*.56,hipHeight*.58,{bend:1})};
  return {time:t,swingSide,hip,feet:{left,right},legs,contacts:{left:swingSide!=='left',right:swingSide!=='right'}};
 };
}

/** A reachable hand target on a known prop. */
export function reachToObject({shoulder,target,upperArm,forearm,handOffset={x:0,y:0},bend=1}){
 vec(handOffset,'handOffset');
 const wrist={x:target.x-handOffset.x,y:target.y-handOffset.y};
 const chain=twoBoneIK(shoulder,wrist,upperArm,forearm,{bend});
 return {...chain,hand:{x:chain.end.x+handOffset.x,y:chain.end.y+handOffset.y},contactError:chain.error};
}

export function inspectGait(track,{start=0,end=2,fps=30,maxSlip=.25}={}){
 if(!(end>start&&fps>0))throw Error('Tiempo inválido');
 const issues=[];let prev=track(start);let maxContactSlip=0;
 const count=Math.ceil((end-start)*fps);
 for(let i=1;i<=count;i++){
   const p=track(Math.min(end,start+i/fps));
   for(const side of ['left','right']) if(prev.contacts[side]&&p.contacts[side]){
     const a=prev.feet[side],b=p.feet[side],slip=Math.hypot(a.x-b.x,a.y-b.y);
     maxContactSlip=Math.max(maxContactSlip,slip);
     if(slip>maxSlip)issues.push({time:p.time,side,slip,type:'contact-slip'});
   }
   for(const side of ['left','right']) if(p.legs[side].error>.5)issues.push({time:p.time,side,type:'unreachable',error:p.legs[side].error});
   prev=p;
 }
 return {maxContactSlip,issues};
}
