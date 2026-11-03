import assert from 'node:assert/strict';
import test from 'node:test';
import {validateProject, assertApproved, assetExtension, validateAsset, validMediaSignature} from './server-utils.mjs';
import fs from 'node:fs';

const emptyTemplate = JSON.parse(fs.readFileSync(new URL('./studio-default.json', import.meta.url), 'utf8'));
const base = {...emptyTemplate, scenes:[{id:'fixture', layout:'hero', duration:4,
  title:'Escena de prueba', subtitle:'', imageAsset:'', cues:[], approved:false}]};
test('la plantilla inicial es vacía y no precarga un storyboard de demostración', () => {
  const value = validateProject(emptyTemplate);
  assert.equal(value.scenes.length, 0);
  assert.equal(value.name, 'Motion Studio');
  assert.equal(value.audioAsset, '');
  assert.equal(value.musicAsset, '');
  assert.deepEqual(value.references, []);
  assert.deepEqual(value.voiceClips, []);
});
test('acepta plantilla nueva vacía sin storyboard ni medios precargados', () => {
  assert.deepEqual(validateProject(emptyTemplate).scenes, []);
  assert.throws(() => validateProject({...emptyTemplate,
    audioAsset:'user-assets/00000000-0000-4000-8000-000000000000.mp3'}), /no puede conservar medios/);
});
test('rechaza un video excesivamente largo', () => {
  const value = structuredClone(base);
  value.scenes = Array.from({length: 20}, (_, index) => ({
    ...value.scenes[0], id: `s${index}`, duration: 50,
  }));
  assert.throws(() => validateProject(value), /15 minutos/);
});
test('admite narración de 166 segundos con muchas escenas', () => {
  const value = structuredClone(base);
  value.scenes = Array.from({length: 24}, (_, index) => ({
    ...value.scenes[0], id: `s${index}`, duration: index === 23 ? 5.11 : 7,
  }));
  const project = validateProject(value);
  assert.equal(project.scenes.length, 24);
  assert.equal(Math.round(project.scenes.reduce((total, s) => total + s.duration, 0) * 100), 16611);
});
test('exportación requiere aprobación explícita de todas las escenas', () => {
  const project = validateProject(base);
  assert.throws(() => assertApproved(project), /Revisa y aprueba las 1 escenas pendientes/);
  assert.doesNotThrow(() => assertApproved({...project, scenes: project.scenes.map((s) => ({...s, approved: true}))}));
  assert.throws(() => assertApproved({...project, scenes:[]}), /Añade al menos una escena/);
});
test('acepta audios de diálogo y referencias seguras', () => {
  const value = structuredClone(base);
  value.narrationMode = 'dialogues';
  value.voiceClips = [{id: 'voz1', speaker: 'Antonio',
    asset: 'user-assets/00000000-0000-4000-8000-000000000000.mp3', duration: 4.2}];
  value.references = ['user-assets/00000000-0000-4000-8000-000000000000.png'];
  const project = validateProject(value);
  assert.equal(project.voiceClips[0].speaker, 'Antonio');
  assert.equal(project.references.length, 1);
  value.references = ['../../imagen.png'];
  assert.throws(() => validateProject(value), /Referencia de archivo/);
});
test('rechaza archivos con rutas externas y traversal', () => {
  assert.throws(() => validateAsset('../../secreto.mp3'));
  assert.throws(() => validateAsset('https://servidor.com/audio.mp3'));
  assert.throws(() => validateAsset('user-assets/00000000-0000-4000-8000-000000000000.png', 'audio'));
  assert.equal(validateAsset(''), '');
});
test('extensiones y cabeceras de imagen', () => {
  assert.equal(assetExtension('imagen.PNG'), '.png');
  assert.throws(() => assetExtension('programa.exe'));
  assert.equal(validMediaSignature(Buffer.from('89504e470d0a1a0a', 'hex'), '.png'), true);
  assert.equal(validMediaSignature(Buffer.from('<script>alert(1)</script>'), '.png'), false);
});

test('conserva dirección artística libre y estilos distintos por escena', () => {
  const value = structuredClone(base);
  value.style = 'cinematic';
  value.creativeBrief = 'Animación editorial con collage, ritmo pausado y letras fuertes.';
  value.scenes[0] = {...value.scenes[0], layout: 'kinetic', style: 'tech',
    motion: 'pan-left', motionStrength: 65, transition: 'flash',
    focusX: 20, focusY: 80};
  value.scenes[1] = {...value.scenes[1], layout: 'collage', style: 'playful'};
  const project = validateProject(value);
  assert.equal(project.style, 'cinematic');
  assert.match(project.creativeBrief, /collage/);
  assert.equal(project.scenes[0].layout, 'kinetic');
  assert.equal(project.scenes[0].style, 'tech');
  assert.equal(project.scenes[0].motion, 'pan-left');
  assert.equal(project.scenes[0].transition, 'flash');
  assert.equal(project.scenes[1].style, 'playful');
});

