import {procedural,claimVisual} from './procedural-kit.mjs';

// A configurable 2D rig with two-bone limbs and stable SVG nodes. This is a
// drawing family, not an automatic likeness solver for every reference.
export function puppetPose(config,poses,time){
 const defaults={hip:[0,0],rotation:0,bodyAngle:0,headTilt:0,leftHand:[-73,-42],rightHand:[73,-42],leftFoot:[-22,167],rightFoot:[22,167],blink:0,gaze:0,mouth:0};
 let i=0;while(i<poses.length-1&&poses[i+1].at<=time)i++;
 let a={...defaults};for(let j=0;j<=i;j++)a={...a,...poses[j]};const b={...a,...poses[Math.min(i+1,poses.length-1)]};
 const u=a.at===b.at?0:Math.max(0,Math.min(1,(time-a.at)/(b.at-a.at))),out={};
 // Hermite con tangentes entre poses: velocidad continua sin frenazo obligatorio
 // en cada fotograma clave. 'smooth' conserva la interpolación histórica;
 // 'linear' es útil cuando la velocidad debe ser exactamente constante.
 const mode=config.interpolation??'continuous';
 const prev=poses[Math.max(0,i-1)],next=poses[Math.min(poses.length-1,i+2)];
 const effective=(idx,k)=>{let val=defaults[k];for(let j=0;j<=idx;j++)if(k in poses[j])val=poses[j][k];return val;};
 const interp=(k,component,start,end)=>{
  if(mode==='linear')return start+(end-start)*u;
  if(mode==='smooth')return start+(end-start)*u*u*(3-2*u);
  const t0=a.at,t1=b.at,h=t1-t0;if(h<=0)return start;
  const before=effective(Math.max(0,i-1),k),after=effective(Math.min(poses.length-1,i+2),k);
  const pick=(v)=>Array.isArray(v)?v[component]:v;
  const m0=i===0?(end-start)/h:(end-pick(before))/(t1-prev.at);
  const m1=i>=poses.length-2?(end-start)/h:(pick(after)-start)/(next.at-t0);
  return (2*u*u*u-3*u*u+1)*start+(u*u*u-2*u*u+u)*h*m0+(-2*u*u*u+3*u*u)*end+(u*u*u-u*u)*h*m1;
 };
 if(!['linear','smooth','continuous'].includes(mode))throw Error('Interpolación desconocida: '+mode);
 for(const k of Object.keys(defaults))out[k]=Array.isArray(a[k])?a[k].map((x,j)=>interp(k,j,x,b[k][j])):interp(k,0,a[k],b[k]);
 const angle=out.bodyAngle*Math.PI/180;
 const rot=([x,y])=>[x*Math.cos(angle)-y*Math.sin(angle),x*Math.sin(angle)+y*Math.cos(angle)];
 const solve=(a,b,l1,l2,bend)=>{
  const dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy);
  if(!Number.isFinite(d)||d<Math.abs(l1-l2)+.001||d>l1+l2-.001)throw Error('Extremo inalcanzable; corregir pose de '+config.id);
  const along=(l1*l1-l2*l2+d*d)/(2*d),across=Math.sqrt(Math.max(0,l1*l1-along*along))*bend;
  return [a,[a[0]+along*dx/d-across*dy/d,a[1]+along*dy/d+across*dx/d],b];
 };
 out.leftShoulder=rot([-31,-108]);out.rightShoulder=rot([31,-108]);out.neck=rot([0,-126]);
 out.limbs={leftArm:solve(out.leftShoulder,out.leftHand,config.upperArm??59,config.forearm??57,1),rightArm:solve(out.rightShoulder,out.rightHand,config.upperArm??59,config.forearm??57,-1),leftLeg:solve([-15,0],out.leftFoot,config.thigh??88,config.shin??88,1),rightLeg:solve([15,0],out.rightFoot,config.thigh??88,config.shin??88,1)};
 return out;
}

export function paintPuppet(root,time,c){
 const p=c.sample(c.config,c.poses,time),set=(q,a)=>{const n=root.querySelector(q);if(!n)throw Error('Pieza del rig ausente: '+q);for(const [k,v]of Object.entries(a))n.setAttribute(k,String(v));};
 set('.puppet-motion',{transform:`translate(${p.hip}) rotate(${p.rotation})`});
 for(const [name,points]of Object.entries(p.limbs)){
  const [a,b,d]=points;set('.'+name,{d:`M${a}L${b}L${d}`});
  set('.'+name+'-joint',{cx:b[0],cy:b[1]});
 }
 set('.puppet-torso',{transform:`rotate(${p.bodyAngle})`});
 set('.puppet-head',{transform:`translate(${p.neck}) rotate(${p.bodyAngle+p.headTilt})`});
 for(const [side,sign]of [['left',-1],['right',1]]){
  set('.'+side+'-hand',{transform:`translate(${p[side+'Hand']})`});
  set('.'+side+'-shoe',{transform:`translate(${p[side+'Foot']})`});
  set('.'+side+'-eye',{cx:sign*12+p.gaze,ry:Math.max(.3,4*(1-p.blink))});
 }
 set('.puppet-mouth',{ry:Math.max(.8,p.mouth*7)});
}

