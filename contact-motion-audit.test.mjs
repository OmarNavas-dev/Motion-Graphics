import test from 'node:test';import assert from 'node:assert/strict';
import {inspectContactSamples} from './src/contact-motion-audit.mjs';
test('detecta deslizamiento de pie marcado como plantado',()=>{
 const r=inspectContactSamples([{scene:'walk',time:0,feet:[{id:'left',x:10,y:10,contact:'planted'}]},{scene:'walk',time:.1,feet:[{id:'left',x:30,y:10,contact:'planted'}]}]);
 assert.equal(r.plantedPairs,1);assert.equal(r.findings[0].code,'FOOT_SLIDE');
});
test('sin anclas la evaluación no se declara aprobada',()=>assert.equal(inspectContactSamples([{time:0,feet:[]}]).measured,false));
test('pie en vuelo no se diagnostica como resbalón',()=>assert.equal(inspectContactSamples([{scene:'a',time:0,feet:[{id:'x',x:0,y:0,contact:'air'}]},{scene:'a',time:.1,feet:[{id:'x',x:40,y:0,contact:'air'}]}]).findings.length,0));
