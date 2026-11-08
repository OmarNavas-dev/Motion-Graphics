import {test} from 'node:test';
import assert from 'node:assert/strict';
import {addCaptions} from '../scripts/add-captions.mjs';
import {repairLegacyCaptionScript} from '../scripts/compat/src/caption-compat.mjs';

test('corte con remanente de diez milisegundos conserva el reloj sin posiciones negativas',()=>{
 const words=[{text:'caja.',start:.8,end:1.01},{text:'Lo',start:1.01,end:1.6},{text:'que',start:1.6,end:1.8}];
 const p=addCaptions({scenes:[1,2].map(i=>({id:'s'+i,duration:1,customScene:{html:'<svg></svg>',css:'',script:''}}))},{words,duration:2});
 const script=p.scenes[1].customScene.script;
 const data=JSON.parse(script.match(/const groups=([^;]+);/)[1]);
 assert.equal(data[0].hide,0);
 assert.ok(data.every(g=>g.hide>=0));
 assert.deepEqual(p.wordTimings.map(w=>[w.start,w.end]),words.map(w=>[w.start,w.end]));
 assert.ok(script.includes('Math.max(0,g.hide-a)'));
});
test('el bloque legado se normaliza idempotentemente y conserva acciones ajenas',()=>{
 const p=addCaptions({scenes:[{id:'s',duration:1,customScene:{html:'<svg></svg>',css:'',script:''}}]},{words:[{text:'caja.',start:0,end:.01},{text:'Lo',start:.01,end:.6}],duration:1});
 const legacy=p.scenes[0].customScene.script.replace('"hide":0','"hide":-0.01').replaceAll('Math.min(.14,Math.max(0,g.hide-a))','Math.min(.14,g.hide-a)');
 const fixed=repairLegacyCaptionScript(legacy);
 assert.notEqual(fixed,legacy);
 assert.equal(fixed,p.scenes[0].customScene.script);
 assert.equal(repairLegacyCaptionScript(fixed),fixed);
 const other='tl.to(".required-object",{duration:1,x:20},0);';
 assert.equal(repairLegacyCaptionScript(other),other);
});
