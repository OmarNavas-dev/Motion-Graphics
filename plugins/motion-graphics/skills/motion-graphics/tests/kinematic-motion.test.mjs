import test from 'node:test';
import assert from 'node:assert/strict';
import {twoBoneIK,gait2D,inspectGait,reachToObject} from '../scripts/kinematic-motion.mjs';

test('IK alcanza objetivo y conserva las dos longitudes',()=>{
 const p=twoBoneIK({x:0,y:0},{x:30,y:40},35,40);
 assert.ok(p.reached);assert.ok(p.error<1e-6);
 assert.ok(Math.abs(Math.hypot(p.joint.x,p.joint.y)-35)<1e-6);
 assert.ok(Math.abs(Math.hypot(p.end.x-p.joint.x,p.end.y-p.joint.y)-40)<1e-6);
});
test('IK limita un objetivo imposible sin inventar extensión infinita',()=>{
 const p=twoBoneIK({x:0,y:0},{x:400,y:0},35,40);
 assert.ok(!p.reached);assert.ok(p.error>300);
 assert.throws(()=>twoBoneIK({x:0,y:0},{x:2,y:0},-10,20));
});
test('marcha alterna apoyos y cada pie conserva su posición durante apoyo',()=>{
 const gait=gait2D({startX:180,groundY:800,stepLength:40,stepTime:.5,hipHeight:80,lift:15});
 const audit=inspectGait(gait,{end:2,fps:60,maxSlip:.001});
 assert.deepEqual(audit.issues.filter(i=>i.type==='contact-slip'),[]);
 for(const time of [.1,.4,.6,.9,1.2]){
  const p=gait(time);assert.equal(p.contacts[p.swingSide],false);
  assert.equal(p.feet[p.swingSide==='left'?'right':'left'].y,800);
 }
});
test('mano con contacto en herramienta conserva ancla',()=>{
 const p=reachToObject({shoulder:{x:0,y:0},target:{x:50,y:45},upperArm:55,forearm:35,handOffset:{x:5,y:0}});
 assert.ok(p.contactError<1e-6);
 assert.ok(Math.hypot(p.hand.x-50,p.hand.y-45)<1e-6);
});
