// P5 shared character authoring and physical-contact diagnostics.
// Local 2D rig units: 240×320. Expressions, IK targets and support states are explicit.
export const CHARACTER_ACTIONS=Object.freeze(['greet','walk','reach','crouch','react']);
const fallback={skin:'#D6A17E',hair:'#283544',shirt:'#4B8BBE',pants:'#283957',accent:'#F5CC71'};
const check=(condition,message)=>{if(!condition)throw Error('P5: '+message);};
const finite=(value)=>typeof value==='number'&&Number.isFinite(value);
const validColor=(v)=>typeof v==='string'&&/^#[0-9A-Fa-f]{6}$/.test(v);
const point=(p)=>Array.isArray(p)&&p.length===2&&p.every(finite);
const sample=(a,b,t)=>a+(b-a)*t;
const smooth=(u)=>{const t=Math.max(0,Math.min(1,u));return t*t*(3-2*t);};
const defaults=()=>({at:0,rootX:0,rootY:0,headTilt:0,squash:0,expression:'neutral',
 leftHand:[83,194],rightHand:[157,194],leftFoot:[102,280],rightFoot:[138,280],
 contact:{left:'planted',right:'planted'},grip:false});
export function solveLimb(start,end,upper,lower,bend=1){
 check(point(start)&&point(end)&&finite(upper)&&finite(lower)&&upper>0&&lower>0&&[1,-1].includes(bend),'geometría articular inválida');
 const dx=end[0]-start[0],dy=end[1]-start[1],length=Math.hypot(dx,dy);
 check(length>Math.abs(upper-lower)+.01&&length<upper+lower-.01,'objetivo fuera del alcance de la articulación');
 const along=(upper*upper-lower*lower+length*length)/(2*length);
 const across=Math.sqrt(Math.max(0,upper*upper-along*along))*bend;
 return [start[0]+along*dx/length-across*dy/length,
   start[1]+along*dy/length+across*dx/length];
}
export function validateCharacterRig(rig,duration){
 check(rig&&typeof rig==='object'&&/^[A-Za-z][\w-]{0,39}$/.test(rig.id||''),'identificador de personaje inválido');
 check(Number.isFinite(duration)&&duration>=.5&&duration<=60,'duración inválida');
 for(const [key,value] of Object.entries(rig.colors||{}))check(Object.hasOwn(fallback,key)&&validColor(value),'color de personaje inválido: '+key);
 check(Array.isArray(rig.poses)&&rig.poses.length>=2&&rig.poses.length<=100,'se requieren de 2 a 100 poses');
 let previous=-1;const expressions=new Set(['neutral','happy','sad','surprised','angry','blink']);
 for(const pose of rig.poses){
  check(pose&&finite(pose.at)&&pose.at>previous&&pose.at>=0&&pose.at<=duration,'tiempos de pose inválidos');
  check(['rootX','rootY','headTilt','squash'].every(k=>finite(pose[k])),'desplazamiento o deformación inválidos');
  check(Math.abs(pose.rootX)<=90&&Math.abs(pose.rootY)<=70&&Math.abs(pose.headTilt)<=40&&Math.abs(pose.squash)<=.16,
    'pose fuera de límites anatómicos del rig 2D');
  check(expressions.has(pose.expression),'expresión no admitida');
  check(point(pose.leftHand)&&point(pose.rightHand)&&point(pose.leftFoot)&&point(pose.rightFoot),'anclas incompletas');
  check(pose.contact&&['left','right'].every(k=>['planted','air'].includes(pose.contact[k])),'contacto de pies inválido');
  check(typeof pose.grip==='boolean','agarre no especificado');
  for(const side of ['left','right']){
   const hip=[side==='left'?104:136,182+pose.squash*35];
   const shoulder=[side==='left'?88:152,116+pose.squash*16];
   solveLimb(hip,pose[side+'Foot'],59,61,side==='left'?1:-1);
   solveLimb(shoulder,pose[side+'Hand'],46,48,side==='left'?1:-1);
  }
  previous=pose.at;
 }
 check(rig.poses[0].at===0,'la primera pose debe empezar en cero');
 return globalThis.structuredClone(rig);
}
export function characterPoseAt(poses,time){
 let a=poses[0],b=a;
 for(let i=1;i<poses.length;i++)if(time<poses[i].at){b=poses[i];break;}else a=poses[i];
 const t=a===b?0:smooth((time-a.at)/(b.at-a.at));
 const p={...a,contact:{...a.contact},grip:a.grip,expression:a.expression};
 for(const key of ['rootX','rootY','headTilt','squash'])p[key]=sample(a[key],b[key],t);
 for(const key of ['leftHand','rightHand','leftFoot','rightFoot'])
   p[key]=a[key].map((v,i)=>sample(v,b[key][i],t));
 return p;
}
export function inspectCharacterMotion(rig,{duration,width=1280,fps=24,slideThresholdPx=7,
  accelerationThresholdPx=100}={}){
 validateCharacterRig(rig,duration);
 const scale=(width*.34)/240,findings=[],frames=Math.max(2,Math.round(duration*fps));
 const last=new Map();let plantedPairs=0,airbornePairs=0,maxStretch=0;
 for(let i=0;i<frames;i++){
  const time=i/fps,p=characterPoseAt(rig.poses,time);
  for(const side of ['left','right']){
   const foot=p[side+'Foot'],current={x:(foot[0]+p.rootX)*scale,y:(foot[1]+p.rootY)*scale,contact:p.contact[side]};
   const prior=last.get(side),distance=prior?Math.hypot(current.x-prior.x,current.y-prior.y):0;
   if(prior&&prior.contact==='planted'&&current.contact==='planted'){
    plantedPairs++;
    if(distance>slideThresholdPx)findings.push({code:'FOOT_SLIDE',foot:side,time:Number(time.toFixed(3)),pixels:Number(distance.toFixed(2))});
   }else if(prior&&current.contact==='air')airbornePairs++;
   if(prior&&distance>accelerationThresholdPx)findings.push({code:'FOOT_TELEPORT',foot:side,time:Number(time.toFixed(3)),pixels:Number(distance.toFixed(2))});
   last.set(side,current);
   const hip=[side==='left'?104:136,182+p.squash*35];
   maxStretch=Math.max(maxStretch,Math.hypot(foot[0]-hip[0],foot[1]-hip[1])/(59+61));
  }
 }
 return {measured:plantedPairs>0,frames,plantedPairs,airbornePairs,maxStretch:Number(maxStretch.toFixed(4)),
   findings,passed:plantedPairs>0&&findings.length===0,
   limitation:'Rig 2D con cinemática inversa y anclas declaradas; no certifica anatomía real ni contacto con imágenes externas.'};
}
const base=defaults();
const pose=(at,changes={})=>({...globalThis.structuredClone(base),at,...changes});
const foot=(rootX,left,right)=>({rootX,leftFoot:[left-rootX,280],rightFoot:[right-rootX,280]});
const sequences={
 greet:[pose(0),pose(.55,{expression:'happy',rightHand:[183,97],headTilt:-8}),
  pose(1.1,{expression:'happy',rightHand:[197,78],headTilt:6}),
  pose(1.7,{expression:'happy',rightHand:[183,97],headTilt:-4}),pose(2.6,{expression:'neutral'})],
 walk:[pose(0,{contact:{left:'planted',right:'air'}}),
  pose(.7,{...foot(12,102,157),rightFoot:[145,259],leftHand:[76,182],rightHand:[167,173],
    contact:{left:'planted',right:'air'},headTilt:3}),
  pose(1.3,{...foot(24,102,164),leftHand:[90,177],rightHand:[151,192],
    contact:{left:'air',right:'planted'},headTilt:-3}),
  pose(2,{...foot(40,133,164),leftFoot:[93,259],leftHand:[75,186],rightHand:[166,178],
    contact:{left:'air',right:'planted'},headTilt:3}),
  pose(2.7,{...foot(56,156,164),contact:{left:'planted',right:'planted'},headTilt:0}),
  pose(3.5,{...foot(56,156,164),contact:{left:'planted',right:'planted'}})],
 reach:[pose(0),pose(.65,{rightHand:[195,152],expression:'surprised'}),
  pose(1.2,{rightHand:[197,166],grip:true,expression:'happy'}),
  pose(2.0,{rightHand:[180,112],grip:true,expression:'happy'}),
  pose(2.8,{rightHand:[178,134],grip:true,expression:'happy'})],
 crouch:[pose(0),pose(.7,{squash:.14,rootY:13,leftFoot:[102,267],rightFoot:[138,267],
    leftHand:[71,201],rightHand:[164,201],headTilt:12}),
  pose(1.3,{squash:.14,rootY:13,leftFoot:[102,267],rightFoot:[138,267],
    leftHand:[71,201],rightHand:[164,201],headTilt:10}),
  pose(2.1,{squash:0,rootY:0,leftHand:[83,194],rightHand:[157,194]}),pose(2.8)],
 react:[pose(0),pose(.45,{expression:'surprised',headTilt:-12,leftHand:[68,137],rightHand:[176,137]}),
  pose(.8,{expression:'blink',headTilt:5,leftHand:[70,141],rightHand:[172,141]}),
  pose(1.25,{expression:'sad',headTilt:14}),pose(1.75,{expression:'angry',headTilt:-9}),
  pose(2.2,{expression:'happy',headTilt:0}),pose(2.8,{expression:'neutral'})],
};
export function createCharacterAction(action,{id='actor',duration,colors}={}){
 check(CHARACTER_ACTIONS.includes(action),'acción desconocida: '+action);
 const poses=globalThis.structuredClone(sequences[action]);const baseDuration=poses.at(-1).at;
 const seconds=duration===undefined?baseDuration:duration;
 check(finite(seconds)&&seconds>=1&&seconds<=60,'duración de acción inválida');
 for(const p of poses)p.at=Number((p.at*seconds/baseDuration).toFixed(4));
 poses.at(-1).at=seconds;
 return validateCharacterRig({id,colors:{...fallback,...colors},action,poses},seconds);
}
export function createCharacterProject({action='all',demo=true,format='horizontal',colors,rig}={}){
 check(action==='all'||action==='custom'||CHARACTER_ACTIONS.includes(action),'acción desconocida');
 if(action==='custom')check(rig&&Array.isArray(rig.poses)&&rig.poses.length>=2,'la acción custom necesita poses declaradas');
 check(['horizontal','vertical'].includes(format),'formato inválido');
 const actions=action==='all'?CHARACTER_ACTIONS:[action];
 const scenes=actions.map((key,i)=>{
  const actor=key==='custom'?validateCharacterRig({id:rig.id||'protagonist',action:'custom',
      colors:{...fallback,...colors,...rig.colors},poses:rig.poses},rig.poses.at(-1).at):
    createCharacterAction(key,{id:'protagonist',colors});
  const duration=actor.poses.at(-1).at;
  const horizontal=format==='horizontal';
  return {id:'p5-'+key+'-'+(i+1),title:key.toUpperCase(),duration,layout:'hero',captionMode:'none',approved:false,
   authored:{source:'character-p5/'+key,background:{color:'#101C2E'},camera:{from:{zoom:1},to:{zoom:1}},
    characterRules:{version:1,action:key,rig:'ik-2d',measured:true,mode:demo?'illustrative':'production'},
    layers:[{id:'p5-floor',type:'shape',x:50,y:83,width:90,height:.5,fill:'#50718F',fixed:true},
      {id:'p5-actor',type:'character',x:horizontal?46:50,y:horizontal?53:63,width:horizontal?30:60,
       height:horizontal?40:80,actor,enter:{preset:'none',at:0}},
      {id:'p5-title',type:'text',x:horizontal?75:50,y:horizontal?22:15,width:horizontal?38:90,height:5,
       text:demo?'DEMOSTRACIÓN · '+key.toUpperCase():key.toUpperCase(),
       size:2.8,color:'#E7F5FF',font:'sansbold',fixed:true}]}};
 });
 return {name:'P5 · Personajes y acciones articuladas',format,resolution:'720p',fps:24,
  palette:'aurora',style:'modern',characterMode:'new',showText:true,scenes};
}
