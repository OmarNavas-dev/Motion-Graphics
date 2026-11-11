import assert from 'node:assert/strict';
import {auditProductionPlanning} from './audit-production-planning-2.31.mjs';

const scene=(id,duration)=>({
 id,duration,customScene:{html:'<svg><g class="film"></g></svg>',script:"tl.to(S+' .film',{x:50,duration:1},T0);"},
 direction:{visualMode:'mechanism',objective:'La lámina avanza por la máquina y cambia su posición.',
 shots:[{at:0,duration,scale:'detail',purpose:'Mostrar avance de película'}],
 actions:[{selector:'.film',at:.5,duration:1,action:'La película avanza sobre la guía mecánica.',
 result:'La película llega al punto de contacto con el rodillo.'}]}
});
const project={scenes:[scene('a',2),scene('b',3)]};
const shot=(id,sceneId,start,end,transition)=>({
 id,sceneId,start,end,narration:'La lámina avanza.',visualGoal:'Mostrar avance físico.',
 location:'Taller A',lighting:'Luz cálida sobre acero',
 entryFrame:'Película en la guía',exitFrame:'Película en el rodillo',
 camera:{shot:'detail',from:'Guía de entrada',to:'Rodillo',movement:'travelling lateral'},
 action:{anticipation:'La guía prepara el material',main:'El rodillo arrastra la lámina',
 contact:'La lámina toca el rodillo',recovery:'La película sale con tensión'},
 actors:[],props:[{id:'sheet',startState:'Película en la guía',endState:'Película en el rodillo'}],
 transition
});
const plan={duration:5,scenes:[
 shot('p-a','a',0,2,{to:'p-b',type:'match cut',continuity:'La misma película sigue avanzando en la misma dirección'}),
 shot('p-b','b',2,5,{to:null,type:'final',continuity:'Plano final conserva el material'})
]};
plan.scenes[1].props[0].startState='Película en el rodillo';
const beats={duration:5,beats:[
 {id:'v1',scene:'a',at:.5,speechAt:.5,visual:'Película avanza',cause:'Empuje del rodillo',
 effect:'Llega al punto de presión',subject:'película'},
 {id:'v2',scene:'b',at:2.5,speechAt:2.5,visual:'Película avanza',cause:'Giro del motor',
 effect:'Sale de la prensa',subject:'película',bridge:'Mismo material a la derecha'}
]};
const mechanics={actions:[
 {id:'m1',sceneId:'a',kind:'translate',actor:'Película',selector:'.film',
 cause:'El rodillo arrastra la película por la guía',visibleResult:'La lámina llega a la boca de la prensa',
 start:.5,end:1.5,startState:'Lámina a la izquierda',endState:'Lámina centrada'},
 {id:'m2',sceneId:'b',kind:'translate',actor:'Película',selector:'.film',
 cause:'El rodillo sigue arrastrando la misma película',visibleResult:'La película sale a la derecha de la prensa',
 start:2.5,end:3.5,startState:'Lámina centrada',endState:'Lámina a la derecha'}
]};
const good=auditProductionPlanning(project,{plan,beats,mechanics});
assert.equal(good.pass,true,JSON.stringify(good.errors));
const noPlans=auditProductionPlanning(project);
assert.equal(noPlans.pass,false);
assert(noPlans.errors.some(x=>x.code==='SHOT_PLAN_ABSENT'));
const bad=structuredClone(project);
bad.scenes[0].direction.actions[0].action='Transformación material de .film';
bad.scenes[0].direction.actions[0].result='Cambio visible tras la acción';
const generic=auditProductionPlanning(bad,{plan,beats,mechanics});
assert(!generic.pass);
assert(generic.errors.some(x=>x.code==='GENERIC_ACTION'));
assert(generic.errors.some(x=>x.code==='GENERIC_RESULT'));
const desync=structuredClone(mechanics);
desync.actions[0].start=1.8;desync.actions[0].end=2.3;
const mismatch=auditProductionPlanning(project,{plan,beats,mechanics:desync});
assert(mismatch.errors.some(x=>x.code==='MECHANICS_OUTSIDE_SCENE'));
assert(mismatch.errors.some(x=>x.code==='ACTION_NOT_PLANNED'));
const voiced=structuredClone(project);voiced.narrationMode='single';
const noAnchor=structuredClone(beats);delete noAnchor.beats[0].speechAt;
const speech=auditProductionPlanning(voiced,{plan,beats:noAnchor,mechanics});
assert(speech.errors.some(x=>x.code==='BEAT_SPEECH_ANCHOR_MISSING'));
console.log('2.31: plan válido, ausencia de planes, acciones genéricas y tiempos incoherentes — OK');
