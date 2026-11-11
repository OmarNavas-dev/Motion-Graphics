import assert from 'node:assert/strict';
import {auditSpecificComposition} from './audit-specific-composition.mjs';

const cases=[
 ['narrative','Historia bíblica','Un viajero lleva agua a un poblado','Una jarra cambia de manos'],
 ['mechanism','Máquina industrial','Un pistón comprime la cámara de aire','La válvula se abre por presión'],
 ['scientific-diagram','Biología celular','Una membrana separa sustancias','Las moléculas atraviesan el canal'],
 ['data-viz','Datos de población','Dos series crecen a ritmos diferentes','Se revela una diferencia cuantificada'],
 ['symbolic','Ética abstracta','Dos decisiones tienen resultados diferentes','Dos caminos se bifurcan'],
 ['typographic','Poesía visual','La palabra se desplaza según su significado','La composición cambia de sentido'],
 ['documentary','Historia de un invento','Un documento registra el descubrimiento','La fecha y el mapa se relacionan'],
];
const scene=(id)=>({id,direction:{objective:'Un acontecimiento específico cambia de estado y revela una consecuencia observable en este plano.'},customScene:{html:`<svg><g class="subject-${id}"><circle cx="50" cy="50" r="${20+Number(id.slice(1))}"/></g><rect class="context-${id}" x="${5+Number(id.slice(1))}" y="80" width="100" height="20"/></svg>`,script:'tl.to(S+" .subject",{x:12,duration:1},T0);'}});
const planScene=(id,visualMode,subject,cause,visibleResult)=>({
 sceneId:id,visualMode,setting:'Ambiente visual elegido según el fenómeno y su contexto',subject,cause,
 physicalAction:'El sujeto ejecuta un cambio representado en el plano',visibleResult,
 visualMotif:'Relación espacial que permite comparar el antes y el después',
 nextContinuity:'El sujeto persiste hacia la siguiente unidad visual',
 layoutIntent:`Estructura visual ${id} que muestra el fenómeno sin texto`,
 visualQuestion:'¿Qué sujeto se transforma y por qué ocurre este cambio?',
 shotPurpose:'El plano hace legibles las relaciones principales del acontecimiento',
 objects:[{name:'contexto',selector:`.context-${id}`}],
 essentialElements:[{role:'sujeto central',selector:`.subject-${id}`}],
 states:[{timeLabel:'inicio',visibleState:'El sujeto conserva su estado inicial'},{timeLabel:'final',visibleState:'El sujeto evidencia el cambio'}],
 visualEvidence:{start:'Se reconoce el sujeto antes del cambio',end:'El resultado ocupa el foco de atención'},
 placeholderPrimary:false
});
const project={scenes:cases.map((_,i)=>scene('s'+i))};
const plan={schema:'motion-studio.composition-plan/1',visualEvents:cases.map((c,i)=>({id:'e'+i,action:c[2],outcome:c[3],sceneIds:['s'+i]})),scenes:cases.map((c,i)=>planScene('s'+i,c[0],c[1],c[2],c[3]))};
const ok=auditSpecificComposition(project,plan);
assert.equal(ok.pass,true,'Las siete familias visuales deben poder planificarse sin imponer un único estilo: '+JSON.stringify(ok.issues));

const broken=structuredClone(plan);
broken.scenes[0].essentialElements[0].selector='.actor-inexistente';
assert(broken.scenes[0].visualMode==='narrative');
assert(auditSpecificComposition(project,broken).issues.some(i=>i.code==='ESSENTIAL_NOT_DRAWN'));
const placeholder=structuredClone(plan);
placeholder.scenes[1].placeholderPrimary=true;
assert(auditSpecificComposition(project,placeholder).issues.some(i=>i.code==='PLACEHOLDER_AS_SCENE'));
const justified=structuredClone(plan);
justified.scenes[4].placeholderPrimary=true;
justified.scenes[4].symbolicJustification='El símbolo representa la bifurcación de decisiones de este concepto abstracto.';
assert.equal(auditSpecificComposition(project,justified).pass,true);
const repeated=structuredClone(plan);
repeated.scenes[1].layoutIntent=repeated.scenes[0].layoutIntent;
assert(auditSpecificComposition(project,repeated).issues.some(i=>i.code==='REUSED_LAYOUT_UNJUSTIFIED'));
console.log('PASS: siete modos visuales; faltantes, símbolos injustificados y diseño repetido detectados.');