test('admite el motor experimental Canvas sin perder el modo clásico', () => {
  const canvas = validateProject({...structuredClone(base), visualEngine: 'canvas'});
  const classic = validateProject({...structuredClone(base), visualEngine: 'classic'});
  assert.equal(canvas.visualEngine, 'canvas');
  assert.equal(classic.visualEngine, 'classic');
});

test('normaliza parámetros de cámara y rechaza opciones desconocidas', () => {
  const value = structuredClone(base);
  value.scenes[0] = {...value.scenes[0], style: '<script>', motion: 'teleport',
    transition: 'jump', focusX: -25, focusY: 125, motionStrength: 300};
  const scene = validateProject(value).scenes[0];
  assert.equal(scene.style, undefined);
  assert.equal(scene.motion, 'auto');
  assert.equal(scene.transition, 'cut');
  assert.equal(scene.focusX, 0);
  assert.equal(scene.focusY, 100);
  assert.equal(scene.motionStrength, 100);
});

test('admite MP4 como clip de escena sin alterar las referencias de imagen', () => {
  const value = structuredClone(base);
  value.scenes[0].videoAsset = 'user-assets/00000000-0000-4000-8000-000000000000.mp4';
  assert.equal(validateProject(value).scenes[0].videoAsset, value.scenes[0].videoAsset);
  assert.equal(validMediaSignature(Buffer.from('00000018667479706d703432', 'hex'), '.mp4'), true);
  assert.throws(() => validateAsset(value.scenes[0].videoAsset, 'image'));
});

test('limita el nivel configurable de música y conserva el valor predeterminado', () => {
  const value = structuredClone(base);
  assert.equal(validateProject(value).musicVolume, 0.18);
  value.musicVolume = 0.37;
  assert.equal(validateProject(value).musicVolume, 0.37);
  value.musicVolume = 0.9;
  assert.equal(validateProject(value).musicVolume, 0.5);
  value.musicVolume = -2;
  assert.equal(validateProject(value).musicVolume, 0);
});

test('normaliza capas parallax, captions y cues de audio seguros', () => {
  const value = structuredClone(base);
  value.scenes[0].captions = [{id: 'c1', at: 0.2, duration: 0.8, text: 'Una frase', emphasis: ['frase'], position: 'top'}];
  value.scenes[0].layers = [{id: 'l1', asset: 'user-assets/00000000-0000-4000-8000-000000000000.png', depth: 40, x: 50, y: 50, scale: 1.1, opacity: .8}];
  value.scenes[0].audioCues = [{id: 'a1', at: .5, duration: .4, asset: 'user-assets/00000000-0000-4000-8000-000000000000.mp3', volume: .3}];
  const project = validateProject(value);
  assert.equal(project.scenes[0].captions[0].text, 'Una frase');
  assert.equal(project.scenes[0].captions[0].position, 'top');
  assert.equal(project.scenes[0].layers[0].depth, 40);
  assert.equal(project.scenes[0].audioCues[0].volume, .3);
});

test('normaliza gráficos de datos y bloquea estructuras excesivas', () => {
  const value = structuredClone(base);
  value.scenes[0].motionGraphics = [
    {id: 'x', kind: 'counter', label: 'PRESUPUESTO', value: 1000,
      unit: 'currency', at: 0.5, duration: 1},
    {id: 'y', kind: 'donut', label: 'DISTRIBUCIÓN', value: 100,
      unit: 'percent', at: 0.5, duration: 1,
      segments: [{label: 'Necesidades', value: 50}, {label: 'Gustos', value: 30},
        {label: 'Ahorro', value: 20}]},
  ];
  const validated = validateProject(value).scenes[0];
  assert.equal(validated.motionGraphics[0].value, 1000);
  assert.deepEqual(validated.motionGraphics[1].segments.map((s) => s.value), [50, 30, 20]);
  value.scenes[0].motionGraphics = Array.from({length: 9}, (_, i) => ({
    id: `g${i}`, kind: 'bar', value: 50, unit: 'percent', at: 0.5, duration: 1,
  }));
  assert.throws(() => validateProject(value), /hasta 8 gráficos/);
});
