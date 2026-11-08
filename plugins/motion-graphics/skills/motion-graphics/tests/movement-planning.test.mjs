import test from 'node:test';
import assert from 'node:assert/strict';
import {walkPoses,risePoses,puppetPose,puppet} from '../scripts/kits/puppet-kit.mjs';
import {createScene} from '../scripts/kits/scene-kit.mjs';
import {validateShotPlan} from '../scripts/validate-shot-plan.mjs';

test('marcha de dos ciclos: alterna pies anclados sin deslizamiento durante cada apoyo',()=>{
 const poses=walkPoses({duration:4,travel:120,cycles:2,stride:55});
 assert.equal(poses[0].at,0);assert.equal(poses.at(-1).at,4);
 const world=(p,side)=>p.hip[0]+p[side+'Foot'][0];
 for(let step=0;step<4;step++){
  const planted=step%2===0?'left':'right';
  const xs=poses.filter(p=>p.at>=step&&p.at<=step+1).map(p=>world(p,planted));
  assert.ok(Math.max(...xs)-Math.min(...xs)<1e-7,`desliza ${planted} en paso ${step}`);
 }
 const s=createScene({id:'gait',duration:4});assert.doesNotThrow(()=>puppet(s,{id:'actor',poses}));
});

test('levantarse: ambas plantas permanecen en posición fija y las piernas alcanzan',()=>{
 const poses=risePoses({duration:3,seatDrop:80});
 for(const side of ['left','right']){
  const ys=poses.map(p=>p.hip[1]+p[side+'Foot'][1]);
  assert.ok(ys.every(y=>Math.abs(y-167)<1e-8));
 }
 const s=createScene({id:'rise',duration:3});assert.doesNotThrow(()=>puppet(s,{id:'actor',poses}));
});

test('Hermite conserva velocidad en una clave intermedia, a diferencia del smooth histórico',()=>{
 const poses=[{at:0,hip:[0,0]},{at:1,hip:[40,0]},{at:2,hip:[80,0]}];
 const v=(config,t)=>puppetPose({id:'a',...config},poses,t).hip[0];
 const h=.0001,vl=(v({},1)-v({},1-h))/h,vr=(v({},1+h)-v({},1))/h;
 assert.ok(Math.abs(vl-vr)<.05);assert.ok(vl>25);
 assert.ok((v({interpolation:'smooth'},1)-v({interpolation:'smooth'},1-h))/h<.1);
});

test('valida plan de dos planos y detecta salto no justificado',()=>{
 const scene=(id,start,end,next)=>({id,start,end,narration:'silencio deliberado',visualGoal:'Acción visible',location:'habitación',lighting:'luz suave',entryFrame:'plano medio',exitFrame:'plano medio',camera:{shot:'medio',from:'frontal',to:'tres cuartos',movement:'panorámica'},action:{anticipation:'se prepara',main:'camina',contact:'pie en suelo',recovery:'se detiene'},actors:[{id:'hero',startState:'de pie',endState:'de pie'}],props:[],transition:{type:'corte',to:next,continuity:'mismo eje'}});
 const plan={duration:8,scenes:[scene('a',0,4,'b'),scene('b',4,8,null)]};
 assert.deepEqual(validateShotPlan(plan),[]);
 plan.scenes[1].actors[0].startState='sentado';
 assert.ok(validateShotPlan(plan).some(e=>e.includes('cambia de estado')));
});
