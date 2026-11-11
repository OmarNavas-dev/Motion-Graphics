import test from 'node:test';
import assert from 'node:assert/strict';
import {auditExplainerCraft} from '../scripts/audit-explainer-craft-v4.mjs';

const scene=(html,script='tl.to(S+" .object",{y:20},T0);')=>({id:'escena',duration:3,
 customScene:{html,script},direction:{shots:[{purpose:'mostrar extracción'}],actions:[{selector:'.object'}]},approved:false});
test('un elemento con selector y referencia SVG resuelta no provoca error',()=>{
 const p={scenes:[scene('<svg><defs><clipPath id="abertura"><rect width="10" height="10"/></clipPath></defs><g class="object" clip-path="url(#abertura)"/></svg>')]};
 const r=auditExplainerCraft(p,{storyboard:{}});
 assert.equal(r.pass,true);assert.equal(r.visualApproved,false);
});
test('bloquea clip roto y selector de acción inexistente',()=>{
 const p={scenes:[scene('<svg><g clip-path="url(#faltante)"/></svg>')]};
 const r=auditExplainerCraft(p,{storyboard:{}});
 assert.equal(r.pass,false);
 assert.ok(r.issues.some(i=>i.code==='UNRESOLVED_SVG_REFERENCE'));
 assert.ok(r.issues.some(i=>i.code==='ACTION_SELECTOR_MISSING'));
});
test('rechaza ID duplicado dentro de un SVG',()=>{
 const p={scenes:[scene('<svg><g id="a" class="object"/><g id="a"/></svg>')]};
 assert.ok(auditExplainerCraft(p).issues.some(i=>i.code==='DUPLICATE_SVG_ID'));
});
