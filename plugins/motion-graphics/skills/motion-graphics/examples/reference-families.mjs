import * as K from '../scripts/kits/index.mjs';
import {assembleScenes} from '../scripts/assemble-scenes.mjs';

// Original silent studies of construction techniques. No invented narration,
// measured scientific claims, channel branding or inherited reference artwork.
export const projectBase={name:'Estudios de ilustracion y movimiento',format:'vertical',resolution:'1080p',fps:30,showText:false,captionMode:'none',audioAsset:'',script:'',creativeBrief:'Tres familias originales: cartoon nocturno y curva, criatura segmentada en azulejos y poblacion radial luminosa. Los tiempos son de ejercicio, no de voz real.',scenes:[]};
const scenes=[];
{
 const s=K.createScene({id:'cartoon',duration:6,bg:'#0b1230'});K.bedroom(s);K.bed(s,{x:300,y:810,w:320,h:440});
 K.puppet(s,{id:'patient',x:300,y:820,scale:1.2,poses:[{at:0,blink:1},{at:2.8,blink:1},{at:3.1,blink:0,mouth:.45},{at:6,blink:0}],config:{shirt:'#8492dc'}});
 s.add('fg','<path d="M128 757Q300 728 472 757L478 1060H122Z" fill="#6379d1"/><path d="M160 810L151 1020M278 790L280 1040M407 810L421 1030" fill="none" stroke="#4057a0" stroke-width="3" opacity=".45"/><rect x="493" y="824" width="171" height="232" rx="5" fill="#6b4e38"/><path d="M493 900H664" stroke="#463429" stroke-width="3"/><circle cx="578" cy="944" r="6" fill="#b4986b"/><rect x="515" y="773" width="126" height="55" rx="9" fill="#0b1021" stroke="#3a3c54" stroke-width="4"/><text x="578" y="811" text-anchor="middle" fill="#fd6165" font-family="monospace" font-size="33">06:00</text>');
 const cam=K.camera(s);cam.move(.1,2,{focus:[340,740],k:1.16});cam.move(3.2,1.6,{focus:[360,740],k:1});
 scenes.push(s.build({title:'Despertar',scriptExcerpt:''}));
}
{
 const s=K.createScene({id:'chart',duration:6,bg:'#10142c'});s.add('bg','<rect width="720" height="1280" fill="#10142c"/>');
 K.lineChart(s,{id:'curve',x:90,y:440,w:550,h:310,at:.4,duration:4.2,data:[[0,12],[1,8],[2,14],[3,11],[4,18],[5,42],[6,95]],labels:['Inicio','Tiempo','Final'],unit:'Evolución ilustrativa · sin unidades medidas'});
 scenes.push(s.build({title:'Cambio visible',scriptExcerpt:''}));
}
{
 const s=K.createScene({id:'creature',duration:6,bg:'#192a40'});K.tiledRoom(s,{floorY:1100});
 K.segmentedCreature(s,{id:'specimen',x:350,y:655,scale:1.8,rotation:-27,travel:[20,-16],pace:1.1});
 K.camera(s).move(.2,3.8,{focus:[350,650],k:1.12});
 scenes.push(s.build({title:'Anatomia y movimiento',scriptExcerpt:''}));
}
{
 const s=K.createScene({id:'population',duration:6,bg:'#0b0b1c'});s.add('bg',K.skyNight(s,{stars:45,top:'#10172c',bottom:'#080919'}));
 K.radialPopulation(s,{id:'family',rings:5,branching:3,radius:61,reveal:4.6,zoomFrom:1.6,zoomTo:.88});
 scenes.push(s.build({title:'Multiplicacion radial',scriptExcerpt:''}));
}
{
 const s=K.createScene({id:'dna',duration:6,bg:'#0b0d20'});s.add('bg',K.skyNight(s,{stars:26,top:'#151a34',bottom:'#080b1b'}));K.dna(s,{id:'helix',x:135,y:300,w:450,h:710,amplitude:145,turns:3.2});
 scenes.push(s.build({title:'Helice y profundidad',scriptExcerpt:''}));
}
{
 const s=K.createScene({id:'walking',duration:6,bg:'#0c1b31'});s.add('bg','<rect width="720" height="1280" fill="#142039"/><path d="M0 1008H720" stroke="#465976" stroke-width="3"/>');
 K.contactShadow(s,{x:340,y:1008,rx:180,ry:13});K.puppet(s,{id:'walker',x:220,y:839,scale:1,poses:K.walkPoses({duration:6,travel:230,cycles:3}),config:{shirt:'#b87254',pants:'#45577d'}});
 scenes.push(s.build({title:'Apoyo y marcha',scriptExcerpt:''}));
}
export default scenes;
export const studyProject=assembleScenes(projectBase,scenes);
