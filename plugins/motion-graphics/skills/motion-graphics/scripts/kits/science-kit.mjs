import {procedural,claimVisual} from './procedural-kit.mjs';

export function lineChart(scene,{id='chart',x=90,y=460,w=540,h=300,data,at=0,duration=3,color='#f0c64f',labels=[],unit=''}={}){
 if(!/^[A-Za-z][\w-]*$/.test(id)||!Array.isArray(data)||data.length<2||!data.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))||![x,y,w,h,at,duration].every(Number.isFinite)||w<=0||h<=0||duration<=0||!/^#[0-9a-f]{6}$/i.test(color))throw Error('Grafico invalido.');
 if(data.some((p,i)=>i&&p[0]<=data[i-1][0]))throw Error('El eje X debe crecer.');
 claimVisual(scene,id);
 const xs=data.map(p=>p[0]),ys=data.map(p=>p[1]),minY=Math.min(0,...ys),maxY=Math.max(...ys);if(maxY<=minY)throw Error('Rango de Y vacio.');
 const pts=data.map(p=>[x+(p[0]-xs[0])/(xs.at(-1)-xs[0])*w,y+h-(p[1]-minY)/(maxY-minY)*h]);
 const path=pts.map((p,i)=>(i?'L':'M')+p.join(' ')).join(' '),clip=scene.gid(id+'-clip');
 scene.defs(id+'-clip',`<clipPath id="${clip}"><rect class="${id}-reveal" x="${x}" y="${y-12}" width="0" height="${h+24}"/></clipPath>`);
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 scene.add('fg',`<g class="${id}"><path d="M${x} ${y-10}V${y+h}H${x+w}" fill="none" stroke="#9aaac4" stroke-width="1.5"/>${[.25,.5,.75,1].map(v=>`<path d="M${x} ${y+h-h*v}H${x+w}" stroke="#9aaac4" stroke-opacity=".12"/>`).join('')}<path d="${path}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" clip-path="url(#${clip})"/><circle class="${id}-marker" cx="${pts[0][0]}" cy="${pts[0][1]}" r="7" fill="${color}"/>${labels.map((v,i)=>`<text x="${x+w*i/Math.max(1,labels.length-1)}" y="${y+h+30}" font-size="17" text-anchor="middle" fill="#c8d3e7">${esc(v)}</text>`).join('')}<text x="${x}" y="${y-26}" font-size="15" fill="#b3c1d8">${esc(unit)}</text></g>`);
 scene.js(`tl.fromTo(S+' .${id}-reveal',{attr:{width:0}},{attr:{width:${w}},duration:${duration},ease:'none',immediateRender:false},T0+${at});`);
 const draw=function(root,t,c){const u=Math.max(0,Math.min(1,t/c.duration)),x=c.pts[0][0]+u*c.width;let i=0;while(i<c.pts.length-2&&c.pts[i+1][0]<x)i++;const a=c.pts[i],b=c.pts[i+1],v=(x-a[0])/(b[0]-a[0]),node=root.querySelector('circle');node.setAttribute('cx',x);node.setAttribute('cy',a[1]+(b[1]-a[1])*v);};
 scene.use('science');procedural(scene,{selector:'.'+id,draw,at,duration,to:duration,config:{pts,width:w,duration}});return {id,points:pts};
}

export function canvasSurface(scene,id,{x=0,y=0,w=scene.W,h=scene.H,layer='fg'}={}){
 if(!/^[A-Za-z][\w-]*$/.test(id)||![x,y,w,h].every(Number.isFinite)||w<=0||h<=0)throw Error('Canvas invalido.');
 claimVisual(scene,id);
 scene.add(layer,`<foreignObject class="${id}" x="${x}" y="${y}" width="${w}" height="${h}"><canvas xmlns="http://www.w3.org/1999/xhtml" width="${Math.ceil(w*2)}" height="${Math.ceil(h*2)}" style="width:100%;height:100%"></canvas></foreignObject>`);
 return {w,h};
}

