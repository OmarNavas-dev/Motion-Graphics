import {procedural,claimVisual} from './procedural-kit.mjs';

export function paintSegmentedCreature(root,t,c){
 const set=(q,a)=>{const n=root.querySelector(q);if(!n)throw Error('Pieza de criatura ausente: '+q);for(const [k,v]of Object.entries(a))n.setAttribute(k,String(v));};
 const phase=t*c.pace*2*Math.PI;
 set('.creature-travel',{transform:`translate(${c.travel[0]*t/c.duration} ${c.travel[1]*t/c.duration}) rotate(${Math.sin(phase)*1.2})`});
 for(let side=-1;side<=1;side+=2){
  for(let i=0;i<3;i++){
   const y=-48+i*23,x=side*(25-i*2),p=phase+i*Math.PI*2/3+(side===1?Math.PI:0),tipX=side*(56+Math.sin(p)*9),tipY=y+22+Math.cos(p)*9;
   set('.leg'+(side<0?'L':'R')+i,{d:`M${x} ${y}Q${side*45} ${y+4} ${tipX} ${tipY}L${tipX+side*5} ${tipY+8}`});
  }
  const a=Math.sin(t*2.2+side)*14;
  set('.antenna'+(side<0?'L':'R'),{d:`M${side*11}-78 C${side*24} -115 ${side*53+a} -157 ${side*72+a} -202`});
 }
 for(let i=0;i<3;i++){const side=i-1,a=Math.sin(t*2+i)*10;set('.filament'+i,{d:`M${side*7} 116 Q${side*25+a} 157 ${side*55+a} 216`});}
}

export function segmentedCreature(scene,{id='creature',x=360,y=700,scale=1,rotation=-25,travel=[0,0],pace=1.4,layer='fg'}={}){
 if(!/^[A-Za-z][\w-]*$/.test(id)||![x,y,scale,rotation,pace,...travel].every(Number.isFinite)||travel.length!==2||scale<=0||pace<0)throw Error('Criatura invalida.');
 claimVisual(scene,id);
 const g=scene.gid(id+'-silver'),f=scene.gid(id+'-grain');
 scene.defs(id+'-silver',`<linearGradient id="${g}"><stop stop-color="#506574"/><stop offset=".25" stop-color="#d4dce0"/><stop offset=".5" stop-color="#f1f3ec"/><stop offset=".75" stop-color="#a1b2bc"/><stop offset="1" stop-color="#455968"/></linearGradient>`);
 scene.defs(id+'-grain',`<filter id="${f}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".5 .15" numOctaves="2" seed="7"/><feColorMatrix type="saturate" values="0"/><feComposite in2="SourceGraphic" operator="in"/></filter>`);
 const legs=[-1,1].map(side=>Array.from({length:3},(_,i)=>`<path class="leg${side<0?'L':'R'}${i}" fill="none" stroke="#aebfc8" stroke-width="3" stroke-linecap="round"/>`).join('')).join('');
 let segments='';
 for(let i=0;i<11;i++){const yy=-69+i*17,w=34*(1-(i/12)**1.4);segments+=`<path d="M${-w} ${yy}Q0 ${yy-9} ${w} ${yy}L${w*.91} ${yy+15}Q0 ${yy+24} ${-w*.91} ${yy+15}Z" fill="url(#${g})" stroke="#607784" stroke-width=".9"/><path d="M${-w*.7} ${yy+2}Q0 ${yy-3} ${w*.7} ${yy+2}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.4"/>`;}
 scene.add(layer,`<g class="${id}" data-motion-actor="${id}" transform="translate(${x} ${y}) rotate(${rotation}) scale(${scale})"><g class="creature-travel"><ellipse cy="20" rx="43" ry="113" fill="#030912" opacity=".18" transform="translate(8 9)"/>${legs}<g fill="none" stroke="#d2dee5" stroke-width="1.4"><path class="antennaL"/><path class="antennaR"/><path class="filament0"/><path class="filament1"/><path class="filament2"/></g>${segments}<ellipse cy="-78" rx="22" ry="18" fill="url(#${g})"/><circle cx="-16" cy="-83" r="2.8" fill="#192a36"/><circle cx="16" cy="-83" r="2.8" fill="#192a36"/><path d="M-17-67Q-43-13-14 62Q-9 97 0 117Q15 74 23 17Q44-21 18-67Z" fill="#fff" opacity=".1" filter="url(#${f})"/></g></g>`);
 scene.use('creature');procedural(scene,{selector:'.'+id,draw:paintSegmentedCreature,config:{travel,pace,duration:scene.duration}});return {id};
}
