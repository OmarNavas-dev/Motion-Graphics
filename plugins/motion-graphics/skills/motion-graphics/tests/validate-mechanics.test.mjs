import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMechanics} from '../scripts/validate-mechanics.mjs';

test('una bisagra con punto y soporte tiene causalidad válida',()=>{
 const r=validateMechanics({actions:[{id:'a',kind:'hinge',start:0,end:2,actor:'puerta',
  cause:'mano empuja',visibleResult:'se abre',anchor:'bisagra superior',support:'marco',
  startState:'0 grados',endState:'80 grados',contactAt:'mano a 0.3s'}]});
 assert.equal(r.ok,true);assert.deepEqual(r.warnings,[]);
});

test('rechaza un mecanismo sin soporte y alerta cuando un simple translate pretende deformar',()=>{
 const r=validateMechanics({actions:[{id:'a',kind:'flow',start:0,end:1,actor:'sangre',cause:'presión',
  visibleResult:'circula',startState:'vaso A',endState:'vaso B'},
  {id:'b',kind:'translate',start:1,end:2,actor:'corazón',cause:'latido',visibleResult:'se contrae',
  startState:'relajado',endState:'contraído'}]});
 assert.equal(r.ok,false);assert.ok(r.errors.some(e=>/ancla/.test(e)));
 assert.ok(r.warnings.some(e=>/traslación/.test(e)));
});
