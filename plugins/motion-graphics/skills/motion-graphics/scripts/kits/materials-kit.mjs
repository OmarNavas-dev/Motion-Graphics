// Materiales con textura real (feTurbulence determinista + gradientes), sin imagenes externas.
// Cada funcion devuelve SVG para insertar con s.add('bg'|'mid'|'fg', ...).
// Los filtros se registran una vez por escena con ids unicos (uid-...).
import {n, seededRandom} from './scene-kit.mjs';

const hex = (c) => { const m = /^#?([0-9a-f]{6})$/i.exec(c); if (!m) throw Error('Color #rrggbb esperado: ' + c); const v = parseInt(m[1], 16); return [v >> 16, (v >> 8) & 255, v & 255]; };
/** Mezcla dos colores #rrggbb: mix('#888888','#ffffff',.3) aclara un 30%. */
export const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const lite = (c, t) => mix(c, '#ffffff', t), dark = (c, t) => mix(c, '#000000', t);
const key = (c) => c.replace('#', '');

function linear(s, k, stops, {x1 = 0, y1 = 0, x2 = 0, y2 = 1} = {}) {
  s.defs(k, `<linearGradient id="${s.gid(k)}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? '' : ` stop-opacity="${a}"`}/>`).join('')}</linearGradient>`);
  return s.url(k);
}

/** Cielo nocturno degradado + estrellas (posiciones fijas por semilla). Va en la capa 'bg'. */
export function skyNight(s, {top = '#0b1535', bottom = '#050b1c', stars = 36, seed = 7, starTone = '#cfe0ff'} = {}) {
  s.use('materials');
  const fill = linear(s, 'sky', [[0, top], [1, bottom]]);
  const r = seededRandom(seed), b = s.bleed;
  let dots = '';
  for (let i = 0; i < stars; i++) dots += `<circle cx="${n(-b + r() * (s.W + 2 * b), 1)}" cy="${n(r() * s.H * .6, 1)}" r="${n(.6 + r() * 1.3)}" fill="${starTone}" opacity="${n(.25 + r() * .6)}"/>`;
  return `<rect x="${-b}" y="${-b}" width="${s.W + 2 * b}" height="${s.H + 2 * b}" fill="${fill}"/>${dots}`;
}

/** Nubes con borde irregular y grano (como las nubes del video de referencia). */
export function clouds(s, {y = 140, h = 260, count = 4, seed = 3, tone = '#2b4076', light = '#5f7cc4', rough = 26, grain = .5} = {}) {
  s.use('materials');
  const fill = linear(s, 'cloudg', [[0, light], [1, tone]]);
  s.defs('cloudf', `<filter id="${s.gid('cloudf')}" x="-8%" y="-20%" width="116%" height="140%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency=".022 .05" numOctaves="3" seed="${seed}" result="n"/>` +
    `<feDisplacementMap in="SourceGraphic" in2="n" scale="${rough}" xChannelSelector="R" yChannelSelector="G" result="d"/>` +
    `<feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="2" seed="${seed + 5}" result="g"/>` +
    `<feColorMatrix in="g" type="matrix" values="0 0 0 0 .78  0 0 0 0 .84  0 0 0 0 1  0 0 0 ${n(2.4 * grain)} ${n(-1 * grain)}" result="gm"/>` +
    `<feComposite in="gm" in2="d" operator="in" result="gr"/>` +
    `<feMerge><feMergeNode in="d"/><feMergeNode in="gr"/></feMerge></filter>`);
  const r = seededRandom(seed), b = s.bleed;
  let out = '';
  for (let i = 0; i < count; i++) {
    const cx = -b * .4 + r() * (s.W + b * .8), cy = y + r() * h, w = 150 + r() * 190, hh = 34 + r() * 44;
    let blobs = '';
    for (let k = 0; k < 5; k++) blobs += `<ellipse cx="${n(cx + (k - 2) * w * .22 + (r() - .5) * 20, 1)}" cy="${n(cy + (r() - .5) * hh * .5, 1)}" rx="${n(w * (.28 + r() * .16), 1)}" ry="${n(hh * (.7 + r() * .5), 1)}"/>`;
    out += `<g fill="${fill}" opacity="${n(.7 + r() * .3)}">${blobs}</g>`;
  }
  return `<g filter="${s.url('cloudf')}">${out}</g>`;
}

