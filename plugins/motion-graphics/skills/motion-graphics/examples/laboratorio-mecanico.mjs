// Ejemplo de NIVEL DE ACABADO esperado: materiales, camara, efectos, etiquetas y mecanismo en cada plano.
// Es un laboratorio de tecnica (sin narracion ni subtitulos), no una estetica para todos los temas.
// Uso:
//   node scripts/assemble-scenes.mjs assets/motion-lab.json examples/laboratorio-mecanico.mjs salida.json
// REGLA DE CAPAS: todo lo que interactua (martillo, pilote, piezas) va en la MISMA capa ('fg').
// 'bg' (cielo, nubes) se mueve mas lento por paralaje; si una pieza que toca a otra esta en otra capa,
// el contacto se separa al hacer zoom.
import * as K from '../scripts/kits/index.mjs';

const night = (s, seed) => { s.add('bg', K.skyNight(s, {seed})); s.add('bg', K.clouds(s, {y: 90, h: 380, seed: seed + 1, count: 4, tone: '#1f2f5e', light: '#4a64a4'})); };

/* 1 · Golpes de martillo sobre un pilote: contacto, chispas, hundimiento, conteo */
function martillo() {
  const s = K.createScene({id: 'lab-martillo', duration: 5.5, uid: 'mar'});
  night(s, 3);
  s.add('fg', K.soil(s, {y: 960, layers: [{h: 90, tone: '#6b4a2e'}, {h: 110, tone: '#4a3220'}, {h: 220, tone: '#33231a'}]}));
  s.add('fg', K.wood(s, {x: 220, y: 790, w: 280, h: 170}));
  s.defs('pilecut', `<clipPath id="${s.gid('pilecut')}"><rect x="0" y="0" width="720" height="790"/></clipPath>`);
  s.add('fg', `<g clip-path="${s.url('pilecut')}"><g class="pile">${K.rod(s, {x: 344, y: 400, w: 32, h: 700, tone: '#aeb9ca'})}</g></g>`);
  s.add('fg', `<g class="hammer">${K.wood(s, {x: 392, y: 322, w: 250, h: 26, tone: '#a8733f'})}` +
    K.steel(s, {x: 318, y: 296, w: 76, h: 100, rivets: false, brush: 'v'}) + `<polygon points="318,296 296,268 336,292" fill="#9aa6b8" stroke="#0a1020" stroke-opacity=".6"/></g>`);
  const hits = [1.2, 2.3, 3.4], depth = [0, 26, 52, 84], P = '645 334';
  s.js(`tl.set(S+' .hammer',{rotation:28,svgOrigin:'${P}'},T0);`);
  hits.forEach((t, i) => {
    const wind = i === 0 ? '' : `tl.fromTo(S+' .hammer',{rotation:0,svgOrigin:'${P}'},{rotation:28,svgOrigin:'${P}',duration:.5,ease:'power2.out',immediateRender:false},T0+${(t - .68).toFixed(2)});`;
    s.js((i ? `tl.to(S+' .hammer',{y:${depth[i]},duration:.4,ease:'power2.inOut'},T0+${(t - .7).toFixed(2)});` : '') + wind + `tl.fromTo(S+' .hammer',{rotation:28,svgOrigin:'${P}'},{rotation:0,svgOrigin:'${P}',duration:.16,ease:'power3.in',immediateRender:false},T0+${(t - .16).toFixed(2)});` +
      `tl.fromTo(S+' .pile',{y:${depth[i]}},{y:${depth[i + 1]},duration:.14,ease:'power2.out',immediateRender:false},T0+${t.toFixed(2)});tl.to(S+' .hammer',{y:${depth[i + 1]},duration:.14,ease:'power2.out'},T0+${t.toFixed(2)});`);
    K.sparks(s, {x: 360, y: 400 + depth[i], at: t, dur: .5, count: 14, reach: 95, spread: [205, 335], seed: 4 + i});
  });
  K.shockwave(s, {cx: 360, cy: 452, r: 130, at: 3.4, dur: .6});
  K.label(s, {text: 'PILOTE', x: 376, y: 560, dx: 95, dy: -50, at: .5});
  K.dimension(s, {x1: 440, y1: 400, x2: 440, y2: 484, text: 'HUNDIDO', at: 3.7, dur: .5});
  K.tally(s, {x: 70, y: 1170, count: 3, at: 1.2, step: 1.1, layer: 'hud'});
  K.tag(s, {text: 'GOLPES', x: 70, y: 1205, at: 1.2, anchor: 'start', size: 14, color: K.INK.dim});
  const cam = K.camera(s);
  cam.move(.2, 3.6, {k: 1.5, focus: [400, 470]}).move(4.1, 1.2, {k: 1.2, focus: [360, 540]});
  hits.forEach((t, i) => cam.shake(t, .28, {amp: 6 + i * 2, hz: 24, seed: 8 + i}));
  return s.build({title: 'Golpes', scriptExcerpt: ''});
}

