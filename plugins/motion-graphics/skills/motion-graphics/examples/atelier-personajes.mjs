import {createScene} from '../scripts/kits/scene-kit.mjs';
import {animateAdult,renderAdult,characterPoseAt} from '../scripts/kits/character-kit.mjs';

export const characters=[
 {id:'inventorA',face:'round',hairStyle:'swept',hair:'#503a2e',skin:'#ad7755',skinLight:'#e1ab7f',shirt:'#617d79',pants:'#3a454b'},
 {id:'inventorB',face:'long',hairStyle:'receding',glasses:true,hair:'#493d35',skin:'#ae8269',skinLight:'#e9bf9c',shirt:'#9a735b',pants:'#45434a'},
];
const sample='<path d="M-3 0L94 8L92 58L-5 48Z" fill="#c7e7e5" fill-opacity=".65" stroke="#537e80" stroke-width="2"/>'+Array.from({length:12},(_,i)=>`<ellipse cx="${8+(i%4)*23}" cy="${12+Math.floor(i/4)*16}" rx="8" ry="6" fill="#e3f3eb" fill-opacity=".6" stroke="#6e9898"/>`).join('');
export const poses=[
 {at:0,left:[-88,-10],right:[88,-10],headTilt:0,rightGrip:true,rightHeld:sample},
 {at:2,left:[-88,-10],right:[120,-90],headTilt:8,rightAngle:-14,rightGrip:true,rightHeld:sample},
 {at:4,left:[-80,-35],right:[113,-115],headTilt:5,rightAngle:-7,rightGrip:true,rightHeld:sample},
 {at:6,left:[-88,-10],right:[88,-10],headTilt:0,rightGrip:true,rightHeld:sample},
];
export function inventorArt(time=0){
 const p=characterPoseAt(poses,time);
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 1280"><rect width="720" height="1280" fill="#e9e2d3"/><path d="M0 995H720V1280H0Z" fill="#c1b49d"/><path d="M60 240H660V990H60Z" fill="#f4efe2"/><path d="M95 320H625M95 350H625" stroke="#d5cbb7" stroke-width="3"/><g transform="translate(178 795) scale(1.15)">${renderAdult(characters[0],p)}</g><g transform="translate(551 795) scale(-1.15 1.15)">${renderAdult(characters[1],{left:[-87,-12],right:[108,-60],headTilt:-5,rightAngle:-20})}</g><path d="M52 885H675V919H52Z" fill="#78513c"/><path d="M70 919H96V1220H70ZM629 919H655V1220H629Z" fill="#5b4335"/><path d="M125 874V839H602V874Z" fill="#728b8a"/><path d="M140 843H587V858H140Z" fill="#b2c9c3"/><circle cx="154" cy="852" r="9" fill="#3b5053"/><circle cx="575" cy="852" r="9" fill="#3b5053"/></svg>`;
}
const s=createScene({id:'inventores-estudio',duration:6,uid:'people',bg:'#e9e2d3'});
// Same generated SVG geometry is used by contact sheets and the runtime scene.
const art=inventorArt(0).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
s.add('fg',art);
// Give the first actor a replacement root without applying a second placement.
// The data-character root is unique and keeps all body and grip geometry together.
const record=s.build({title:'Prueba de personajes: alcance y agarre',scriptExcerpt:''});
record.customScene.html=record.customScene.html.replace('data-character-id="inventorA"','class="inventorA-body" data-character-id="inventorA"');
animateAdult(s,{config:characters[0]},poses);
record.customScene.script=s.render().script;
record.direction={objective:'Revisar conexión de cuello, dos brazos, codos, muñecas y agarre persistente.',before:{inventorA:'sostiene la muestra abajo',inventorB:'observa'},after:{inventorA:'sostiene la muestra abajo',inventorB:'observa'},actions:[{id:'show-sample',actor:'inventorA',at:0,duration:6,description:'Levanta y presenta la muestra, luego vuelve a reposo.',result:'La muestra conserva el anclaje a la mano.',selector:'.inventorA-body'}],shots:[{at:0,duration:6,scale:'medium',target:'inventores',purpose:'Inspeccionar siluetas, articulaciones y contacto sin ocultarlos con movimiento de cámara.'}],holdReason:'',transition:'',materials:'Ilustración vectorial mate',lighting:'Luz amplia desde arriba a la izquierda'};
export const project={name:'Estudio de personajes y agarre',format:'vertical',fps:24,showText:false,actors:characters.map(c=>({id:c.id,name:c.id,appearance:JSON.stringify(c),parts:['head','neck','torso','leftArm','rightArm','hands','legs'],initialState:c.id==='inventorA'?'sostiene la muestra abajo':'observa'})),scenes:[record]};
export default [record];
