// Internal capability proofs, not a catalogue of themes or mandatory visual style.
import {createExplainer} from '../../scripts/explainer-kit.mjs';
import {assembleScenes} from '../../scripts/assemble-scenes.mjs';
const records=[],actors=[];
const backdrop=(s,title)=>{
 s.defs('bg','<linearGradient id="'+s.gid('bg')+'" x2="0" y2="1"><stop stop-color="#19394a"/><stop offset="1" stop-color="#07121e"/></linearGradient>');
 s.add('bg','<rect width="720" height="1280" fill="'+s.url('bg')+'"/>');
 s.add('hud',`<text x="360" y="200" text-anchor="middle" fill="#f5e8c5" font-size="42" font-weight="700">${title}</text>`);
};
function shot(id,title,draw){
 const actor=id+'-subject';
 const p=createExplainer([{id:actor,name:title,initialState:'initial'}]);
 const s=p.scene({id,duration:4,uid:id,bg:'#07121e'},{objective:title,before:{[actor]:'initial'},after:{[actor]:'result'},holdReason:'El estado final se mantiene para leer la consecuencia.'});
 backdrop(s,title);
 s.shot({at:0,duration:4,scale:'medium',target:title,purpose:'Mantener visible el cambio de estado y su consecuencia.',fixed:true});
 const seq=(key,selector,at,from,beats,result)=>s.sequence({id:key,actor,selector,at,description:title,result},{from,beats});
 draw(s,seq);
 records.push(s.build({title,scriptExcerpt:''}));
 actors.push(...p.actors);
}
shot('mechanism','Impacto y consecuencia',(s,q)=>{
 s.add('fg','<rect x="130" y="880" width="460" height="46" rx="8" fill="#566d7b"/><g transform="translate(330 500)"><g class="pile"><rect width="60" height="450" fill="#b7b5a2"/><path d="M8 0V450" stroke="#f8ebc1" stroke-width="8"/></g></g><g transform="translate(360 520)"><g class="hammer"><path d="M0 0L210-220" stroke="#bb8d58" stroke-width="28"/><rect x="-90" y="-44" width="180" height="75" rx="9" fill="#a4bac8"/><path d="M-76-30H76" stroke="#e4f3f5" stroke-width="7"/></g></g>');
 q('strike','.hammer',.3,{rotation:0,svgOrigin:'0 0'},[{phase:'anticipation',duration:.45,to:{rotation:24},ease:'power2.out'},{phase:'action',duration:.2,to:{rotation:0},ease:'power3.in'},{phase:'settle',duration:.2,to:{rotation:-3}},{phase:'settle',duration:.2,to:{rotation:0}}],'El mazo transmite el golpe al pilote.');
 q('sink','.pile',.95,{y:0},[{duration:.2,to:{y:64},ease:'power2.out'},{phase:'hold',duration:.6}],'El pilote permanece mas abajo.');
});
shot('ocean','El entorno cambia',(s,q)=>{
 s.add('mid','<circle class="sun" cx="520" cy="430" r="78" fill="#efbd7b"/><g class="sea"><path d="M-100 760Q30 700 160 760T420 760T680 760T940 760V1280H-100Z" fill="#315f75"/><path d="M-100 800Q30 740 160 800T420 800T680 800T940 800" fill="none" stroke="#81afbb" stroke-width="8"/></g>');
 s.add('fg','<g transform="translate(360 750)"><g class="boat"><path d="M-170 0H170L115 100H-110Z" fill="#a86d43"/><path d="M-145 18H145" stroke="#dfb17c" stroke-width="10"/><path d="M0 0V-215L110-75H0" fill="#ddd7b9" stroke="#bbb59c" stroke-width="6"/></g></g>');
 q('sunset','.sun',.2,{y:0,opacity:1},[{duration:3.2,to:{y:250,opacity:.35},ease:'none'}],'El sol baja mientras el barco permanece en el mismo espacio.');
 q('rock','.boat',.2,{rotation:-3,svgOrigin:'0 30'},[{duration:.8,to:{rotation:3},ease:'sine.inOut'},{duration:.8,to:{rotation:-3},ease:'sine.inOut'},{duration:.8,to:{rotation:3},ease:'sine.inOut'},{duration:.8,to:{rotation:0},ease:'sine.inOut'}],'El barco acompana el oleaje sin deslizar su geometria.');
 q('waves','.sea',0,{x:0},[{duration:3.5,to:{x:-150},ease:'none'}],'El agua se mueve a otra velocidad que el barco.');
});
shot('character','Gesto y reaccion',(s,q)=>{
 s.add('fg','<ellipse cx="360" cy="1050" rx="130" ry="22" fill="#000" opacity=".35"/><g transform="translate(360 720)"><g class="body"><path d="M-58 125L-48 320M53 125L48 320" stroke="#3d5c75" stroke-width="47"/><path d="M-68-95Q0-136 70-95L58 145H-60Z" fill="#9c6f51"/><g transform="translate(66 -77)"><g class="arm"><path d="M0 0L50 115" stroke="#a77c58" stroke-width="33" stroke-linecap="round"/><g transform="translate(50 115)"><g class="forearm"><path d="M0 0L12 95" stroke="#ddb18a" stroke-width="25" stroke-linecap="round"/><ellipse cx="13" cy="100" rx="16" ry="23" fill="#ddb18a"/></g></g></g></g><g transform="translate(0 -175)"><g class="head"><ellipse rx="54" ry="70" fill="#ddb18a"/><path d="M-54-6Q-66-95 9-83Q64-79 58-17L34-40L-31-34Z" fill="#2a2729"/><path d="M-26 4H-11M17 4H31" stroke="#292e34" stroke-width="5"/><path d="M-10 35Q5 44 22 31" fill="none" stroke="#714c3b" stroke-width="4"/></g></g></g></g>');
 q('reach','.arm',.4,{rotation:0,svgOrigin:'0 0'},[{phase:'anticipation',duration:.3,to:{rotation:10}},{phase:'action',duration:.7,to:{rotation:-65}},{phase:'hold',duration:.5},{phase:'settle',duration:.6,to:{rotation:-18}}],'La mano sube mediante articulaciones, no trasladando la figura entera.');
 q('elbow','.forearm',.7,{rotation:0,svgOrigin:'0 0'},[{duration:.7,to:{rotation:-45}},{phase:'hold',duration:.5},{duration:.6,to:{rotation:-20}}],'El codo acompana el gesto del hombro.');
 q('react','.head',1.3,{rotation:0,svgOrigin:'0 55'},[{duration:.4,to:{rotation:-9}},{phase:'hold',duration:.5},{duration:.5,to:{rotation:0}}],'El rostro reacciona despues del gesto.');
});
shot('astronomy','Oclusion y escala',(s,q)=>{
 s.defs('star','<radialGradient id="'+s.gid('star')+'"><stop stop-color="#fff4c9"/><stop offset=".7" stop-color="#e8ab54"/><stop offset="1" stop-color="#8a4e30"/></radialGradient>');
 s.add('fg','<circle cx="360" cy="700" r="180" fill="'+s.url('star')+'"/><g transform="translate(360 700)"><g class="moon"><circle r="171" fill="#0b1926"/><path d="M-100-100Q80-185 135-20" fill="none" stroke="#243e50" stroke-width="13"/></g></g>');
 q('eclipse','.moon',.25,{x:-420,y:-55},[{duration:1.3,to:{x:0,y:0},ease:'sine.inOut'},{phase:'hold',duration:.7},{duration:1.3,to:{x:420,y:55},ease:'sine.inOut'}],'El mismo objeto oculta y revela la estrella sin cambiar el fondo.');
});
shot('biology','Detalle y mirada',(s,q)=>{
 s.defs('iris','<radialGradient id="'+s.gid('iris')+'"><stop stop-color="#05131d"/><stop offset=".35" stop-color="#1d6878"/><stop offset=".8" stop-color="#79a69d"/><stop offset="1" stop-color="#193a48"/></radialGradient>');
 s.defs('eye','<clipPath id="'+s.gid('eye')+'"><path d="M95 700Q360 410 625 700Q360 940 95 700Z"/></clipPath>');
 s.add('fg','<path d="M70 700Q360 370 650 700Q360 980 70 700Z" fill="#bd8d73"/><g clip-path="'+s.url('eye')+'"><rect x="80" y="430" width="570" height="530" fill="#e7e5d8"/><g class="iris"><circle cx="360" cy="690" r="140" fill="'+s.url('iris')+'"/><circle cx="360" cy="690" r="57" fill="#05131a"/><circle cx="405" cy="634" r="27" fill="#f9faf1" opacity=".8"/></g></g>');
 q('look','.iris',.3,{x:0},[{duration:.7,to:{x:75},ease:'sine.inOut'},{phase:'hold',duration:.65},{duration:.75,to:{x:-55},ease:'sine.inOut'},{duration:.6,to:{x:0}}],'El iris se mueve bajo un recorte fijo, conservando la anatomia del ojo.');
});
shot('document','Escritura y evidencia',(s,q)=>{
 s.defs('writing','<clipPath id="'+s.gid('writing')+'"><rect class="reveal" x="180" y="530" width="0" height="250"/></clipPath>');
 s.add('fg','<path d="M125 390H590L620 1020H100Z" fill="#d7bf8d"/><path d="M160 430H550" stroke="#ad8b55" stroke-width="4"/><g clip-path="'+s.url('writing')+'" stroke="#624832" stroke-width="6"><path d="M180 560H530M180 610H510M180 660H540M180 710H470"/></g><g transform="translate(180 540)"><g class="pen"><path d="M0 0Q-5-140 100-210Q112-80 0 0Z" fill="#e7ddbc"/><path d="M0 0L75-170" stroke="#70533b" stroke-width="5"/></g></g><g transform="translate(480 880)"><g class="seal"><circle r="54" fill="#a34f43"/><circle r="39" fill="none" stroke="#ddb07c" stroke-width="3"/><path d="M-20 0H20M0-20V20" stroke="#ddb07c" stroke-width="5"/></g></g>');
 q('write','.reveal',.5,{attr:{width:0}},[{duration:1.4,to:{attr:{width:380}},ease:'none'}],'Las lineas aparecen progresivamente.');
 q('pen','.pen',.5,{x:0,y:0,opacity:1},[{duration:1.4,to:{x:380,y:0},ease:'none'},{duration:.3,to:{y:-60,opacity:0}}],'La pluma acompana la aparicion de la escritura.');
 q('stamp','.seal',2.2,{scale:1.8,opacity:0,svgOrigin:'0 0'},[{phase:'action',duration:.25,to:{scale:.94,opacity:1},ease:'power3.in'},{phase:'settle',duration:.3,to:{scale:1},ease:'power2.out'}],'El sello aterriza y se asienta en el documento.');
});
shot('book','Bisagra y revelacion',(s,q)=>{
 s.add('fg','<path d="M90 510Q230 460 360 520Q485 460 630 510V960Q480 910 360 975Q220 910 90 960Z" fill="#8c6649"/><path d="M100 500Q230 450 360 510V950Q230 895 100 940Z" fill="#decda5"/><path d="M360 510Q490 450 620 500V940Q480 895 360 950Z" fill="#efdfb4"/><g transform="translate(360 510)"><g class="leaf"><path d="M0 0Q125-60 260-10V430Q125 385 0 440Z" fill="#d2b988"/><path d="M35 70H220M35 110H200M35 150H225" stroke="#8e7751" stroke-width="5"/></g></g><path d="M380 720H580" class="highlight" stroke="#c48245" stroke-width="27" opacity=".4"/>');
 q('page','.leaf',.4,{scaleX:1,svgOrigin:'0 0'},[{duration:1.1,to:{scaleX:.04},ease:'sine.inOut'},{duration:1,to:{scaleX:-1},ease:'sine.inOut'}],'La pagina gira sobre el lomo, conservando su punto de apoyo.');
 q('reveal','.highlight',2.6,{opacity:0},[{duration:.6,to:{opacity:.65}}],'El detalle se destaca despues de abrir la pagina.');
});
shot('economy','Transferencia y resultado',(s,q)=>{
 s.add('fg','<rect x="90" y="800" width="230" height="170" rx="18" fill="#3e6878"/><rect x="400" y="800" width="230" height="170" rx="18" fill="#4c806d"/><path d="M125 850H280M435 850H590" stroke="#a7c2b7" stroke-width="7"/><g transform="translate(205 730)"><g class="coin"><circle r="48" fill="#ddac58"/><circle r="36" fill="none" stroke="#f5dc96" stroke-width="4"/><path d="M-16 0H16M0-21V21" stroke="#805e32" stroke-width="7"/></g></g><rect class="balance" x="440" y="900" width="0" height="22" rx="5" fill="#b9d6a2"/>');
 q('transfer','.coin',.4,{x:0,y:0,scale:1,opacity:1},[{phase:'anticipation',duration:.2,to:{scale:.94}},{duration:.5,to:{x:155,y:-150,scale:1},ease:'sine.out'},{duration:.5,to:{x:310,y:0},ease:'sine.in'},{duration:.25,to:{opacity:0,y:70}}],'La unidad viaja entre dos ubicaciones y queda depositada.');
 q('result','.balance',1.65,{attr:{width:0}},[{duration:.6,to:{attr:{width:150}},ease:'power2.out'}],'El indicador cambia despues de recibir el objeto.');
});
export const projectBase={name:'Pruebas transversales de movimiento',format:'vertical',resolution:'720p',fps:24,showText:false,captionMode:'none',actors};
export default records;
export const project=assembleScenes(projectBase,records);
