import {createExplainer} from '../scripts/explainer-kit.mjs';
import {createCharacterCast,animateAdult} from '../scripts/kits/character-kit.mjs';

export function buildInventorsScene({id='inventors-sealing',duration=7.583,scriptExcerpt=''}={}){
 if(duration<6.5)throw Error('This action needs at least 6.5 s; redesign it instead of stretching narration.');
 const cast=createCharacterCast([
  {id:'fielding',name:'Alfred Fielding',initialState:'Sostiene las dos películas frente al sellador.',face:'round',hair:'#49352d',skin:'#ad7755',skinLight:'#dfab84',shirt:'#71867c',pants:'#4a4541'},
  {id:'chavannes',name:'Marc Chavannes',initialState:'Observa la muestra desde el lado derecho de la mesa.',face:'long',hairStyle:'receding',glasses:true,hair:'#463830',skin:'#b2886c',skinLight:'#ebc19b',shirt:'#8c7461',pants:'#47454a'},
 ]);
 const machine={id:'sealer',name:'Sellador térmico',appearance:'Dos guías verticales, mordaza de acero, base y películas transparentes.',parts:['guides','jaw','base','films'],initialState:'Mordaza abierta; base libre.'};
 const production=createExplainer([...cast.actors,machine]);
 const s=production.scene({id,duration,uid:'seal'+id.replace(/[^a-z0-9]/gi,'').slice(-12),bg:'#263a3d'},{objective:'Mostrar preparación, colocación de dos películas, retirada de las manos y sellado.',before:{fielding:cast.actors[0].initialState,chavannes:cast.actors[1].initialState,sealer:machine.initialState},after:{fielding:'Manos fuera de la mordaza; observa el resultado.',chavannes:'Observa las películas selladas desde el mismo lado.',sealer:'Mordaza abierta; películas unidas en la base.'},materials:'Ilustración vectorial mate, acero cepillado, madera y plástico transparente.',lighting:'Luz amplia superior izquierda; reflejos locales en el acero.',transition:'Salto temporal al laboratorio de 1957.'});
 const uid=s.uid;
 s.defs('back',`<radialGradient id="${uid}-back"><stop stop-color="#69746c"/><stop offset="1" stop-color="#24383c"/></radialGradient>`);
 s.defs('steel',`<linearGradient id="${uid}-steel" x2="0" y2="1"><stop stop-color="#c5dbd8"/><stop offset=".35" stop-color="#7e9b9e"/><stop offset=".55" stop-color="#bbd1ca"/><stop offset="1" stop-color="#55787d"/></linearGradient>`);
 s.add('bg',`<rect x="-100" y="-100" width="920" height="1480" fill="url(#${uid}-back)"/><path d="M55 360H665V1040H55Z" fill="#d0c7ad" opacity=".1"/><path d="M80 424H640M80 449H640" stroke="#e1cfab" stroke-opacity=".1" stroke-width="2"/><ellipse cx="363" cy="1123" rx="330" ry="49" fill="#0a2226" opacity=".5"/>`);
 s.add('hud','<text x="360" y="284" text-anchor="middle" font-size="60" font-weight="700" fill="#efd5a5">1957</text>');
 // Both films belong to the hand until the release. Geometry is reused at release.
 const films='<path d="M-3 0L94 5L92 39L-5 34Z" fill="#b8dcd9" fill-opacity=".35" stroke="#e4f2e7" stroke-width="1.3"/><path d="M-3 4L94 9L92 43L-5 38Z" fill="#b8dcd9" fill-opacity=".24" stroke="#8fbbc1" stroke-width="1.3"/><path d="M4 10L84 14M4 29L84 33" stroke="#f4fbec" stroke-opacity=".35"/>';
 const release=2.6,scale=1.15,x=180,y=800,wrist=[100,-2];
 const rest={left:[-87,-12],right:[88,-10],rightGrip:true,rightHeld:films};
 const placed={left:[-87,-12],right:wrist,rightGrip:false,headTilt:7};
 const poses=[{...rest,at:0},{...rest,right:[112,-44],headTilt:8,at:1},{...rest,right:wrist,headTilt:7,at:release-.001},{...placed,at:release},{...placed,right:[88,-10],headTilt:4,at:3.2},{...placed,right:[88,-10],headTilt:0,at:duration}];
 const actor=cast.place(s,'fielding',rest,{x,y,scale});animateAdult(s,actor,poses);
 cast.place(s,'chavannes',{left:[-87,-12],right:[100,-44],headTilt:-4},{x:551,y,scale,facing:-1});
 s.add('fg','<path d="M52 884H675V918H52Z" fill="#9a7050"/><path d="M65 918H661V1242H65Z" fill="#694e3d"/><path d="M79 938H647V1228H79Z" fill="#735543"/><path d="M80 930H645" stroke="#c99b6a" stroke-width="3" opacity=".35"/>');
 s.add('fg',`<g><rect x="127" y="736" width="18" height="130" rx="5" fill="url(#${uid}-steel)"/><rect x="574" y="736" width="18" height="130" rx="5" fill="url(#${uid}-steel)"/><rect x="116" y="851" width="491" height="25" rx="4" fill="url(#${uid}-steel)"/><path d="M129 866H595" stroke="#355660" stroke-width="3"/></g>`);
 const px=x+(wrist[0]+4)*scale,py=y+(wrist[1]+9)*scale;
 s.add('fg',`<g class="placed-films" opacity="0" transform="translate(${px} ${py}) scale(${scale})">${films}<g class="new-cells" opacity="0">${Array.from({length:12},(_,i)=>`<ellipse cx="${8+i%4*23}" cy="${10+Math.floor(i/4)*11}" rx="8" ry="4.5" fill="#c9eeea" fill-opacity=".6" stroke="#eff9eb" stroke-width=".7"/>`).join('')}</g></g>`);
 s.add('fg',`<g class="heat-jaw"><rect x="126" y="744" width="468" height="22" rx="5" fill="url(#${uid}-steel)" stroke="#b3ccbf"/><path d="M145 752H574M145 757H574" stroke="#eff9e8" stroke-opacity=".3"/><rect x="139" y="765" width="442" height="8" fill="#baa77b"/><circle cx="140" cy="755" r="5" fill="#2d535e"/><circle cx="580" cy="755" r="5" fill="#2d535e"/></g>`);
 s.js(`tl.set(S+' .placed-films',{opacity:1},T0+${release});tl.set(S+' .new-cells',{opacity:1},T0+3.8);`);
 s.action({id:'close-jaw',actor:'sealer',at:3,duration:.65,description:'La mordaza baja después de retirar las manos.',result:'Las dos películas quedan presionadas entre las caras del sellador.',selector:'.heat-jaw'},{from:{y:0},to:{y:82}});
 s.action({id:'open-jaw',actor:'sealer',at:4.4,duration:.7,description:'La mordaza se eleva de nuevo.',result:'La lámina sellada queda visible sobre la base.',selector:'.heat-jaw'},{from:{y:82},to:{y:0}});
 const record=s.build({title:'Dos películas, un material nuevo',scriptExcerpt});
 record.direction.actions.push({id:'place-and-release',actor:'fielding',at:0,duration:3.2,description:'Presenta las películas, las coloca y retira la mano.',result:'El objeto deja de pertenecer a la mano y permanece en la base, sin saltar de posición.',selector:'.fielding-body'});
 record.direction.shots.push({at:0,duration,scale:'medium',target:'manos, películas y mordaza',purpose:'Mantener visible el contacto y la retirada de las manos durante todo el proceso.'});
 return {record,actors:production.actors};
}
const demo=buildInventorsScene();
export const projectBase={name:'Preparación y sellado',format:'vertical',fps:24,showText:false,actors:demo.actors};
export default [demo.record];
