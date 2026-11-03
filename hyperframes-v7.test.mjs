import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exportHyperframesProject} from './src/hyperframes-bridge.mjs';

const gsap = 'window.__gsapTest=true;';

test('HyperFrames incluye voz, diálogos y música en pistas separadas', () => {
  const project = {name: 'Audio completo', format: 'horizontal', showText: false,
    narrationMode: 'dialogues',
    voiceClips: [
      {id: 'a', speaker: 'Narrador', asset: 'user-assets/a.mp3', duration: 2.4},
      {id: 'b', speaker: 'Niño', asset: 'user-assets/b.wav', duration: 1.6},
    ], musicAsset: 'user-assets/music.mp3',
    scenes: [{id: '1', title: 'Plano', duration: 4, imageAsset: ''}],
  };
  const html = exportHyperframesProject(project, undefined, gsap, {
    'user-assets/a.mp3': 'assets/a.mp3',
    'user-assets/b.wav': 'assets/b.wav',
    'user-assets/music.mp3': 'assets/music.mp3',
  });
  assert.match(html, /id="hf-voice-0" data-start="0" data-duration="2\.4" data-track-index="200"/);
  assert.match(html, /id="hf-voice-1" data-start="2\.4" data-duration="1\.6" data-track-index="200"/);
  assert.match(html, /id="hf-music" data-start="0" data-duration="4" data-track-index="210" data-volume="0\.18" loop/);
  assert.doesNotMatch(html, /id="hf-narration"/);
  assert.match(html, /src="assets\/a\.mp3"/);
});

test('HyperFrames conserva clips MP4 y silencia su audio interno', () => {
  const project = {name: 'Clip', format: 'vertical', showText: true,
    scenes: [{id: '1', title: 'Video', subtitle: '', duration: 5,
      imageAsset: '', videoAsset: 'user-assets/clip.mp4'}]};
  const html = exportHyperframesProject(project, undefined, gsap, {
    'user-assets/clip.mp4': 'assets/clip.mp4',
  });
  assert.match(html, /<video id="hf-scene-0-video" data-start="0" data-duration="5" data-track-index="0" data-volume="0" muted playsinline/);
  assert.match(html, /class="clip hf-scene hf-overlay"[^>]*data-start="0" data-duration="5" data-track-index="1"/);
  assert.match(html, /src="assets\/clip\.mp4"/);
  assert.doesNotMatch(html, /<video[^>]*class="clip"/);
});

test('HyperFrames mantiene la duración de escenas y deja solapamiento visual sin recortar audio', () => {
  const project = {name: 'Duración', format: 'vertical', audioAsset: 'user-assets/voice.mp3',
    scenes: [
      {id: '1', title: 'Primera', duration: 3, imageAsset: ''},
      {id: '2', title: 'Segunda', duration: 4, imageAsset: ''},
      {id: '3', title: 'Tercera', duration: 2, imageAsset: ''},
    ]};
  const html = exportHyperframesProject(project, undefined, gsap, {
    'user-assets/voice.mp3': 'assets/voice.mp3',
  });
  assert.match(html, /data-start="0" data-duration="3\.42"/);
  assert.match(html, /data-start="3" data-duration="4\.42"/);
  assert.match(html, /data-start="7" data-duration="2"/);
  assert.match(html, /id="hf-narration" data-start="0" data-duration="9"/);
  assert.match(html, /tl\.set\(\{\}, \{\}, 9\)/);
});

