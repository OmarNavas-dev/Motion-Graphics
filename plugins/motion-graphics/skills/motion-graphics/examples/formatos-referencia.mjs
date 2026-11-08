// Siete escenas que reproducen, con los kits v2.1, las familias de las referencias de TikTok:
// supervivencia con contador (oceano), personaje en cuarto cerrado (celda), interior religioso (nave),
// documento con sello, libro con versiculo, ojo en detalle y cierre del canal.
// Uso: node scripts/assemble-scenes.mjs base.json examples/formatos-referencia.mjs salida.json --words palabras.json
import * as K from '../scripts/kits/index.mjs';

function oceano() {
  const s = K.createScene({id: 'f1-oceano', duration: 6, uid: 'f1', bg: '#082654'});
  K.skyCycle(s, {from: 'day', to: 'dusk'});
  K.sceneryOcean(s, {});
  K.boat(s, {y: 800});
  K.oceanFront(s, {});
  K.chapterBadge(s, {n: 1, label: 'La sed'});
  K.counter(s, {x: 36, y: 312, from: 12, to: 36, at: .3, dur: 5.2, steps: 13, format: v => `DÍA ${Math.round(v)}`, size: 30, color: '#ffd9a0', anchor: 'start', layer: 'hud'});
  K.counter(s, {x: 36, y: 366, from: 12, to: 36, at: .3, dur: 5.2, steps: 13, format: v => `≈ ${Math.round(v * 27.5)} km`, size: 20, color: '#cfe0ff', anchor: 'start', layer: 'hud'});
  K.meterBar(s, {label: 'agua en tu cuerpo', from: .64, to: .45, at: .8, dur: 4.8});
  K.camera(s).drift(0, 5.8, {dx: -16, dy: 0, dk: .05});
  return s.build({title: 'Océano y contador', scriptExcerpt: 'Día tras día, dos hombres flotaban sin rumbo bajo el mismo sol.'});
}

function celda() {
  const s = K.createScene({id: 'f2-celda', duration: 6, uid: 'f2', bg: '#120c08'});
  const room = K.cellRoom(s, {});
  s.add('fg', '<g><rect x="150" y="900" width="136" height="14" rx="3" fill="#8a5a34"/><rect x="150" y="780" width="13" height="134" fill="#7a4d2c"/><rect x="270" y="914" width="11" height="86" fill="#6b4326"/><rect x="154" y="914" width="11" height="86" fill="#6b4326"/></g>');
  const walk = K.walkPoses({duration: 2.2, stride: 46, travel: 230, cycles: 3}).map(q => ({...q, at: q.at + 1.9}));
  K.puppet(s, {id: 'pj', x: 200, y: 820, scale: 1.15, poses: [{...K.seatedPose(0), at: 0}, {...K.seatedPose(0), at: .7}, {...K.standingPose(0), at: 1.6}, ...walk, {...walk.at(-1), at: 5.9}], config: {shirt: '#e07a3a', pants: '#2f4a7a'}});
  K.stopwatch(s, {x: 150, y: 300, fromSec: 2700, at: .4, dur: 5, layer: 'hud'});
  K.heartRate(s, {x: 480, y: 270, bpm: 150, at: 1.0, dur: 1.4, layer: 'hud'});
  K.camera(s).move(3.6, 2, {k: 1.2, focus: [470, 800]});
  return s.build({title: 'Celda', scriptExcerpt: 'Se levantó de la silla, caminó hasta la puerta y se detuvo.'});
}

function iglesia() {
  const s = K.createScene({id: 'f3-iglesia', duration: 6, uid: 'f3', bg: '#0b0705'});
  K.nave(s, {});
  K.particles(s, {x: 40, y: 400, w: 640, h: 700, count: 34, at: 0, dur: 5.8, dx: 14, dy: -46, r: 1.8, color: '#ffe2a0', opacity: .5, seed: 5, layer: 'mid'});
  K.camera(s, {focus: [360, 640], k: 1}).move(.2, 2.6, {k: 1.9, focus: [250, 760]});
  K.closeUp(s, {inner: K.recumbentFigure({kind: 'nun'}), at: 3.0});
  K.petals(s, {x: 360, y: 420, at: 3.2, dur: 2.4});
  K.chip(s, {x: 360, y: 1070, big: '+500', unit: 'años', at: 3.9, layer: 'hud'});
  return s.build({title: 'Iglesia', scriptExcerpt: 'Quinientos años después abrieron el ataúd, y el cuerpo seguía intacto.'});
}

function documento() {
  const s = K.createScene({id: 'f4-documento', duration: 6, uid: 'f4', bg: '#1a0f08'});
  s.add('bg', K.wood(s, {x: -220, y: -220, w: 1160, h: 1760, tone: '#3a2616'}));
  const p = K.parchment(s, {title: 'IOANNES PP. XV', signature: 'Sanctus Udalricus'});
  K.waxSeal(s, {x: p.sealX, y: p.sealY, at: 2.5});
  K.chip(s, {x: 360, y: 1020, big: 'año', unit: '993', at: 3.1});
  K.camera(s, {focus: [360, 640], k: 1.05}).move(.2, 2.2, {k: 1.15, focus: [360, 700]}).move(3.3, 2.5, {k: 1.4, focus: [360, 900]}).shake(2.72, .3, {amp: 8, hz: 24, seed: 3});
  return s.build({title: 'Documento y sello', scriptExcerpt: 'El documento llevaba el sello del papa y una fecha: año 993.'});
}

function libro() {
  const s = K.createScene({id: 'f5-libro', duration: 5, uid: 'f5', bg: '#150c06'});
  s.add('bg', K.wood(s, {x: -220, y: -220, w: 1160, h: 1760, tone: '#3d2817'}));
  K.openBook(s, {});
  K.chip(s, {x: 360, y: 1080, big: 'Lucas', unit: '23,43', w: 290, at: 2.9});
  K.camera(s, {focus: [360, 640], k: 1}).move(.2, 4.5, {k: 1.1, focus: [420, 640], ease: 'sine.inOut'});
  return s.build({title: 'Libro', scriptExcerpt: 'Y Jesús le contestó: «Hoy estarás conmigo en el paraíso».'});
}

function ojo() {
  const s = K.createScene({id: 'f6-ojo', duration: 5, uid: 'f6', bg: '#0e0907'});
  const e = K.eye(s, {});
  K.camera(s, {focus: e.center, k: 1}).move(.3, 2.6, {k: 4.4, focus: e.target});
  return s.build({title: 'Ojo', scriptExcerpt: 'Si te acercas al ojo, ves algo que nadie pintó.'});
}

function cierre() {
  const s = K.createScene({id: 'f7-cierre', duration: 5, uid: 'f7', bg: '#1a0f08'});
  K.endCard(s, {logo: ['TU', 'CANAL'], name: 'Nombre del canal', part: 'PARTE 2', pill: 'Parte 1 de 2'});
  return s.build({title: 'Cierre', scriptExcerpt: 'Sigue el canal, y mañana llega la parte dos.'});
}

export default [oceano(), celda(), iglesia(), documento(), libro(), ojo(), cierre()];
