import test from 'node:test';
import assert from 'node:assert/strict';
import {STYLE_PRESET_IDS} from './src/motion-capabilities.mjs';
import {getExecutableStyle,listExecutableStyles,createStyleComposition} from './src/style-recipes.mjs';
import {renderAuthored} from './src/authored-renderer.mjs';
import {validateProject} from './server-utils.mjs';
import {validateProject as pluginValidate} from './plugins/motion-graphics/skills/motion-graphics/scripts/compat/server-utils.mjs';
import {generateStyleProject} from './plugins/motion-graphics/skills/motion-graphics/scripts/generate-style-project.mjs';

const raw=(id)=>({name:'Prueba P3',format:'horizontal',stylePreset:id,showText:true,
 scenes:[{id:'demo',duration:3,title:'Diseño en movimiento',cues:[]}]});

test('P3: catálogo exacto de 21 recetas ejecutables y generador de galería',()=>{
 const defs=listExecutableStyles();
 assert.deepEqual(defs.map(x=>x.id),STYLE_PRESET_IDS);
 assert.equal(new Set(defs.map(x=>x.signature)).size,21);
 const gallery=generateStyleProject({style:'all',duration:1.5});
 assert.equal(gallery.scenes.length,21);
 assert.ok(gallery.scenes.every(x=>x.authored?.layers.length>=6 && x.approved===false));
 assert.throws(()=>getExecutableStyle('../../etc/passwd'));
});

for(const id of STYLE_PRESET_IDS)test('P3: '+id+' tiene composición, movimiento y contrato idéntico',()=>{
 const input=raw(id),a=validateProject(input),b=pluginValidate(input);
 assert.deepEqual(a,b);
 const scene=a.scenes[0],spec=scene.authored,profile=getExecutableStyle(id);
 assert.equal(spec.source,'style-preset/'+id);
 assert.equal(spec.styleRules.signature,profile.signature);
 assert.ok(spec.layers.length>=6 && spec.layers.length<=500);
 assert.equal(new Set(spec.layers.map(x=>x.id)).size,spec.layers.length);
 assert.ok(spec.layers.some(x=>x.enter?.at>0));
 assert.ok(spec.layers.some(x=>x.keyframes?.length||x.idle?.kind));
 const htmlA=renderAuthored(spec,{time:.25,duration:3,width:1280,height:720,showText:true});
 const htmlB=renderAuthored(spec,{time:2.5,duration:3,width:1280,height:720,showText:true});
 assert.ok(htmlA.includes('ms-authored-stage')&&htmlB.includes('ms-authored-stage'));
 assert.notEqual(htmlA,htmlB,'La escena debe evolucionar con el tiempo.');
 assert.equal(createStyleComposition(id,{duration:3}).styleRules.id,id);
});

test('P3: conserva arte propio; cambia receta anterior al seleccionar otro estilo',()=>{
 const p=raw('blueprint');p.scenes[0].authored={layers:[{id:'manual',type:'shape',x:50,y:50,width:30,height:30,fill:'#112233'}]};
 const imported=validateProject(p);
 assert.deepEqual(imported.scenes[0].authored,p.scenes[0].authored);
 const original=validateProject(raw('blueprint'));
 original.scenes[0].stylePreset='poster-pop';
 const switched=validateProject(original);
 assert.equal(switched.scenes[0].authored.source,'style-preset/poster-pop');
});

test('P3: marca prevalece sobre colores del estilo y no introduce texto en recetas mudas',()=>{
 const brandProfile={name:'Marca',colors:{background:'#243244',accent:'#EFAB23',ink:'#FFFFFF'},
   typography:'Inter',motionRules:[],avoid:[],narrativePromise:''};
 const input={...raw('weather-widget'),brandProfile};
 const p=validateProject(input);
 assert.equal(p.scenes[0].authored.background.color,'#243244');
 assert.ok(p.scenes[0].authored.layers.some(x=>x.fill==='#EFAB23'));
 for(const id of ['paper-world','ink-line','particle-field','growing-city','paper-cut']){
   const spec=createStyleComposition(id,{duration:3});
   assert.equal(spec.layers.filter(l=>l.type==='text').length,0,id+' sin rótulos');
 }
});