test('HyperFrames renderiza gráficos editables con etiquetas escapadas', () => {
  const project = {name: 'Gráficos', format: 'horizontal',
    scenes: [{id: '1', title: 'Datos', duration: 5, imageAsset: '',
      motionGraphics: [
        {kind: 'counter', label: '<Ventas>', value: 2500, unit: 'number', at: 0.5, duration: 2},
        {kind: 'bar', label: 'Progreso', value: 75, maxValue: 100, unit: 'percent', at: 2, duration: 2},
      ]}]};
  const html = exportHyperframesProject(project, undefined, gsap);
  assert.match(html, /&lt;Ventas&gt;/);
  assert.match(html, /2[,\.]500/);
  assert.match(html, /class="hf-progress"/);
  assert.match(html, /hf-scene-0-graphic-0/);
  assert.match(html, /hf-scene-0-graphic-1/);
  assert.match(html, /hfCount0_0/);
  assert.match(html, /replace\(\/\\B/);
  const segmented = exportHyperframesProject({name: 'Segmentos', format: 'vertical', scenes: [{
    title: 'Distribución', duration: 4, motionGraphics: [{kind: 'donut', label: 'Categorías', value: 100,
      unit: 'percent', maxValue: 100, at: 0.5, duration: 2,
      segments: [{label: 'A', value: 60}, {label: 'B', value: 40}]}],
  }]}, undefined, gsap);
  assert.match(segmented, /class=\"donut-segment\"/);
  assert.match(segmented, /hf-donut-legend/);
});

test('HyperFrames crea una escena veneciana vertical con capas animadas y sin afirmaciones prefabricadas', () => {
  const project = {name: 'Venecia', format: 'vertical', style: 'cinematic',
    scenes: [{id: 'venice', title: 'Los cimientos bajo Venecia', subtitle:'La ciudad sobre la laguna', duration: 6,
      scriptExcerpt: 'Las plataformas y los edificios descansan sobre pilotes y distribuyen el peso.', imageAsset: ''}]};
  const html = exportHyperframesProject(project, undefined, gsap);
  assert.match(html, /VENECIA POR DENTRO/);
  assert.match(html, /class="clip hf-scene hf-venice"/);
  assert.match(html, /class="venice-city"/);
  assert.match(html, /class="venice-platform"/);
  assert.match(html, /class="venice-pile"/);
  assert.match(html, /\.venice-central-pile',\{y:140,opacity:0/);
  assert.doesNotMatch(html, /class="footer"/);
  assert.match(html, /preserveAspectRatio="xMidYMid slice"/);
  assert.doesNotMatch(html, /MADERA ANEGADA|POCO OXÍGENO|ESTRATO COMPACTO|SUELO MÁS FIRME/);
  const timber = exportHyperframesProject({name:'Venecia',format:'vertical',style:'cinematic',scenes:[{id:'timber',title:'Pilotes de madera',duration:6,scriptExcerpt:'Pilotes de madera clavados bajo la ciudad.'}]}, undefined, gsap);
  assert.match(timber, /class="venice-rig"/);
  assert.match(timber, /class="venice-central-pile"/);
  assert.match(timber, /class="venice-clamp"/);
  assert.match(timber, /venice-central-pile.*y:140/);
  assert.match(html, />Los<\/span>/);
});

test('HyperFrames renderiza subtítulos temporizados y escapa el texto', () => {
  const project = {name: 'Captions', format: 'vertical', showText: false,
    scenes: [{id: '1', title: 'Toma', duration: 4, imageAsset: '', captions: [
      {id: 'c1', at: 0.5, duration: 1.8, text: '<Frase clave>', emphasis: ['clave'], position: 'top'},
    ]}]};
  const html = exportHyperframesProject(project, undefined, gsap);
  assert.match(html, /hf-scene-0-caption-0/);
  assert.match(html, /class="hf-caption hf-caption-top"/);
  assert.match(html, /&lt;Frase clave&gt;/);
  assert.match(html, /tl\.from\('#hf-scene-0-caption-0'/);
});

test('HyperFrames conserva los elementos temporizados del inspector', () => {
  const project = {name: 'Indicadores', format: 'vertical', showText: false,
    scenes: [{id: '1', title: 'Señal', duration: 5, imageAsset: '',
      cues: [
        {id: 'a', at: 1, duration: 1.5, shape: 'ring', label: 'Atención'},
        {id: 'b', at: 3, duration: 1, shape: 'bars', label: ''},
      ]}]};
  const html = exportHyperframesProject(project, undefined, gsap);
  assert.match(html, /hf-scene-0-cue-0/);
  assert.match(html, /class="hf-cue hf-cue-ring"/);
  assert.match(html, /class="cue-ring"/);
  assert.match(html, /class="hf-cue hf-cue-bars"/);
  assert.match(html, /class="cue-bars"/);
  assert.match(html, /tl\.from\('#hf-scene-0-cue-0'/);
});
