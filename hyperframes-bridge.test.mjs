import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exportHyperframesProject, exportHyperframesScene} from './src/hyperframes-bridge.mjs';

test('las plantillas no dibujan marcas, numeros de escena ni pies de montaje', () => {
  const html = exportHyperframesProject({name:'MARCA_INTERNA', format:'vertical', showText:true,
    scenes:[{id:'a',title:'El agua sube',duration:3,scriptExcerpt:'El agua sube'}]}, undefined, '');
  const body = html.slice(html.indexOf('<body'));
  assert.doesNotMatch(body, /MARCA_INTERNA|class="footer"|<b>01<\/b>|tl\.from\('[^']* \.footer'/);
  assert.match(body, /El|agua|sube/);
});

test('puente HyperFrames V7 genera composiciones compatibles y HTML seguro', () => {
  const project = {name: '<Prueba & Ciencia>', format: 'vertical', style: 'playful',
    scenes: [
      {id: '1', title: 'Las bacterias y el cuerpo', scriptExcerpt: 'La piel protege',
        subtitle: 'Una aventura de ciencia', duration: 3, imageAsset: ''},
      {id: '2', title: 'Cómo ahorrar dinero', duration: 4, imageAsset: ''},
    ]};
  const html = exportHyperframesProject(project, undefined, 'window.gsapLoaded=true;');
  assert.match(html, /data-composition-id="motion-studio-7"/);
  assert.match(html, /data-width="720" data-height="1280"/);
  assert.match(html, /tl\.set\(\{\}, \{\}, 7\)/);
  assert.match(html, /class="clip hf-scene"[^>]*data-start="0" data-duration="3\.42"/);
  assert.match(html, /class="clip hf-scene"[^>]*data-start="3" data-duration="4"/);
  assert.match(html, /data-track-index="0"/);
  assert.match(html, /data-track-index="10"/);
  assert.match(html, /gsap\.timeline\(\{paused:true\}\)/);
  assert.match(html, /window\.__timelines\['motion-studio-7'\]=tl/);
  assert.match(html, /class="microbe"/);
  assert.match(html, /class="bar"/);
  assert.doesNotMatch(html, /<Prueba & Ciencia>/);
  assert.match(html, /&lt;Prueba &amp; Ciencia&gt;/);
  const single = exportHyperframesScene(project, project.scenes[0]);
  assert.equal((single.match(/class="clip hf-scene"/g) || []).length, 1);
  assert.match(single, /tl\.set\(\{\}, \{\}, 3\)/);
  const skin = exportHyperframesScene(project,
    {title: 'La piel es una barrera contra bacterias', duration: 3});
  assert.match(skin, /M52 344Q311 310/);
  const withoutText = exportHyperframesProject({...project, showText: false});
  assert.doesNotMatch(withoutText, /class="headline"/);
  const withImage = exportHyperframesScene(project,
    {...project.scenes[0], imageAsset: 'user-assets/imagen.webp'}, '',
    {'user-assets/imagen.webp': 'assets/imagen.webp'});
  assert.match(withImage, /class="hf-media"/);
  assert.match(withImage, /src="assets\/imagen\.webp"/);
  assert.match(withImage, /class="hf-lowerthird"/);
  assert.doesNotMatch(withImage, /class="headline"/);
});

test('HyperFrames consume el plan de acción y respeta sus beats locales', () => {
  const scene = {id:'rise', title:'La marea sube', duration:3, imageAsset:'', motion:'static',
    scriptExcerpt:'La marea sube por la calle.', visualActionPlan:{version:1, subject:'la marea', evidence:'La marea sube por la calle.',
      actionType:'rise', action:'El agua sube y cubre la calle.', shotScale:'wide', camera:'push', confidence:'grounded',
      beats:[{at:0,duration:.2,action:'Establece la calle.'},{at:.2,duration:.5,action:'Sube el agua.'},{at:.7,duration:.3,action:'Sostén el resultado.'}]}};
  const html = exportHyperframesProject({name:'Acciones',format:'vertical',showText:false,scenes:[scene]}, undefined, '');
  assert.match(html, /data-action-type="rise" data-action-plan="El agua sube y cubre la calle\."/);
  assert.match(html, /class="action-water"/);
  assert.match(html, /\.action-water'.*duration:1\.5,ease:'none'\},0\.600\)/);
  assert.match(html, /hf-scene-0-action/);
  const install = exportHyperframesProject({name:'Instalación',format:'vertical',showText:false,scenes:[{
    ...scene, id:'install', title:'Colocan plataformas',
    visualActionPlan:{...scene.visualActionPlan, actionType:'install', camera:'rise', action:'La plataforma se asienta.'},
  }]}, undefined, '');
  assert.match(install, /class="action-path" d="M310 120V320"/);
  assert.match(install, /tl\.from\('#hf-scene-0 \.action-piece'/);
  const inspect = exportHyperframesProject({name:'Inspección',format:'vertical',showText:false,scenes:[{
    ...scene, id:'inspect', title:'Madera sumergida',
    visualActionPlan:{...scene.visualActionPlan, actionType:'inspect', action:'Acercamiento a la madera.'},
  }]}, undefined, '');
  assert.match(inspect, /scale:1\.16,opacity:\.85,duration:1\.5,ease:'sine\.inOut',yoyo:true,repeat:1/);
});

test('custom scenes no duplican captions ni alargan el fondo para solapamiento de transición', () => {
  const project = {name:'Canvas',format:'vertical',palette:'sunset',audioAsset:'',musicAsset:'',references:[],scenes:[
    {id:'one',layout:'hero',duration:3,title:'A',subtitle:'',imageAsset:'',cues:[],captions:[{id:'c',at:.5,duration:1,text:'Texto'}],customScene:{html:'<canvas></canvas>',script:"const p={t:0};tl.to(p,{t:D,duration:D,ease:'none'},T0);"}},
    {id:'two',layout:'hero',duration:3,title:'B',subtitle:'',imageAsset:'',cues:[],customScene:{html:'<canvas></canvas>'}},
  ]};
  const html = exportHyperframesProject(project, undefined, '', {});
  assert.match(html, /data-start="3" data-duration="3"/);
  assert.doesNotMatch(html, /hf-scene-0-caption-0/);
  assert.doesNotMatch(html, /hf-scene-0-caption-0/);
  assert.doesNotMatch(html.slice(html.indexOf('<main'), html.indexOf('</main>')), /hf-flash/);
  assert.doesNotMatch(html, /hf-scene-0-caption-0/);
});

test('custom scenes can crossfade without moving the narration timeline',()=>{
  const basic={duration:3,customScene:{html:'<svg><circle cx="10" cy="10" r="5"/></svg>',script:''}};
  const html=exportHyperframesProject({format:'vertical',showText:false,scenes:[{...basic,id:'a'}, {...basic,id:'b',transition:'fade'}]},undefined,'');
  assert.ok(html.includes('data-start="0" data-duration="3.42"'));
  assert.ok(html.includes('data-start="3" data-duration="3"'));
  assert.ok(html.includes("tl.fromTo('#hf-scene-1',{opacity:0}"));
  assert.ok(html.includes('tl.set({}, {}, 6)'));
});
