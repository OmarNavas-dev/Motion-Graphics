import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import crypto from 'node:crypto';
import * as K from '../scripts/kits/index.mjs';
import {createTimingAnchors} from '../scripts/timing-anchors.mjs';
import {reviewTimes} from '../scripts/runtime-review-utils.mjs';
import {checkProject} from '../scripts/validate-project.mjs';
import {studyProject} from '../examples/reference-families.mjs';

test('anclajes usan palabras reales, resuelven repeticiones y conservan offsets',()=>{
 const words=[{text:'Antes,',start:1,end:1.4},{text:'cambia',start:2,end:2.4},{text:'antes',start:3,end:3.5}];
 const a=createTimingAnchors({words,timeBase:'global'},{sceneStart:1,sceneDuration:3});
 assert.throws(()=>a.at({phrase:'antes'}),/ambigua/);
 assert.equal(a.at({phrase:'antes',occurrence:2}),2);
 assert.deepEqual(a.span({index:0},{index:1,edge:'end'}),{at:0,duration:1.4});
 assert.throws(()=>a.at({index:0,offset:-.1}),/fuera/);assert.deepEqual(a.words(),words);
});
test('el rig conserva longitudes de brazos y piernas entre poses y cambia el rostro',()=>{
 const poses=[K.standingPose(0),{...K.seatedPose(2),blink:1,mouth:1},K.standingPose(4)];
 for(let t=0;t<=4;t+=.05){const p=K.puppetPose({id:'test'},poses,t);for(const [name,[a,b,c]]of Object.entries(p.limbs)){const expected=name.endsWith('Arm')?[59,57]:[88,88];assert.ok(Math.abs(Math.hypot(b[0]-a[0],b[1]-a[1])-expected[0])<1e-8);assert.ok(Math.abs(Math.hypot(c[0]-b[0],c[1]-b[1])-expected[1])<1e-8);}}
 assert.equal(K.puppetPose({id:'test'},poses,2).blink,1);assert.equal(K.puppetPose({id:'test'},poses,2).mouth,1);
 assert.throws(()=>K.puppetPose({id:'x'},[{at:0,leftFoot:[900,900]}],0),/inalcanzable/);
});
test('la marcha mantiene el pie de apoyo en coordenadas de mundo',()=>{
 const poses=K.walkPoses({duration:4,travel:160,cycles:2});
 const positions=poses.filter(p=>p.at>=.2&&p.at<=.8).map(p=>p.hip[0]+p.leftFoot[0]);
 assert.ok(Math.max(...positions)-Math.min(...positions)<1e-8);
 const s=K.createScene({id:'walk',duration:4});assert.doesNotThrow(()=>K.puppet(s,{id:'walker',poses}));
});
test('diagramas rechazan datos ambiguos y poblaciones fuera de presupuesto',()=>{
 const s=K.createScene({id:'data',duration:5});assert.throws(()=>K.lineChart(s,{data:[[1,4],[1,5]]}),/crecer/);
 assert.throws(()=>K.radialPopulation(s,{rings:9,branching:8}),/12000/);
 const p=K.radialPopulation(s,{id:'valid',rings:4,branching:3});assert.equal(p.count,121);assert.ok(p.nodes.slice(1).every(n=>n.parent>=0&&n.parent<p.count));
});
test('todas las familias compilan sin imports, preservan código y pasan contrato',async()=>{
 const p=structuredClone(studyProject);const result=await checkProject(p,{duration:36});assert.equal(result.ok,true,result.errors.join('\n'));
 for(const s of p.scenes){new vm.Script(`(function(tl,S,T0,D,gsap){${s.customScene.script}})`);assert.ok(!/\bimport\s|requestAnimationFrame|Math\.random/.test(s.customScene.script));}
});
test('el resumen final conserva avisos y rechaza exceso temporal',async()=>{
 const p=studyProject,report={projectHash:crypto.createHash('sha256').update(JSON.stringify(p)).digest('hex'),runtimePassed:true,errors:[],samples:p.scenes.map(s=>({scene:s.id})),warnings:[{scene:'chart',reason:'Revisar material'}],motionAudit:[{scene:'chart',overflow:2}]};
 const result=await checkProject(p,{runtimeReport:report});assert.equal(result.ok,false);assert.ok(result.errors.some(e=>e.includes('exceden')));assert.ok(result.warnings.some(e=>e.includes('material')));
});
test('muestreo denso incluye contactos y tiene límite de trabajo',()=>{
 const scene={duration:4,direction:{actions:[{at:1,duration:.2,checkpoints:[{at:.1,state:{x:2}}]}]}};
 const ts=reviewTimes(scene,{denseFps:6});assert.ok(ts.includes(1.1));assert.ok(ts.length>=24);assert.throws(()=>reviewTimes(scene,{denseFps:1000,maxSamples:100}),/presupuesto/);
});
test('enfasis conserva la duracion de la accion y las instancias reutilizan geometria',()=>{
 const s=K.createScene({id:'effects',duration:4});K.camera(s).emphasis(.5,2,{focus:[350,600],k:1.1});assert.ok(!s.render().script.includes('timeScale'));
 K.symbolInstances(s,{id:'dot',markup:'<circle r="2"/>',instances:Array.from({length:300},(_,i)=>({x:i,y:10}))});assert.equal((s.render().html.match(/<circle/g)||[]).length,1);assert.equal((s.render().html.match(/<use /g)||[]).length,300);
});
test('el reparto corporal conserva diseño y rechaza controles que no dibuja',()=>{
 const cast=K.createPuppetCast([{id:'hero',shirt:'#884422'}]);
 const first=K.createScene({id:'first',duration:3}),second=K.createScene({id:'second',duration:3});
 const a=cast.place(first,'hero'),b=cast.place(second,'hero',{poses:[K.seatedPose(0),K.standingPose(3)]});assert.deepEqual(a.config,b.config);
 assert.throws(()=>K.puppet(first,{id:'hero'}),/duplicada/);
 assert.throws(()=>K.puppet(second,{id:'other',poses:[{at:0,unknown:1},{at:3}]}),/desconocido/);
 const p=K.puppetPose({id:'x'},[{at:0,hip:[20,30]},{at:1,blink:1}],1);assert.deepEqual(p.hip,[20,30]);
});
test('9841 figuras no duplican su geometria en el JSON ni exceden su presupuesto',()=>{
 const s=K.createScene({id:'crowd',duration:6}),p=K.radialPopulation(s,{rings:8,branching:3});assert.equal(p.count,9841);
 const built=s.build({scriptExcerpt:''});assert.ok(built.customScene.script.length<10000);assert.ok(built.customScene.html.length<2000);
});
