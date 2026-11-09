import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStudio29,STYLE_IDS} from '../scripts/validate-2-9-contract.mjs';
test('21 estilo válidos, cue de audio y perfil se preservan',()=>{
 assert.equal(STYLE_IDS.length,21);
 const project={stylePreset:'blueprint',brandProfile:{colors:{accent:'#ff8800'}},soundDesign:{enabled:true,cues:[{type:'impact',at:1,duration:.5,gain:.2}]},scenes:[{duration:3}]};
 assert.equal(validateStudio29(project).passed,true);
});
test('bloquea estilo desconocido, acción fuera de tiempo y selector inexistente',()=>{
 const scene={duration:3,customScene:{html:'<svg><g class="world"/></svg>'},direction:{actions:[{at:1,duration:4,selector:'.missing',motion:{from:{x:0},to:{x:5}}}]}};
 const result=validateStudio29({stylePreset:'anything',scenes:[scene]});
 assert.equal(result.passed,false);assert.ok(result.errors.length>=3);
});
test('no confunde comprobación de bucles con aprobado visual',()=>{
 const x=validateStudio29({loop:true,scenes:[{duration:2}]});
 assert.ok(x.warnings.some(w=>w.includes('Cierre visual')));
});