export function puppet(scene,{id,x=360,y=720,scale=1,config={},poses=[{at:0},{at:scene.duration}],layer='fg'}={}){
 if(!/^[A-Za-z][\w-]*$/.test(id??'')||![x,y,scale].every(Number.isFinite)||scale<=0||poses.length<2)throw Error('Rig invalido.');
 claimVisual(scene,id);
 const c={skin:'#e8b38c',shirt:'#4874a0',pants:'#293e66',hair:'#513827',...config,id};
 for(const key of ['skin','shirt','pants','hair'])if(!/^#[0-9a-f]{6}$/i.test(c[key]))throw Error('Color del rig invalido.');
 let last=-1;
 const allowed=new Set(['at','hip','rotation','bodyAngle','headTilt','leftHand','rightHand','leftFoot','rightFoot','blink','gaze','mouth']);
 for(const p of poses){if(!Number.isFinite(p.at)||p.at<0||p.at<=last||p.at>scene.duration)throw Error('Reloj de poses invalido.');last=p.at;for(const [k,v]of Object.entries(p)){if(!allowed.has(k))throw Error('Control de pose desconocido: '+k);if(Array.isArray(v)){if(v.length!==2||!v.every(Number.isFinite))throw Error('Coordenadas de pose invalidas.');}else if(!Number.isFinite(v))throw Error('Valor de pose invalido: '+k);if(['blink','mouth'].includes(k)&&(v<0||v>1))throw Error(k+': usar 0..1.');}}
 if(poses[0].at!==0)throw Error('La primera pose debe empezar en cero.');
 for(let i=0;i<=200;i++)puppetPose(c,poses,scene.duration*i/200);
 const limb=(name,color,width)=>`<path class="${name}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/><circle class="${name}-joint" r="${width*.43}" fill="${color}"/>`;
 const markup=`<g class="${id}" data-motion-actor="${id}" transform="translate(${x} ${y}) scale(${scale})"><g class="puppet-motion">${limb('leftLeg',c.pants,23)}${limb('rightLeg',c.pants,23)}<path class="left-shoe" d="M-11-4H13L21 8Q20 15 7 14H-12Z" fill="#142039"/><path class="right-shoe" d="M-11-4H13L21 8Q20 15 7 14H-12Z" fill="#142039"/>${limb('leftArm',c.shirt,19)}<g class="puppet-torso"><path d="M-32-112Q0-129 32-112L29 7Q0 19-29 7Z" fill="${c.shirt}"/><path d="M-19-101L-16-15" stroke="#fff" opacity=".13" stroke-width="5"/><path d="M-9-132H9V-109H-9Z" fill="${c.skin}"/></g>${limb('rightArm',c.shirt,19)}<g class="puppet-head"><ellipse cy="-25" rx="32" ry="38" fill="${c.skin}"/><path d="M-31-21Q-43-65-9-66Q30-74 34-37L30-18L21-42Q4-37-10-48Q-15-26-31-21Z" fill="${c.hair}"/><ellipse class="left-eye" cy="-24" rx="3.5" ry="4" fill="#273044"/><ellipse class="right-eye" cy="-24" rx="3.5" ry="4" fill="#273044"/><path d="M-18-35L-8-36M8-36L18-35" stroke="${c.hair}" stroke-width="2" stroke-linecap="round"/><ellipse class="puppet-mouth" cy="-8" rx="5" ry="1" fill="#844d47"/></g><g class="left-hand"><circle r="11" fill="${c.skin}"/></g><g class="right-hand"><circle r="11" fill="${c.skin}"/></g></g></g>`;
 scene.add(layer,markup);scene.use('puppet');
 const draw=new Function('return '+paintPuppet.toString())();
 // Include the pure sampler explicitly; no runtime import or hidden closure.
 const source=draw.toString().replace('c.sample(c.config,c.poses,time)',`(${puppetPose.toString()})(c.config,c.poses,time)`);
 procedural(scene,{selector:'.'+id,draw:Function('return '+source)(),config:{config:c,poses}});
 return {id,config:c,poses};
}

export function walkPoses({duration=4,stride=50,travel=160,cycles=2}={}){
 if(![duration,stride,travel,cycles].every(Number.isFinite)||duration<=0||stride<0||stride>75||cycles<=0||!Number.isInteger(cycles))throw Error('Marcha invalida.');
 const step=travel/cycles;
 if(Math.abs(step)>Math.min(stride*1.7,100))throw Error('El recorrido requiere una zancada mayor o mas ciclos.');
 const count=cycles*2,segment=duration/count;
 // Cada pie tiene una coordenada de mundo fija durante apoyo. Alternamos
 // el pie que avanza, con elevación únicamente en la fase de balanceo.
 // La cadera avanza de manera continua; su resta NO debe mover el pie plantado.
 const feet=(which,time)=>{
  const initial=which==='left'?-22:22;
  let world=initial,y=167;
  for(let k=0;k<count;k++){
   const active=(k%2===0?'right':'left')===which,start=k*segment;
   if(!active)continue;
   if(time>=start+segment){world+=step;continue;}
   if(time<=start)break;
   const phase=(time-start)/segment,e=phase*phase*(3-2*phase);
   world+=step*e;y-=Math.sin(Math.PI*phase)*Math.min(28,stride*.6);break;
  }
  return [world-travel*(time/duration),y];
 };
 const frames=Math.max(60,Math.ceil(duration*60)),poses=[];
 for(let i=0;i<=frames;i++){
  const time=duration*i/frames,u=i/frames,phase=u*cycles*2*Math.PI;
  poses.push({at:time,hip:[travel*u,0],leftFoot:feet('left',time),rightFoot:feet('right',time),leftHand:[-62+stride*.23*Math.sin(phase),-35],rightHand:[62-stride*.23*Math.sin(phase),-35],bodyAngle:1.2*Math.sin(phase),blink:0,mouth:0});
 }
 return poses;
}

/** Levantarse desde un apoyo estable. La silla debe dibujarse aparte y alinearse
 * con la cadera inicial; los pies permanecen en el mismo punto del escenario. */
export function risePoses({duration=2.4,seatDrop=80,groundY=167}={}){
 if(![duration,seatDrop,groundY].every(Number.isFinite)||duration<=.6||seatDrop<25||seatDrop>105||groundY<130||groundY>175)throw Error('Parámetros de levantarse inválidos.');
 const keys=[
  [0,seatDrop,0,-3,-54,-18],
  [.19,seatDrop,0,14,-52,-17],
  [.40,seatDrop*.82,0,20,-48,-12],
  [.69,seatDrop*.33,0,9,-44,-22],
  [1,0,0,0,-65,-42],
 ];
 return keys.map(([u,hy,hx,angle,hxLeft,handY])=>({
  at:u*duration,hip:[hx,hy],bodyAngle:angle,
  leftFoot:[-28,groundY-hy],rightFoot:[28,groundY-hy],
  leftHand:[hxLeft,handY],rightHand:[-hxLeft,handY],
  gaze:0,blink:0,mouth:0,
 }));
}

// Pose presets are optional starting points; adapt the geometry to the action.
export const standingPose=(at=0)=>({at,hip:[0,0],leftFoot:[-22,167],rightFoot:[22,167],leftHand:[-73,-42],rightHand:[73,-42],blink:0,mouth:0});
export const seatedPose=(at=0)=>({...standingPose(at),hip:[0,80],leftFoot:[-55,82],rightFoot:[55,82],leftHand:[-65,-18],rightHand:[65,-18],bodyAngle:-4});
export const sleepingPose=(at=0)=>({...standingPose(at),rotation:-90,blink:1,leftHand:[-38,-34],rightHand:[38,-34]});

export function createPuppetCast(definitions){
 if(!Array.isArray(definitions)||!definitions.length||definitions.length>80)throw Error('Definir un reparto de 1..80 personajes.');
 const designs=new Map(),actors=[];
 for(const d of definitions){
  const {id,name=id,initialState='standing',...config}=d;
  if(!/^[A-Za-z][\w-]*$/.test(id??'')||designs.has(id))throw Error('Identidad de reparto invalida o repetida.');
  const design=Object.freeze(structuredClone({...config,id}));designs.set(id,design);
  actors.push({id,name,initialState,appearance:JSON.stringify(design),parts:['head','eyes','mouth','torso','arms','hands','legs','feet']});
 }
 return {actors,place:(scene,id,options={})=>{if(!designs.has(id))throw Error('Personaje no registrado: '+id);return puppet(scene,{...options,id,config:designs.get(id)});}};
}