/* Escena base de maquina: guias, base, camara y masa deslizante */
function maquina(s, {cut, mass = true}) {
  s.add('fg', K.steel(s, {x: 200, y: 770, w: 320, h: 46}));
  s.add('fg', K.rails(s, {x: 360, y: 230, h: 560, gap: 210}).svg);
  const ch = K.chamber(s, {x: 230, y: 640, w: 260, h: 130});
  if (cut) s.add('fg', K.cutaway(s, {...cut, x: 230, y: 640, w: 260, h: 130, outer: K.steel(s, {x: 230, y: 640, w: 260, h: 130, tone: '#7f8ba0'}), inner: ch.svg}));
  else s.add('fg', ch.svg);
  return ch;
}
const massSvg = (s) => `<g class="mass">${K.steel(s, {x: 262, y: 330, w: 196, h: 190})}${K.rod(s, {x: 340, y: 520, w: 40, h: 90, tone: '#aab6c9', cap: false})}</g>`;

/* 2 · Corte interno: la masa cae, comprime, se inyecta, se enciende y sube */
function corte() {
  const s = K.createScene({id: 'lab-corte', duration: 6, uid: 'cor'});
  night(s, 5);
  const ch = maquina(s, {cut: {at: .9, dur: .8, from: 'center'}});
  s.add('fg', K.steel(s, {x: 193, y: 702, w: 44, h: 22, r: 3, rivets: false, texture: .4}));
  s.add('fg', K.fuelCell(s, {x: 74, y: 688, w: 44, h: 60}));
  K.flow(s, {d: 'M118 713H196L262 712L300 728', at: 3, dur: .9, out: 4.0, width: 7});
  K.gasDots(s, ch, {at: 2.3, dur: .7, squeeze: .5, out: 4.0});
  s.add('fg', massSvg(s));
  const dn = 95;
  s.js(`tl.fromTo(S+' .mass',{y:0},{y:${dn},duration:.45,ease:'power3.in',immediateRender:false},T0+1.8);tl.fromTo(S+' .mass',{y:${dn}},{y:0,duration:1.1,ease:'power2.out',immediateRender:false},T0+4.3);`);
  K.chamberGlow(s, ch, {at: 4, rise: .1, decay: .9});
  K.sparks(s, {x: 360, y: 705, at: 4, dur: .5, count: 10, reach: 70, spread: [200, 340]});
  K.smoke(s, {x: 300, y: 650, at: 4.5, dur: 1.0, count: 4, rise: 110, spread: 90, r: 18, opacity: .4});
  K.label(s, {text: 'GUÍAS', x: 255, y: 330, dx: -70, dy: -40, at: 1});
  K.label(s, {text: 'INYECTOR', x: 215, y: 703, dx: -30, dy: -72, at: 2.9});
  K.thermometer(s, {x: 650, y: 700, h: 170, at: 3.9, dur: .8, text: 'CALOR', layer: 'hud'});
  K.stepList(s, {x: 70, y: 990, items: ['CAE', 'APRIETA', 'INYECTA', 'ENCIENDE', 'SUBE'], times: [1.8, 2.3, 3, 4, 4.3], at: 1, layer: 'hud'});
  K.camera(s).move(.2, 1.2, {k: 1.3, focus: [315, 640]}).shake(1.8, .3, {amp: 7}).shake(4, .35, {amp: 6, seed: 5}).move(4.4, 1.4, {k: 1.15, focus: [360, 560]});
  return s.build({title: 'Corte', scriptExcerpt: ''});
}

