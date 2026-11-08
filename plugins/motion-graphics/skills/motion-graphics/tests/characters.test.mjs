import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {solveArm,renderAdult,addAdult,animateAdult,createCharacterCast,characterPoseAt} from '../scripts/kits/character-kit.mjs';
import {createScene} from '../scripts/kits/scene-kit.mjs';
import {inventorArt,project,poses,characters} from '../examples/atelier-personajes.mjs';
import {validateProject} from '../scripts/compat/server-utils.mjs';

test('la cadena mantiene longitud y rechaza objetivos inalcanzables',()=>{
 for(let i=0;i<=100;i++){
  const wrist=[88+32*Math.sin(i*.02),-10-80*Math.sin(i*.02)],s=[56,-136];
  const a=solveArm(s,wrist,74,70,-1);
  assert.ok(Math.abs(Math.hypot(a.elbow[0]-s[0],a.elbow[1]-s[1])-74)<1e-8);
  assert.ok(Math.abs(Math.hypot(a.elbow[0]-wrist[0],a.elbow[1]-wrist[1])-70)<1e-8);
 }
 assert.throws(()=>solveArm([0,0],[900,900]),/Unreachable/);
 assert.throws(()=>solveArm([0,0],[NaN,0]),/Invalid/);
});
test('siluetas, manos y objeto compartido sobreviven a todas las poses',()=>{
 for(let i=0;i<=180;i++){
  const svg=inventorArt(i/30);
  assert.doesNotMatch(svg,/NaN|Infinity|undefined/);
  assert.equal((svg.match(/data-character-hand=/g)||[]).length,4);
  assert.equal((svg.match(/data-character-elbow=/g)||[]).length,4);
  assert.equal((svg.match(/data-character-held="right"/g)||[]).length,1);
 }
 assert.notEqual(renderAdult(characters[0]),renderAdult(characters[1]));
 assert.equal(validateProject(project).scenes[0].duration,6);
});
test('el reloj incrustado permite buscar poses sin historial ni imports',()=>{
 const s=createScene({id:'people-test',duration:6}),actor=addAdult(s,characters[0],poses[0]);
 animateAdult(s,actor,poses);
 const updates=[],target={innerHTML:''};
 const tl={fromTo(obj,from,to){updates.push({obj,to});}};
 runInNewContext(s.render().script,{document:{querySelector:()=>target},tl,S:'#s',T0:10,D:6});
 const update=updates[0];assert.equal(update.to.duration,6);
 update.obj.t=2;update.to.onUpdate();const first=target.innerHTML;
 update.obj.t=5;update.to.onUpdate();assert.notEqual(target.innerHTML,first);
 update.obj.t=2;update.to.onUpdate();assert.equal(target.innerHTML,first);
 assert.match(first,/data-character-held="right"/);
 assert.throws(()=>animateAdult(s,actor,[{at:0},{at:7}]),/wrist|clock/);
});
test('el reparto conserva el diseño y exige identidades únicas por escena',()=>{
 const cast=createCharacterCast([{...characters[0],name:'Inventor',initialState:'holds sample'}]);
 const s=createScene({id:'cast',duration:6});
 const actor=cast.place(s,'inventorA',poses[0]);
 assert.equal(cast.actors[0].id,actor.config.id);
 assert.equal(cast.actors[0].initialState,'holds sample');
 assert.ok(Object.isFrozen(actor.config));
 assert.throws(()=>cast.place(s,'inventorA',poses[0]),/Duplicate/);
 assert.throws(()=>cast.place(s,'missing',poses[0]),/not registered/);
 assert.throws(()=>createCharacterCast([characters[0],characters[0]]),/duplicate/);
});
test('soltar y agarrar cambia exactamente en la marca prevista',()=>{
 const source=[{at:0,left:[-88,-10],right:[88,-10],rightGrip:true,rightHeld:'<circle r="2"/>'},{at:1,left:[-88,-10],right:[88,-10],rightGrip:false}];
 assert.match(renderAdult(characters[0],characterPoseAt(source,.999)),/data-character-held/);
 assert.doesNotMatch(renderAdult(characters[0],characterPoseAt(source,1)),/data-character-held/);
});
