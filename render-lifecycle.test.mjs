import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectCaptureTimes} from './scripts/review-explainer.mjs';
import {closeRenderBrowser} from './scripts/render-browser.mjs';

test('el presupuesto de capturas incluye también las últimas escenas',()=>{
 for(const count of [1,16,40,80]){
  let total=0;
  for(let index=0;index<count;index++){
   const budget=Math.floor(80/count)+(index<80%count?1:0);
   const picked=selectCaptureTimes(new Set([0,.5,1,1.5,2,2.5,2.999]),3,budget,[{at:.5,duration:1}]);
   assert.ok(picked.size>0);assert.ok(picked.size<=budget);
   if(budget>=3){assert.ok(picked.has(0));assert.ok(picked.has(1.5));assert.ok(picked.has(2.999));}
   total+=picked.size;
  }
  assert.ok(total<=80);
 }
});
test('el cierre libera el proceso privado incluso si el transporte ya terminó',async()=>{
 let disconnected=0,unreferenced=0;
 const process={exitCode:0,unref(){unreferenced++;}};
 await closeRenderBrowser({process:()=>process,async close(){throw Error('transport closed');},async disconnect(){disconnected++;}});
 assert.equal(disconnected,1);assert.equal(unreferenced,1);
 const signalled={exitCode:null,signalCode:'SIGKILL',unref(){}};
 await closeRenderBrowser({process:()=>signalled,async close(){throw Error('transport closed');},async disconnect(){}});
 await assert.rejects(closeRenderBrowser({}),/privado/);
});