/* 3 · Piston-biela-cigueñal con cinematica real, engranajes y camara lenta */
function motor() {
  const s = K.createScene({id: 'lab-motor', duration: 6, uid: 'mot'});
  night(s, 9);
  const cx = 360, cy = 960;
  s.add('fg', K.steel(s, {x: 180, y: 642, w: 360, h: 26, rivets: false, texture: .45}));
  const cyl = K.chamber(s, {x: cx - 66, y: 668, w: 132, h: 214, wall: 24});
  s.add('fg', cyl.svg);
  s.add('fg', K.steel(s, {x: cx + 80, y: cy - 6, w: 110, h: 12, rivets: false, texture: .4}));
  const pc = K.pistonCrank(s, {cx, cy, r: 44, L: 150, bore: 84});
  s.add('fg', pc.svg);
  const gA = K.gear(s, {cx: 548, cy, teeth: 14, r: 46}), gB = K.gear(s, {cx: 598, cy: cy + 50, teeth: 10, r: 34, phase: 18});
  s.add('fg', gA.svg + gB.svg);
  pc.animate(1, 4, {cycles: 2});
  K.spin(s, gA, {at: 1, dur: 4, turns: 2, dir: 1}); K.spin(s, gB, {at: 1, dur: 4, turns: 2.8, dir: -1});
  [1, 3, 5].forEach((t, i) => K.chamberGlow(s, cyl, {at: Math.min(t, 5.0), rise: .08, decay: .45, peak: .85 - i * .1}));
  K.label(s, {text: 'PISTÓN', x: cx - 40, y: 735, dx: -70, dy: -55, at: .6});
  K.label(s, {text: 'BIELA', x: cx - 5, y: 860, dx: -80, dy: 25, at: .9});
  K.label(s, {text: 'CIGÜEÑAL', x: cx - 70, y: cy + 60, dx: -50, dy: 60, at: 1.2});
  K.arrow(s, {x1: cx + 100, y1: pc.geo.tdcY - 30, x2: cx + 100, y2: pc.geo.bdcY - 30, double: true, at: .8, dur: .5});
  K.gauge(s, {cx: 150, cy: 1120, r: 52, from: -110, to: 85, at: 1.2, dur: 2.6, text: 'PRESIÓN', layer: 'hud'});
  K.camera(s).move(.2, 1.4, {k: 1.15, focus: [cx, 840]}).slowMo(2, 2.6, {k: 1.4, focus: [cx, 850]}).move(4.7, 1.0, {k: 1.15, focus: [cx, 900]});
  return s.build({title: 'Motor', scriptExcerpt: ''});
}

/* 4 · Explosion: tension, estallido, pieza despedida, onda, humo y camara que se retira */
function peligro() {
  const s = K.createScene({id: 'lab-peligro', duration: 5.5, uid: 'pel'});
  night(s, 12);
  const ch = maquina(s, {});
  s.add('fg', massSvg(s));
  s.js(`tl.set(S+' .mass',{y:95},T0);`);
  K.gasDots(s, ch, {at: .2, dur: .6, squeeze: .5, out: 1.7});
  K.pulse(s, `.${ch.cls}-glow`, {at: .5, dur: 1.1, from: 0, to: .75, times: 3});
  K.thermometer(s, {x: 650, y: 700, h: 170, at: .3, dur: 1.2, text: 'CALOR', from: .3, to: 1, layer: 'hud'});
  K.warning(s, {text: 'PELIGRO', x: 360, y: 330, at: .6, size: 46, blink: 3, layer: 'hud'});
  K.explosion(s, {cx: 360, cy: 705, r: 150, at: 1.7, dur: 1.3, seed: 2});
  s.js(`tl.fromTo(S+' .mass',{y:95,x:0,rotation:0,svgOrigin:'360 425'},{y:-760,x:210,rotation:38,svgOrigin:'360 425',duration:1.3,ease:'power2.out',immediateRender:false},T0+1.7);`);
  K.smoke(s, {x: 360, y: 690, at: 2.2, dur: 1.8, count: 6, rise: 200, spread: 120, r: 30, opacity: .5});
  K.particles(s, {x: 150, y: 560, w: 420, h: 200, count: 18, at: 1.9, dur: 2.4, dy: -120, dx: 30, r: 2.2, color: '#ffb347', opacity: .8, layer: 'fg'});
  K.camera(s).move(0, 1.6, {k: 1.35, focus: [360, 650]}).shake(1.7, .9, {amp: 16, decay: 2.2, seed: 6}).move(2.8, 2.4, {k: 1, focus: [360, 704], ease: 'power2.out'});
  return s.build({title: 'Peligro', scriptExcerpt: ''});
}

export default [martillo(), corte(), motor(), peligro()];