function brushFilter(s, dir) {
  const k = 'brush' + dir;
  const f = dir === 'h' ? '.011 .8' : '.8 .011';
  s.defs(k, `<filter id="${s.gid(k)}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="${f}" numOctaves="2" seed="4" result="n"/>` +
    `<feColorMatrix in="n" type="matrix" values="0 0 0 0 .93  0 0 0 0 .96  0 0 0 0 1  2.1 0 0 0 -.95" result="lt"/>` +
    `<feColorMatrix in="n" type="matrix" values="0 0 0 0 .02  0 0 0 0 .04  0 0 0 0 .09  0 -2.1 0 0 .95" result="dk"/>` +
    `<feMerge result="m"><feMergeNode in="dk"/><feMergeNode in="lt"/></feMerge>` +
    `<feComposite in="m" in2="SourceAlpha" operator="in"/></filter>`);
  return s.url(k);
}

function rivet(s, cx, cy, r) {
  s.defs('rivet', `<radialGradient id="${s.gid('rivet')}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#e9f0fb"/><stop offset=".55" stop-color="#8b97aa"/><stop offset="1" stop-color="#2b3445"/></radialGradient>`);
  return `<circle cx="${n(cx, 1)}" cy="${n(cy, 1)}" r="${n(r, 1)}" fill="${s.url('rivet')}"/>`;
}

/** Placa de acero cepillado con bisel y remaches. brush 'h' (horizontal) o 'v'. */
export function steel(s, {x, y, w, h, r = 3, tone = '#8d99ab', rivets = true, brush = 'h', texture = .55} = {}) {
  s.use('materials');
  const g = linear(s, 'steel' + key(tone), [[0, lite(tone, .32)], [.14, lite(tone, .08)], [.6, tone], [.9, dark(tone, .28)], [1, dark(tone, .45)]]);
  const f = brushFilter(s, brush);
  let rv = '';
  if (rivets) { const i = Math.min(10, w / 5, h / 5), rr = Math.min(2.8, w / 12); rv = rivet(s, x + i, y + i, rr) + rivet(s, x + w - i, y + i, rr) + rivet(s, x + i, y + h - i, rr) + rivet(s, x + w - i, y + h - i, rr); }
  return `<g><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${r}" fill="${g}"/>` +
    `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${r}" fill="#fff" filter="${f}" opacity="${texture}"/>` +
    `<rect x="${n(x + .8)}" y="${n(y + .8)}" width="${n(w - 1.6)}" height="${n(h - 1.6)}" rx="${r}" fill="none" stroke="#fff" stroke-opacity=".22"/>` +
    `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${r}" fill="none" stroke="#050a14" stroke-opacity=".6" stroke-width="1.2"/>${rv}</g>`;
}

/** Varilla/cilindro vertical (pilote, guia, tubo) con luz lateral y vetas pulidas. */
export function rod(s, {x, y, w, h, tone = '#9aa6b8', cap = true, texture = .6} = {}) {
  s.use('materials');
  const g = linear(s, 'rod' + key(tone), [[0, dark(tone, .55)], [.2, tone], [.34, lite(tone, .55)], [.55, tone], [.85, dark(tone, .4)], [1, dark(tone, .65)]], {x1: 0, y1: 0, x2: 1, y2: 0});
  const f = brushFilter(s, 'v');
  const capEl = cap ? `<rect x="${n(x - w * .12)}" y="${n(y)}" width="${n(w * 1.24)}" height="${n(Math.max(3, w * .22))}" rx="2" fill="${lite(tone, .15)}" stroke="#050a14" stroke-opacity=".5"/>` : '';
  return `<g><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${g}"/><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="#fff" filter="${f}" opacity="${texture}"/>${capEl}</g>`;
}

