import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hingedPanelAt} from '../scripts/kits/contact-kit.mjs';
import {createExplainer} from '../scripts/explainer-kit.mjs';
import {buildInventorsScene} from '../examples/inventores-sellado.mjs';
import {validateProject} from '../scripts/compat/server-utils.mjs';

test('el panel abre sin separar la bisagra de la caja',()=>{
 const g={a:[56,691],b:[344,649],freeA:[368,744],freeB:[656,697]};
 for(let angle=0;angle<=75;angle++){
  const [a,b,c,d]=hingedPanelAt({...g,angle});
  assert.deepEqual(a,g.a);assert.deepEqual(b,g.b);
  assert.ok([...c,...d].every(Number.isFinite));
 }
 assert.deepEqual(hingedPanelAt({...g,angle:0}),[g.a,g.b,g.freeB,g.freeA]);
 assert.throws(()=>hingedPanelAt({...g,angle:NaN}),/Invalid/);
});
test('el ejemplo de sellado incluye reparto, agarre, retirada y mordaza ejecutables',()=>{
 const {record,actors}=buildInventorsScene();
 const p=validateProject({actors,showText:false,scenes:[record]});
 assert.equal(p.actors.length,3);
 for(const id of ['fielding','chavannes'])assert.ok(record.customScene.html.includes('data-character-id="'+id+'"'));
 assert.ok(record.customScene.html.includes('placed-films'));
 assert.ok(record.customScene.script.includes('characterPoseAt'));
 assert.ok(record.customScene.script.includes('tl.set(S+" .heat-jaw",{"y":0},T0)'));
 assert.ok(record.direction.actions.some(a=>a.id==='place-and-release'));
 assert.throws(()=>buildInventorsScene({duration:3}),/redesign/);
});
test('los estados iniciales son por propiedad y no dependen del orden de autoría',()=>{
 const p=createExplainer([{id:'block'}]);
 const s=p.scene({id:'initial-state',duration:5},{objective:'No saltar antes de una acción.'});
 s.add('fg','<rect class="block" width="40" height="40"/>');
 const action=(id,at,from,to)=>s.action({id,actor:'block',at,duration:.5,description:'Move',result:'Moved',selector:'.block'},{from,to});
 action('later',3,{x:70,opacity:.4},{x:100,opacity:1});
 action('earlier',1,{x:0},{x:70});
 const a=s.build({scriptExcerpt:''}),b=s.build({scriptExcerpt:''});
 assert.equal(a.customScene.script,b.customScene.script);
 assert.ok(a.customScene.script.startsWith('tl.set(S+" .block",{"x":0,"opacity":0.4},T0);'));
});
