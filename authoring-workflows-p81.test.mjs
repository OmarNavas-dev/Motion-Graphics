import test from 'node:test';
import assert from 'node:assert/strict';
import {createBrandKit,createMotionBrief,createMotionPrompt} from './src/authoring-workflows-p81.mjs';
import {authorP81} from './plugins/motion-graphics/skills/motion-graphics/scripts/generate-authoring-p81.mjs';

const brand={name:'Sol Navas',description:'Animación educativa',audience:'Estudiantes',offer:'Videos originales',feeling:'Asombro',font:'Inter',
 colors:{background:'#102030',ink:'#ffffff',accent:'#f0bb20'},avoid:['Afirmaciones inventadas'],motionRules:['Entradas progresivas'],
 references:[1,2,3].map(n=>({source:'frame-'+n+'.png',observation:'Tipografía grande en el frame '+n,confidence:'observed'}))};
const idea={hero:'Un círculo',before:'pequeño',after:'grande',exactText:['ANTES','DESPUÉS'],size:'1080x1920',duration:8,
 numbers:[{label:'Meta de visualizaciones',value:500,kind:'target'}]};

test('P8.1 solicita datos no suministrados en vez de inventar una marca',()=>{
 const result=createBrandKit({name:'Marca'});
 assert.equal(result.ready,false);
 assert.match(result.questions.join(' '),/referencias|colores/i);
});
test('P8.1 entrega archivos de marca y conserva observaciones y restricciones',()=>{
 const kit=createBrandKit(brand);
 assert.equal(kit.ready,true);
 assert.deepEqual(Object.keys(kit.files),['brand.md','MOTION.md','CLAUDE.md']);
 assert.match(kit.files['MOTION.md'],/frame-3.png/);
 assert.match(kit.files['brand.md'],/#102030/);
 assert.match(kit.files['CLAUDE.md'],/MOTION.md/);
});
test('P8.1 diferencia objetivos de resultados reales y temporiza cuatro fases',()=>{
 const brief=createMotionBrief({brand,idea});
 assert.equal(brief.ready,true);
 assert.equal(brief.states.length,4);
 assert.equal(brief.states[3].end,idea.duration);
 assert.match(brief.buildPrompt,/500 \[target\]/);
 assert.match(brief.buildPrompt,/1080 x 1920/);
 assert.deepEqual(authorP81('motion-brief-writer',{brand,idea}),brief);
});
test('P8.1 escribe prompt de ocho secciones, con originalidad separada',()=>{
 const result=createMotionPrompt({brand,idea});
 assert.equal(result.ready,true);
 assert.equal(result.sections.length,9);
 assert.equal(result.sections[8][0],'Originality');
 assert.match(result.prompt,/Before you finish/);
 assert.deepEqual(authorP81('motion-prompt-writer',{brand,idea}),result);
});
test('P8.1 bloquea tamaños, textos, duración y cifras inválidas',()=>{
 const result=createMotionPrompt({brand,idea:{...idea,size:'640x480',numbers:[{label:'Inventado',value:100,kind:'result'}]}});
 assert.equal(result.ready,false);
 assert.ok(result.questions.length>=2);
});