/** Tablon de madera con veta horizontal. */
export function wood(s, {x, y, w, h, tone = '#8a5a34', seed = 2} = {}) {
  s.use('materials');
  const g = linear(s, 'wood' + key(tone), [[0, lite(tone, .22)], [.5, tone], [1, dark(tone, .38)]]);
  s.defs('woodf', `<filter id="${s.gid('woodf')}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency=".006 .22" numOctaves="3" seed="${seed}" result="n"/>` +
    `<feColorMatrix in="n" type="matrix" values="0 0 0 0 .12  0 0 0 0 .06  0 0 0 0 .02  0 -3 0 0 1.5" result="d"/>` +
    `<feComposite in="d" in2="SourceAlpha" operator="in"/></filter>`);
  return `<g><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${g}"/><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="#fff" filter="${s.url('woodf')}" opacity=".75"/>` +
    `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="2" fill="#fff" opacity=".18"/><rect x="${n(x)}" y="${n(y + h - 2)}" width="${n(w)}" height="2" fill="#000" opacity=".3"/></g>`;
}

/**
 * Estratos de tierra con limites ondulados, grano y guijarros.
 * layers: [{h, tone}] de arriba abajo; x/w el ancho (usa bleed para cubrir la camara).
 */
export function soil(s, {x = -s.bleed, y, w = s.W + 2 * s.bleed, layers, pebbles = 70, seed = 5} = {}) {
  s.use('materials');
  if (!Array.isArray(layers) || !layers.length) throw Error('soil: indicar layers [{h,tone}].');
  s.defs('soilf', `<filter id="${s.gid('soilf')}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency=".05 .09" numOctaves="3" seed="${seed}" result="n"/>` +
    `<feColorMatrix in="n" type="matrix" values="0 0 0 0 .04  0 0 0 0 .02  0 0 0 0 0  0 -2.2 0 0 1.05" result="d"/>` +
    `<feComposite in="d" in2="SourceAlpha" operator="in"/></filter>`);
  const r = seededRandom(seed);
  let yy = y, out = '';
  const total = layers.reduce((a, l) => a + l.h, 0), bottom = y + total;
  layers.forEach((l, i) => {
    const amp = 4 + r() * 5, ph = r() * 6.28, freq = .012 + r() * .014;
    let d = `M${n(x)} ${n(bottom)}L${n(x)} ${n(yy)}`;
    for (let px = x; px <= x + w + 20; px += 20) d += `L${n(px)} ${n(yy + (i ? Math.sin(px * freq + ph) * amp : 0), 1)}`;
    d += `L${n(x + w)} ${n(bottom)}Z`;
    const g = linear(s, 'soil' + i, [[0, lite(l.tone, .08)], [1, dark(l.tone, .2)]]);
    out += `<path d="${d}" fill="${g}"/>`;
    yy += l.h;
  });
  out += `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(total)}" fill="#fff" filter="${s.url('soilf')}" opacity=".6"/>`;
  for (let i = 0; i < pebbles; i++) out += `<ellipse cx="${n(x + r() * w, 1)}" cy="${n(y + 14 + r() * (total - 20), 1)}" rx="${n(1 + r() * 2.6)}" ry="${n(.8 + r() * 1.6)}" fill="${r() > .45 ? '#d9c7a4' : '#2a1a10'}" opacity="${n(.25 + r() * .5)}"/>`;
  out += `<rect x="${n(x)}" y="${n(y - 1)}" width="${n(w)}" height="3" fill="#fff" opacity=".12"/>`;
  return `<g>${out}</g>`;
}