export function paintRadialPopulation(root,t,c){
 const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas 2D no disponible.');
 const pixelRatio=canvas.width/c.w;ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);ctx.clearRect(0,0,c.w,c.h);
 const u=Math.max(0,Math.min(1,t/c.reveal)),cx=c.w/2,cy=c.h/2,zoom=c.zoomFrom+(c.zoomTo-c.zoomFrom)*u;
 ctx.translate(cx,cy);ctx.scale(zoom,zoom);ctx.lineWidth=.7/zoom;ctx.strokeStyle='rgba(246,205,126,.36)';
 // Cache immutable geometry only; the visual state is always rebuilt from t.
 let nodes=root.__radialLayout;
 if(!nodes){nodes=[{x:0,y:0,size:7,parent:0}];let parentStart=0;for(let ring=1;ring<=c.rings;ring++){const n=c.branching**ring,start=nodes.length;for(let i=0;i<n;i++){const a=i/n*Math.PI*2-Math.PI/2;nodes.push({x:Math.cos(a)*c.radius*ring,y:Math.sin(a)*c.radius*ring,size:Math.max(1.5,6-ring*.75),parent:parentStart+Math.floor(i/c.branching)});}parentStart=start;}root.__radialLayout=nodes;}
 const visible=Math.floor(nodes.length*u);
 ctx.beginPath();for(let i=1;i<visible;i++){const p=nodes[i],a=nodes[p.parent];ctx.moveTo(a.x,a.y);ctx.lineTo(p.x,p.y);}ctx.stroke();
 ctx.fillStyle=c.color;
 for(let i=0;i<visible;i++){const p=nodes[i],r=p.size;ctx.beginPath();ctx.arc(p.x,p.y-r*1.8,r,0,2*Math.PI);ctx.fill();ctx.beginPath();ctx.moveTo(p.x-r,p.y);ctx.lineTo(p.x+r,p.y);ctx.lineTo(p.x+r*.5,p.y+r*4);ctx.lineTo(p.x-r*.5,p.y+r*4);ctx.closePath();ctx.fill();}
 const g=ctx.createRadialGradient(0,0,0,0,0,60);g.addColorStop(0,'rgba(255,218,132,.35)');g.addColorStop(1,'rgba(255,218,132,0)');ctx.fillStyle=g;ctx.fillRect(-60,-60,120,120);
}
export function radialPopulation(scene,{id='population',rings=5,branching=3,radius=58,reveal=scene.duration-1,zoomFrom=1.4,zoomTo=.85,color='#f2d49b'}={}){
 if(!Number.isInteger(rings)||rings<1||rings>9||!Number.isInteger(branching)||branching<2||branching>8||![radius,reveal,zoomFrom,zoomTo].every(Number.isFinite)||radius<=0||reveal<=0||zoomFrom<=0||zoomTo<=0||!/^#[0-9a-f]{6}$/i.test(color))throw Error('Poblacion invalida.');
 const count=Array.from({length:rings+1},(_,i)=>branching**i).reduce((a,b)=>a+b,0);if(count>12000)throw Error('Poblacion excede 12000 instancias; reducir generaciones.');
 const nodes=[{x:0,y:0,size:7,parent:0}];let parentStart=0;
 for(let ring=1;ring<=rings;ring++){const n=branching**ring,start=nodes.length;for(let i=0;i<n;i++){const angle=i/n*Math.PI*2-Math.PI/2;nodes.push({x:Math.cos(angle)*radius*ring,y:Math.sin(angle)*radius*ring,size:Math.max(1.5,6-ring*.75),parent:parentStart+Math.floor(i/branching)});}parentStart=start;}
 const size=canvasSurface(scene,id);scene.use('population');procedural(scene,{selector:'.'+id,draw:paintRadialPopulation,config:{...size,rings,branching,radius,reveal,zoomFrom,zoomTo,color}});return {id,count,nodes};
}

export function paintDNA(root,t,c){
 const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas 2D no disponible.');const pixelRatio=canvas.width/c.w;ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);ctx.clearRect(0,0,c.w,c.h);
 const strands=[[],[]];for(let i=0;i<=c.steps;i++){const y=20+i*(c.h-40)/c.steps,phase=i/c.steps*c.turns*2*Math.PI+t*c.speed;for(let s=0;s<2;s++){const a=phase+s*Math.PI;strands[s].push({x:c.w/2+Math.sin(a)*c.amplitude,y,z:Math.cos(a)});}}
 ctx.lineCap='round';
 const segments=[];for(let i=0;i<c.steps;i++){for(let s=0;s<2;s++){const a=strands[s][i],b=strands[s][i+1];segments.push({a,b,z:(a.z+b.z)/2,strand:true});}if(i%3===0)segments.push({a:strands[0][i],b:strands[1][i],z:0,strand:false});}
 segments.sort((a,b)=>a.z-b.z);for(const p of segments){ctx.globalAlpha=p.strand ? .48+.52*(p.z+1)/2 : .65;ctx.strokeStyle=p.strand?c.color:'#bb9473';ctx.lineWidth=p.strand?4+(p.z+1)*1.6:2;ctx.beginPath();ctx.moveTo(p.a.x,p.a.y);ctx.lineTo(p.b.x,p.b.y);ctx.stroke();}ctx.globalAlpha=1;
}
export function dna(scene,{id='dna',x=130,y=330,w=460,h=620,turns=3,amplitude=130,speed=.8,color='#f3c971'}={}){
 if(![turns,amplitude,speed].every(Number.isFinite)||turns<=0||amplitude<=0||amplitude>w/2-10||!/^#[0-9a-f]{6}$/i.test(color))throw Error('Helice invalida.');
 canvasSurface(scene,id,{x,y,w,h});scene.use('dna');procedural(scene,{selector:'.'+id,draw:paintDNA,config:{w,h,turns,amplitude,speed,color,steps:180}});return {id};
}
