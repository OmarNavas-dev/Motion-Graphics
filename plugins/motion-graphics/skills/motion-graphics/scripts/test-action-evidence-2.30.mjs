import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditRenderedActions} from './audit-rendered-actions-2.30.mjs';

const dirname=path.dirname(fileURLToPath(import.meta.url));
const baseline=process.argv[2] || path.resolve(dirname,'../assets/referencia-diagnostico-original.json');
const good=JSON.parse(fs.readFileSync(baseline,'utf8'));
const actual=auditRenderedActions(good);
assert.equal(actual.scenes.length,8,'El diagnóstico contiene ocho pruebas diferentes.');
assert.equal(actual.pass,true,'El benchmark de escenas vivas no debe ser bloqueado.');
assert(actual.scenes[0].physicalSelectors.includes('hammer'),'Martillo animado.');
assert(actual.scenes[0].physicalSelectors.includes('pile'),'Pilote con reacción.');
assert(actual.scenes[2].physicalSelectors.includes('pjr-move'),'Personaje camina.');
assert.equal(actual.scenes.filter(s=>s.hasParallaxLayers).length,7,
  'Siete de ocho escenas mueven capas independientes de profundidad.');

const shallow={
  creativeBrief:'LOOK: fondos panorámicos estratificados y profundidad 2.5D',
  scenes:Array.from({length:8},(_,i)=>({
    id:'demo-plano-'+i,duration:6,direction:{visualMode:'narrative'},
    customScene:{html:'<svg><path id="thing"/></svg>',
      script:"tl.to(S+' .thing',{x:30,duration:2},T0);"+
             "tl.to(S+' .camera',{scale:1.15,duration:3},T0);"},
  })),
};
const rejected=auditRenderedActions(shallow);
assert.equal(rejected.pass,false,'Debe rechazar una promesa de profundidad repetidamente plana.');
assert(rejected.issues.some(i=>i.code==='REFERENCE_DEPTH_MISMATCH'));
const noMotion=auditRenderedActions({
  scenes:[{id:'camara-sola',duration:6,direction:{visualMode:'mechanism'},
    customScene:{script:"tl.to(S+' .L-bg',{scale:1.2,duration:6},T0);"}}],
});
assert.equal(noMotion.pass,false,'Un mecanismo animado solo por cámara no puede pasar.');
console.log('2.30: benchmark de 8 escenas, falso parallax y cámara sola — OK');
