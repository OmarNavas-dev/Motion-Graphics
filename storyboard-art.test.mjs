import assert from 'node:assert/strict';
import test from 'node:test';
import {compileStoryboard} from './scripts/compile-storyboard.mjs';
import {validateProject} from './server-utils.mjs';
import {renderAuthored} from './src/authored-renderer.mjs';
import {exportHyperframesProject} from './src/hyperframes-bridge.mjs';
import {auditExplainerCraft} from './plugins/motion-graphics/skills/motion-graphics/scripts/audit-explainer-craft-v4.mjs';

const piece = (id, options={}) => ({
  id, width:40, height:20, viewBox:[0,0,100,50],
  paths:[{d:'M0 0H100V50H0Z',fill:'#bb8656'}], ...options,
});
const plan = (parts, actions, id='caja') => ({
  schema:'motion-studio.storyboard/v3', duration:4, source:{narration:'Guion de prueba'},
  styleBible:{materials:'Capas con luz lateral',cameraGrammar:'Plano fijo',identity:'Piezas estables'},
  scenes:[{id,start:0,end:4,visualMode:'mechanism',actors:[id],props:[],
    incoming:'La pieza se encuentra abajo.',outgoing:'La pieza queda visible.',
    art:{background:'#171822',parts}}],
  shots:[{id:'detalle',sceneId:id,start:0,end:4,framing:'detalle',
    visualPurpose:'Seguir la salida de la pieza por la abertura central',
    camera:{motion:'fija',reason:'Conservar la silueta',target:'.ms-part-'+actions[0].id},
    raccord:'La posición inicial conserva el eje central.',
    phases:actions.map(({id,start,end})=>({kind:'cause',start,end,
      selector:'.ms-part-'+id,change:'La pieza cambia de posición.'}))}],
});

test('the box preserves occlusion order, pivot, initial pose and proportional motion', () => {
  const storyboard=plan([
    piece('interior'),
    piece('producto',{pivot:{x:45,y:80},keys:[{at:0,y:12},{at:2,y:-20},{at:4,y:12}]}),
    piece('frente'),
    piece('solapa'),
  ],[{id:'producto',start:0,end:2}]);
  const project=validateProject(compileStoryboard(storyboard,'El producto sale por el centro.'));
  const {authored,approved}=project.scenes[0];
  assert.equal(approved,false);
  assert.deepEqual(authored.layers.map(layer=>layer.id),['interior','producto','frente','solapa']);
  const html=renderAuthored(authored,{width:720,height:1280,time:0,duration:4});
  assert.match(html,/ms-part-producto[^>]*transform-origin:45% 80%;[^>]*translate\(0px,153\.6[0-9]*px\)/);
  assert.ok(html.indexOf('ms-part-interior')<html.indexOf('ms-part-producto'));
  assert.ok(html.indexOf('ms-part-producto')<html.indexOf('ms-part-frente'));
  const end=renderAuthored(authored,{width:1080,height:1920,time:2,duration:4});
  assert.match(end,/ms-part-producto[^>]*translate\(0px,-384px\)/);
  assert.equal(auditExplainerCraft(project,{storyboard}).pass,true);
  const exported=exportHyperframesProject(project);
  assert.match(exported,/class="ms-part-producto"/);
  assert.match(exported,/renderAuthored\(/);
});

test('a fish has a hinged tail, an occluding surface and a separate coin', () => {
  const storyboard=plan([
    {id:'pez',group:true,width:40,height:16,keys:[{at:1,y:15},{at:3,y:-15}]},
    piece('cuerpo',{parent:'pez',width:75,height:90}),
    piece('cola',{parent:'pez',x:10,pivot:{x:90,y:50},keys:[{at:1,rotate:25},{at:2,rotate:-25}]}),
    piece('superficie',{opacity:.65}),
    piece('moneda',{keys:[{at:0,opacity:0},{at:3,opacity:0},{at:4,opacity:1}]}),
  ],[{id:'cuerpo',start:1,end:3},{id:'moneda',start:3,end:4}],'lago');
  const {scenes:[{authored}]}=compileStoryboard(storyboard,'El pez trae una moneda.');
  assert.equal(authored.layers.find(layer=>layer.id==='cola').parent,'pez');
  assert.equal(authored.layers.find(layer=>layer.id==='cola').ax,90);
  const html=renderAuthored(authored,{time:2,duration:4});
  assert.ok(html.indexOf('ms-part-pez')<html.indexOf('ms-part-cola'));
  assert.ok(html.indexOf('ms-part-cola')<html.indexOf('ms-part-superficie'));
  assert.match(html,/ms-part-moneda[^>]*opacity:0;/);
});

test('invalid art and phases fail before import', () => {
  const storyboard=plan([
    piece('interior'),
    piece('producto',{keys:[{at:1,y:-20}]}),
  ],[{id:'producto',start:0,end:1}]);
  const compile=()=>compileStoryboard(storyboard,'El producto sale por el centro.');
  storyboard.shots[0].phases[0].selector='.ms-part-otro';
  assert.throws(compile,/falta en las capas/);
  storyboard.shots[0].phases[0].selector='.ms-part-producto';
  storyboard.shots[0].phases[0].start=2;
  storyboard.shots[0].phases[0].end=3;
  assert.throws(compile,/no cambia durante la fase/);
  storyboard.scenes[0].art.parts[1].parent='interior';
  assert.throws(compile,/padre debe ser un grupo/);
  delete storyboard.scenes[0].art.parts[1].parent;
  storyboard.scenes[0].art.parts[1].paths[0].d='M0 0"><script>';
  assert.throws(compile,/Trazado SVG inválido/);
});
