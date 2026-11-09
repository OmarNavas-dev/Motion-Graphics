import test from 'node:test';
import assert from 'node:assert/strict';
import {SPECIALIZED_FLOW_IDS,getSpecializedFlow,generateSpecializedProject,
  verifySpecializedInputs} from './src/specialized-workflows.mjs';
import {generateWorkflowProject} from './plugins/motion-graphics/skills/motion-graphics/scripts/generate-specialized-project.mjs';
import {validateProject} from './server-utils.mjs';
import {validateProject as validateInPlugin} from './plugins/motion-graphics/skills/motion-graphics/scripts/compat/server-utils.mjs';
import {renderAuthored} from './src/authored-renderer.mjs';
import {collectProjectAssets} from './src/project-assets.mjs';

test('P4: catálogo de 12 flujos renderizables con guías y galería',()=>{
 assert.equal(SPECIALIZED_FLOW_IDS.length,12);
 assert.equal(new Set(SPECIALIZED_FLOW_IDS).size,12);
 const project=generateWorkflowProject({workflow:'all',demo:true,duration:2});
 assert.equal(project.scenes.length,12);
 assert.deepEqual(project.scenes.map(s=>s.authored.workflowRules.id),SPECIALIZED_FLOW_IDS);
 assert.equal(project.soundDesign.enabled,true);
 assert.equal(project.soundDesign.cues.length,24);
 assert.deepEqual(validateProject(project),project);
});

for(const id of SPECIALIZED_FLOW_IDS)test('P4: '+id+' produce escenas ejecutables y contrato compartido',()=>{
 const meta=getSpecializedFlow(id);
 const raw=generateSpecializedProject({workflow:id,demo:true,duration:Math.max(meta.beats.length,6)});
 const expected=validateProject(raw),actual=validateInPlugin(raw);
 assert.deepEqual(actual,expected);
 assert.equal(expected.workflow.id,id);
 assert.equal(expected.workflow.demo,true);
 assert.equal(expected.scenes.length,meta.beats.length);
 assert.ok(expected.scenes.every(s=>s.approved===false&&s.authored.layers.length>=5));
 for(const s of expected.scenes){
   assert.ok(s.authored.source.startsWith('workflow-p4/'+id+'/'));
   assert.equal(s.authored.workflowRules.sourceGuide,meta.sourceGuide);
   assert.equal(s.authored.layers.filter(layer=>layer.type==='text'&&layer.id.startsWith('p3-')).length,0,
     'P4 no debe superponer titulares de ejemplo de P3 sobre textos propios');
   const frames=[0.3,s.duration*.77].map(time=>renderAuthored(s.authored,{time,
     duration:s.duration,width:1280,height:720,showText:true}));
   assert.ok(frames.every(html=>html.includes('ms-authored-stage')));
   assert.notEqual(frames[0],frames[1]);
 }
 assert.deepEqual(generateWorkflowProject({workflow:id,demo:true,
   duration:Math.max(meta.beats.length,6)}),expected);
});

test('P4: números, newsletter, comparativas y documental prohíben datos inventados',()=>{
 for(const [id,data] of [
   ['animated-chart',{values:[{label:'A',value:2},{label:'B',value:3}]}],
   ['milestone-reveal',{number:'500',label:'Seguidores'}],
   ['model-showdown',{models:['A','B','C'],brief:'mismo brief'}],
   ['newsletter-promo',{newsletter:'A',hook:'B',url:'C',proofs:['1','2']}],
   ['vox-explainer',{hook:'Por qué',facts:[{text:'A',source:'link'}]}],
   ['launch-video',{product:'Algo',message:'Aviso',cta:'Ver más'}],
   ['loop-cover',{}],
 ])assert.throws(()=>verifySpecializedInputs(id,data,false),/P4:/,id);
 assert.doesNotThrow(()=>verifySpecializedInputs('animated-chart',{
   values:[{label:'A',value:2},{label:'B',value:3}],illustrative:true}));
 assert.doesNotThrow(()=>verifySpecializedInputs('milestone-reveal',{
   number:'12,431',label:'Seguidores',source:'captura original'}));
});

test('P4: modelo real conserva y valida los tres MP4 locales',()=>{
 const videos=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',
   '33333333-3333-4333-8333-333333333333'].map(s=>'user-assets/'+s+'.mp4');
 const raw=generateSpecializedProject({workflow:'model-showdown',demo:false,compact:true,duration:2,
   data:{models:['Modelo A','Modelo B','Modelo C'],brief:'mismo prompt',videos}});
 const project=validateProject(raw);
 assert.deepEqual(project.workflow.media,videos);
 assert.deepEqual(collectProjectAssets(project),videos);
 assert.deepEqual(validateProject(project),project);
 assert.throws(()=>validateProject({...raw,workflow:{...raw.workflow,media:['../secreto.mp4']}}));
});

test('P4: rótulos y comparativa mantienen zonas seguras',()=>{
 const showdown=generateSpecializedProject({workflow:'model-showdown',demo:true,compact:true,duration:2}).scenes[0].authored.layers;
 assert.equal(showdown.filter(l=>l.type==='shape'&&l.fill==='#1A2130').length,3);
 assert.ok(showdown.filter(l=>l.type==='shape'&&l.fill==='#1A2130')
   .every(l=>l.height<=34&&l.y>=50));
 const top=showdown.find(l=>l.type==='text'&&l.text==='UNA IDEA');
 assert.ok(top&&top.height<=5&&top.y<=15);
 const defaultFlow=generateSpecializedProject({workflow:'explainer-default',demo:true,compact:true,duration:2});
 assert.ok(defaultFlow.scenes[0].authored.layers.some(l=>l.type==='text'&&l.text==='Crear'&&l.y>=35));
});

test('P4: el contrato conserva fuentes por hecho y brief de comparativa',()=>{
 const vox=generateWorkflowProject({workflow:'vox-explainer',demo:false,duration:10,
   data:{hook:'¿Por qué?',facts:[{text:'Hecho A',source:'https://example.org/a'},
     {text:'Hecho B',source:'https://example.org/b'}]}});
 assert.deepEqual(vox.workflow.sources,[{claim:'Hecho A',source:'https://example.org/a'},
   {claim:'Hecho B',source:'https://example.org/b'}]);
 assert.deepEqual(validateInPlugin(vox),vox);
});

test('P4: los bucles mantienen cámara fija y usan tiempo determinista',()=>{
 for(const id of ['loop-cover','milestone-reveal','animated-chart']){
   const project=generateWorkflowProject({workflow:id,demo:true,duration:9}),scene=project.scenes[0];
   assert.equal(project.loop,true);
   assert.equal(scene.authored.camera.from.zoom,scene.authored.camera.to.zoom);
   const html=renderAuthored(scene.authored,{time:3.25,duration:9,width:1280,height:720});
   assert.equal(html,renderAuthored(scene.authored,{time:3.25,duration:9,width:1280,height:720}));
 }
});
