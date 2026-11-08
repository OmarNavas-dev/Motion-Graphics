import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCreativeDirection,validateExplainerOutline} from '../scripts/creative-direction.mjs';
import {EFFECTS,effectTimeline,validateEffectUsage} from '../scripts/effect-recipes.mjs';
import {auditVisualLayout} from '../scripts/visual-audit.mjs';
import {validateCreativeBundle} from '../scripts/validate-creative.mjs';

const direction={topic:'volcanes',audience:'público general',visualThesis:'La presión rompe la corteza',narrativePromise:'mostrar por qué ocurre una erupción',
 look:{background:'#102030',foreground:'#FFFFFF',accent:'#FF8800',typography:'sans condensada',materials:'roca porosa',light:'volumétrica lateral'},
 moves:{pace:'cortes cuando cambia la causa',transitions:'continuidad de objeto',camera:'acercamiento sobre cámara magmática',easing:'s-curve'},
 references:[{role:'MOVES',source:'video propio',observation:'corte con match de objeto',confidence:'observed'}],
 motionRules:{must:['continuidad de foco'],avoid:['loop no motivado']}};
const outline={duration:4,shots:[{start:0,end:4,claim:'la presión aumenta',visualProof:'roca se fractura',action:'la grieta se abre',camera:'empuje',bridgeToNext:'la lava sale',layers:['fondo','roca','grieta'],beats:[{time:1,event:'se acumula presión'}]}]};

test('brief válido y referencia LOOK/MOVES discriminada',()=>{
 assert.deepEqual(validateCreativeDirection(direction),[]);
 assert.ok(validateCreativeDirection({...direction,references:[{...direction.references[0],role:'BAD'}]}).length);
});
test('plan explicativo enlaza acción y evidencia',()=>{
 assert.deepEqual(validateExplainerOutline(outline),[]);
 assert.ok(validateExplainerOutline({...outline,shots:[{...outline.shots[0],layers:['única']}]}).length);
});
test('biblioteca de 16 familias y fases temporales coherentes',()=>{
 assert.equal(EFFECTS.length,16);
 assert.equal(new Set(EFFECTS.map(e=>e.id)).size,16);
 for(const e of EFFECTS){const t=effectTimeline(e.id,4);assert.equal(t.phases[0].start,0);assert.equal(t.phases.at(-1).end,4);}
 assert.deepEqual(validateEffectUsage([{id:'chart-morph',start:0,end:2,subjectId:'bars',fromState:'a',toState:'b',evidence:'datos visibles'}]),[]);
});
test('auditoría detecta recortes, poco contraste y colisión',()=>{
 const issues=auditVisualLayout({elements:[
 {id:'title',kind:'text',bounds:{x:1,y:1,width:200,height:30},fontSize:13,contrastRatio:2},
 {id:'tag',kind:'text',bounds:{x:30,y:4,width:200,height:30},fontSize:32},
 {id:'out',kind:'object',bounds:{x:700,y:40,width:50,height:40}}]});
 for(const code of ['SMALL_TEXT','LOW_CONTRAST','TEXT_COLLISION','OUT_OF_FRAME'])assert.ok(issues.some(x=>x.code===code));
});
test('bundle integrado acepta pipeline sin efectos',()=>assert.deepEqual(validateCreativeBundle({direction,outline,effects:[]}),[]));
