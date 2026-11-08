// Objetos de historia: velas, marco dorado con figura yacente, petalos, pergamino con pluma, sello de lacre,
// sello de tinta, libro abierto con versiculo resaltado y ojo en primer plano. Geometria SVG determinista.
import {n, checkTime, seededRandom} from './scene-kit.mjs';
import {shockwave} from './fx-kit.mjs';
import {hide, fx, tw, put, fitRepeats, esc, fitSize} from './kit-util.mjs';

/** Vela con llama que titila (opacidad acotada a la escena). */
export function candle(s, {x, y, h = 70, at = 0, dur = s.duration - at, layer = 'fg'} = {}) {
  checkTime(s, at, dur, 'candle'); s.use('props');
  const c = s.nid('flame');
  s.add(layer, `<g><rect x="${x - 5}" y="${y - h}" width="10" height="${h}" fill="#efe6cf"/><ellipse class="${c}" cx="${x}" cy="${y - h - 8}" rx="5" ry="12" fill="#ffb33a"/><circle cx="${x}" cy="${y - h - 8}" r="34" fill="#ffb33a" opacity=".18"/></g>`);
  fx(s, '.' + c, {opacity: .6}, {opacity: 1, repeat: fitRepeats(dur, .4), yoyo: true}, at, .4, 'sine.inOut');
  return {cls: c};
}

/** Cruz dorada y aureola como fragmentos reutilizables dentro de figuras (devuelven marcado SVG). */
export const crossMarkup = (x, y, h = 46, color = '#d6a93e') => `<rect x="${x - 5}" y="${y}" width="10" height="${h}" fill="${color}"/><rect x="${x - 17}" y="${y + h * .28}" width="34" height="9" fill="${color}"/>`;
export const haloMarkup = (x, y, rx = 120, ry = 150, color = '#e8d6a8', opacity = .22) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${color}" opacity="${opacity}"/>`;

/**
 * Figura yacente vista desde arriba, centrada en (0,0), para meter dentro de closeUp(). kind: 'nun'|'monk'|'shroud'.
 * Es una silueta editorial: rostro, manos cruzadas, rosario y cruz.
 */
export function recumbentFigure({kind = 'nun', habit = '#14100e', skin = '#d9b394'} = {}) {
  const veil = kind === 'nun' ? '#efe7d8' : kind === 'monk' ? '#4a3220' : '#e7e2d6';
  const body = kind === 'monk' ? '#4a3220' : kind === 'shroud' ? '#e7e2d6' : habit;
  const beard = kind === 'monk' ? `<path d="M-30 -96Q0 -40 30 -96Q18 -70 0 -66Q-18 -70 -30 -96Z" fill="#cfc7b8"/>` : '';
  return haloMarkup(0, -140) +
    `<path d="M-72 -110Q-112 40 -92 250L92 250Q112 40 72 -110Z" fill="${body}"/><path d="M-72 -110Q-96 40 -80 250" stroke="#000" stroke-opacity=".22" stroke-width="10" fill="none"/>` +
    `<path d="M-74 -168Q0 -236 74 -168L64 -78Q0 -56 -64 -78Z" fill="${veil}"/><ellipse cx="0" cy="-128" rx="42" ry="54" fill="${skin}"/>` +
    `<path d="M-22 -134Q-14 -128 -6 -134M8 -134Q16 -128 24 -134" stroke="#5b3a2a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M1 -126L-3 -108L4 -106" stroke="#b8896a" stroke-width="2.4" fill="none"/>` +
    (kind === 'monk' ? beard : `<path d="M-12 -92Q1 -86 14 -92" stroke="#8a4f3a" stroke-width="3" fill="none" stroke-linecap="round"/>`) +
    `<ellipse cx="-14" cy="52" rx="34" ry="17" fill="${skin}" transform="rotate(-18 -14 52)"/><ellipse cx="14" cy="56" rx="34" ry="17" fill="#e0bb9c" transform="rotate(18 14 56)"/>` +
    `<path d="M0 66Q-6 130 0 176" stroke="#c9a24a" stroke-width="3" stroke-dasharray="5 7" fill="none"/>` + crossMarkup(0, 170, 46);
}

/** Panel de primer plano con marco dorado (aparece con fundido y escala). `inner` se centra en (0,0). Capa hud por defecto. */
export function closeUp(s, {x = 360, y = 700, w = 420, h = 600, inner = '', fill = '#6b1727', at = .3, dur = .6, layer = 'hud', cls} = {}) {
  checkTime(s, at, dur, 'closeUp'); s.use('props');
  const c = cls ?? s.nid('closeup');
  s.add(layer, `<g transform="translate(${x} ${y})"><g class="${c}"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="22" fill="#4b0f1d"/><rect x="${-w / 2 + 20}" y="${-h / 2 + 20}" width="${w - 40}" height="${h - 40}" rx="14" fill="${fill}"/>${inner}<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="22" fill="none" stroke="#d6a93e" stroke-width="9"/></g></g>`);
  hide(s, [c]); fx(s, '.' + c, {opacity: 0, scale: .92, svgOrigin: '0 0'}, {opacity: 1, scale: 1, svgOrigin: '0 0'}, at, dur);
  return {cls: c};
}

/** Petalos que caen con escalonado (todos terminan antes de at+dur). Capa hud por defecto. */
export function petals(s, {x = 360, y = 360, w = 300, count = 5, at = 0, dur = 2.4, fall = 700, color = '#c8243a', seed = 4, layer = 'hud'} = {}) {
  checkTime(s, at, dur, 'petals'); s.use('props');
  const r = seededRandom(seed), fallDur = Math.max(.4, dur * .65), gap = count > 1 ? (dur - fallDur) / (count - 1) : 0, c = s.nid('petal');
  s.add(layer, Array.from({length: count}, (_, i) => { const px = x + (r() - .5) * w, py = y - r() * 60; return `<ellipse class="${c} ${c}-${i}" cx="${n(px, 1)}" cy="${n(py, 1)}" rx="11" ry="7" fill="${color}" transform="rotate(${n(i * 40 + r() * 30, 0)} ${n(px, 1)} ${n(py, 1)})"/>`; }).join(''));
  hide(s, [c]);
  for (let i = 0; i < count; i++) fx(s, `.${c}-${i}`, {y: 0, opacity: 0}, {y: fall, opacity: 1}, at + i * gap, fallDur, 'sine.in');
  return {cls: c};
}

/** Pergamino con titulo (x,y = esquina superior izquierda), lineas de texto y firma que se escribe con pluma. Devuelve {signY, sealY} para ubicar un sello. Capa fg. */
export function parchment(s, {x = 104, y = 260, w = 512, h = 690, rotate = -3, title = '', lines = 11, signature = '', signAt = 1.1, signDur = 1.0, at = 0, dur = .6, quill = true, uid = 'parch'} = {}) {
  checkTime(s, at, dur, 'parchment'); checkTime(s, signAt, signDur, 'parchment firma'); s.use('props');
  const sheet = s.nid(uid), lin = s.nid(uid + 'l'), cp = s.nid(uid + 'c'), qu = s.nid(uid + 'q');
  s.defs('paper', `<linearGradient id="${s.gid('paper')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ecd9a8"/><stop offset="1" stop-color="#cbae74"/></linearGradient>`);
  s.defs('rough', `<filter id="${s.gid('rough')}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="4"/><feDisplacementMap in="SourceGraphic" scale="10"/></filter>`);
  const cx = x + w / 2, cy = y + h / 2, tx = x + 12, ty = y + h * .77, sw = w - 120, sz = Math.min(46, sw / Math.max(6, signature.length * .5));
  s.defs(cp, `<clipPath id="${s.gid(cp)}"><rect class="${cp}" x="${tx}" y="${ty - sz}" width="0" height="${n(sz * 1.6)}"/></clipPath>`);
  const dash = Array.from({length: lines}, (_, i) => `<path d="M${x + 46} ${y + 120 + i * 30}H${x + 46 + (i % 4 === 3 ? (w - 92) * .6 : w - 92)}" stroke="#7c5d32" stroke-opacity=".5" stroke-width="7" stroke-linecap="round" stroke-dasharray="${16 + (i % 3) * 6} 7"/>`).join('');
  s.add('fg', `<g class="${sheet}"><g transform="rotate(${rotate} ${cx} ${cy})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#000" opacity=".3" transform="translate(10 14)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${s.url('paper')}" filter="${s.url('rough')}"/>` +
    `<ellipse cx="${x + w * .78}" cy="${y + 100}" rx="70" ry="40" fill="#8a5a1c" opacity=".12"/><ellipse cx="${x + 86}" cy="${y + h - 80}" rx="90" ry="44" fill="#8a5a1c" opacity=".1"/>` +
    (title ? `<text x="${cx}" y="${y + 70}" text-anchor="middle" font-family="Georgia,serif" font-size="${n(fitSize(title, w - 80, 30, .62))}" font-weight="700" fill="#9b6a1c" letter-spacing="3">${esc(title)}</text>` : '') +
    `<g class="${lin}">${dash}</g>` +
    (signature ? `<g clip-path="${s.url(cp)}"><text x="${tx}" y="${ty}" font-family="Georgia,serif" font-style="italic" font-weight="700" font-size="${n(sz)}" fill="#b3231f" textLength="${n(sw)}" lengthAdjust="spacingAndGlyphs">${esc(signature)}</text></g>` : '') + `</g>` +
    (quill && signature ? `<g class="${qu}"><path d="M0 0L60 -150Q80 -190 120 -210Q112 -170 96 -130Q80 -80 36 -40Z" fill="#f6f1e6" stroke="#c9bfa8"/><path d="M0 0L88 -168" stroke="#b8ad95" stroke-width="2"/><path d="M0 0L-8 8L6 4Z" fill="#2a1a10"/></g>` : '') + `</g>`);
  hide(s, [sheet, qu, ...(quill ? [] : [])]);
  fx(s, '.' + sheet, {opacity: 0, y: 150}, {opacity: 1, y: 0}, at, dur, 'power3.out');
  s.js(`tl.fromTo(S+' .${lin} path',{opacity:0},{opacity:1,duration:.12,stagger:.07,immediateRender:false},T0+${n(at + dur + .1)});`);
  s.touch(at + dur + .1 + .12 + .07 * (lines - 1));
  if (signature) {
    fx(s, '.' + cp, {attr: {width: 0}}, {attr: {width: n(sw)}}, signAt, signDur, 'none');
    if (quill) {
      fx(s, '.' + qu, {opacity: 0, x: tx, y: ty}, {opacity: 1, x: tx, y: ty}, Math.max(0, signAt - .2), .2);
      fx(s, '.' + qu, {x: tx, y: ty}, {x: tx + sw, y: ty - 10}, signAt, signDur, 'none');
      if (signAt + signDur + .3 <= s.duration) tw(s, '.' + qu, {opacity: 0, y: ty + 100}, signAt + signDur + .05, .25);
    }
  }
  return {sheet, signY: ty, sealY: ty + 90, sealX: cx, bottom: y + h};
}

/** Sello de lacre que cae con impacto y onda. emblem: 'keys'|'cross'|'star'. Capa fg. */
export function waxSeal(s, {x = 360, y = 880, r = 62, emblem = 'keys', at = 2.5, dur = .22, wave = true} = {}) {
  checkTime(s, at, dur + .5, 'waxSeal'); s.use('props');
  const c = s.nid('seal');
  s.defs('wax', `<radialGradient id="${s.gid('wax')}" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#e0413a"/><stop offset="1" stop-color="#7d1410"/></radialGradient>`);
  const em = emblem === 'cross' ? `<path d="M${x} ${y - r * .55}V${y + r * .55}M${x - r * .35} ${y - r * .15}H${x + r * .35}" stroke="#f0c8a8" stroke-width="9" stroke-linecap="round"/>`
    : emblem === 'star' ? `<path d="M${x} ${y - r * .55}L${x + r * .16} ${y - r * .17}L${x + r * .55} ${y - r * .15}L${x + r * .25} ${y + r * .1}L${x + r * .35} ${y + r * .5}L${x} ${y + r * .27}L${x - r * .35} ${y + r * .5}L${x - r * .25} ${y + r * .1}L${x - r * .55} ${y - r * .15}L${x - r * .16} ${y - r * .17}Z" fill="#f0c8a8"/>`
      : `<path d="M${x - r * .35} ${y + r * .42}L${x + r * .35} ${y - r * .42}M${x + r * .35} ${y + r * .42}L${x - r * .35} ${y - r * .42}" stroke="#f0c8a8" stroke-width="9" stroke-linecap="round"/><circle cx="${n(x - r * .45)}" cy="${n(y - r * .5)}" r="9" fill="none" stroke="#f0c8a8" stroke-width="5"/><circle cx="${n(x + r * .45)}" cy="${n(y - r * .5)}" r="9" fill="none" stroke="#f0c8a8" stroke-width="5"/>`;
  s.add('fg', `<g class="${c}"><circle cx="${x}" cy="${y}" r="${r}" fill="${s.url('wax')}"/><circle cx="${x}" cy="${y}" r="${n(r * .74)}" fill="none" stroke="#a02820" stroke-width="3"/>${em}</g>`);
  hide(s, [c]); fx(s, '.' + c, {opacity: 0, scale: 2.2, svgOrigin: `${x} ${y}`}, {opacity: 1, scale: 1, svgOrigin: `${x} ${y}`}, at, dur, 'power3.in');
  if (wave) shockwave(s, {cx: x, cy: y, r: r * 2, at: at + dur, dur: .5, color: '#ffd9a0', layer: 'fg'});
  return {cls: c};
}

/** Sello de tinta que golpea la pagina (ej. «NO CUENTA»). Capa fg. */
export function stamp(s, {x = 360, y = 800, text, color = '#c0262b', angle = -8, size = 44, at = 2, dur = .2, w} = {}) {
  if (!text) throw Error('stamp: indicar text.');
  checkTime(s, at, dur, 'stamp'); s.use('props');
  const c = s.nid('stamp'), tw0 = w ?? Math.min(480, text.length * size * .62 + 40);
  s.add('fg', `<g transform="translate(${x} ${y}) rotate(${angle})"><g class="${c}"><rect x="${-tw0 / 2}" y="${-size * .85}" width="${n(tw0)}" height="${n(size * 1.5)}" rx="6" fill="none" stroke="${color}" stroke-width="6"/><rect x="${-tw0 / 2 + 8}" y="${-size * .85 + 8}" width="${n(tw0 - 16)}" height="${n(size * 1.5 - 16)}" rx="3" fill="none" stroke="${color}" stroke-width="2"/><text x="0" y="${n(size * .3)}" text-anchor="middle" font-size="${size}" font-weight="900" fill="${color}" letter-spacing="3" textLength="${n(tw0 - 40)}" lengthAdjust="spacingAndGlyphs">${esc(text)}</text></g></g>`);
  hide(s, [c]); fx(s, '.' + c, {opacity: 0, scale: 2, svgOrigin: '0 0'}, {opacity: .94, scale: 1, svgOrigin: '0 0'}, at, dur, 'power3.in');
  return {cls: c};
}

/**
 * Libro abierto visto desde arriba: una hoja que gira, versiculo con resaltador y cita.
 * verse: lineas (max 3); la tipografia se ajusta al ancho de pagina. Capa fg.
 */
export function openBook(s, {x = 360, y = 628, w = 596, h = 784, heading = 'LUCAS', ref = '23,43', verse = ['«Hoy estarás conmigo', 'en el paraíso».'], flipAt = .3, flipDur = .9, hlAt = 2.0, hlDur = .8} = {}) {
  checkTime(s, flipAt, flipDur, 'openBook giro'); checkTime(s, hlAt, hlDur, 'openBook resaltado'); s.use('props');
  const leaf = s.nid('leaf'), shade = s.nid('shade'), hl = s.nid('hl'), L = x - w / 2, T = y - h / 2, pw = (w - 44) / 2, spine = x;
  s.defs('pg', `<linearGradient id="${s.gid('pg')}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cdb98f"/><stop offset=".12" stop-color="#f3e6c4"/><stop offset="1" stop-color="#efe0b8"/></linearGradient>`);
  s.defs('pgl', `<linearGradient id="${s.gid('pgl')}" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#cdb98f"/><stop offset=".12" stop-color="#f3e6c4"/><stop offset="1" stop-color="#efe0b8"/></linearGradient>`);
  const dl = (px, py, count, ww) => Array.from({length: count}, (_, i) => `<path d="M${px} ${py + i * 26}H${px + (i % 5 === 4 ? ww * .55 : ww)}" stroke="#6b5a40" stroke-opacity=".45" stroke-width="6" stroke-linecap="round" stroke-dasharray="${14 + (i % 4) * 5} 6"/>`).join('');
  const tx = spine + 32, fs = Math.min(...verse.map(v => fitSize(v, pw - 60, 22, .5))), vy = T + h * .43;
  s.add('fg', `<rect x="${L}" y="${T}" width="${w}" height="${h}" rx="16" fill="#3b2210" stroke="#d6a93e" stroke-opacity=".6" stroke-width="3"/>` +
    `<rect x="${L + 16}" y="${T + 20}" width="${pw}" height="${h - 40}" fill="${s.url('pgl')}"/><rect x="${spine}" y="${T + 20}" width="${pw}" height="${h - 40}" fill="${s.url('pg')}"/>` +
    dl(L + 42, T + 64, 26, pw - 52) +
    `<text x="${spine + pw / 2}" y="${T + 80}" text-anchor="middle" font-family="Georgia,serif" font-size="22" font-weight="700" fill="#a22a22" letter-spacing="4">${esc(heading)}</text>` + dl(tx, T + 114, 8, pw - 56) +
    `<rect class="${hl}" x="${tx - 8}" y="${n(vy - 34)}" width="${n(pw - 44)}" height="${n(26 + verse.length * (fs + 8) + 18)}" fill="#f5c542" opacity=".6"/>` +
    `<text x="${tx}" y="${n(vy)}" font-family="Georgia,serif" font-size="20" font-weight="700" fill="#a22a22">${esc(ref)}</text>` +
    verse.map((v, i) => `<text x="${tx}" y="${n(vy + 32 + i * (fs + 8))}" font-family="Georgia,serif" font-size="${n(fs)}" fill="#2c1d10">${esc(v)}</text>`).join('') + dl(tx, vy + 60 + verse.length * (fs + 8), 9, pw - 56) +
    `<g class="${leaf}"><rect x="${spine}" y="${T + 20}" width="${pw}" height="${h - 40}" fill="${s.url('pg')}"/>${dl(tx, T + 64, 26, pw - 56)}<rect class="${shade}" x="${spine}" y="${T + 20}" width="${pw}" height="${h - 40}" fill="#000" opacity="0"/></g>` +
    `<rect x="${spine - 8}" y="${T + 20}" width="16" height="${h - 40}" fill="#000" opacity=".18"/>`);
  fx(s, '.' + leaf, {scaleX: 1, svgOrigin: `${spine} ${y}`}, {scaleX: -1, svgOrigin: `${spine} ${y}`}, flipAt, flipDur, 'power2.inOut');
  fx(s, '.' + shade, {opacity: 0}, {opacity: .4, yoyo: true, repeat: 1}, flipAt, flipDur / 2, 'sine.inOut');
  put(s, '.' + hl, {scaleX: 0, svgOrigin: `${tx - 8} ${y}`}, 0);
  fx(s, '.' + hl, {scaleX: 0, svgOrigin: `${tx - 8} ${y}`}, {scaleX: 1, svgOrigin: `${tx - 8} ${y}`}, hlAt, hlDur, 'power2.inOut');
  return {verseY: vy, rightPage: [spine, T + 20, pw, h - 40]};
}

/**
 * Ojo en primer plano para acercar la camara a la pupila. figures: siluetas pequenas reflejadas en la pupila.
 * ring: anillo dorado que se dibuja alrededor de la silueta marcada. Devuelve {center, pupil, target} para camera.move().
 */
export function eye(s, {x = 360, y = 640, iris = 152, pupil = 64, figures = 6, ringAt = 3.0, ringDur = .8, revealAt = 2.2, revealDur = .7, pulse = true} = {}) {
  checkTime(s, revealAt, revealDur, 'eye reflejos'); checkTime(s, ringAt, ringDur, 'eye anillo'); s.use('props');
  const rp = s.nid('pupil'), rf = s.nid('refl'), rg = s.nid('ring'), W = 290;
  s.defs('eskin', `<radialGradient id="${s.gid('eskin')}" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#d6a984"/><stop offset="1" stop-color="#7d5239"/></radialGradient>`);
  s.defs('escl', `<radialGradient id="${s.gid('escl')}" cx=".5" cy=".5" r=".6"><stop offset=".5" stop-color="#f4eee6"/><stop offset="1" stop-color="#c9b8a8"/></radialGradient>`);
  s.defs('eiris', `<radialGradient id="${s.gid('eiris')}" cx=".5" cy=".5" r=".5"><stop offset=".3" stop-color="#8a5a2a"/><stop offset=".75" stop-color="#5a3414"/><stop offset="1" stop-color="#241208"/></radialGradient>`);
  const outline = `M${x - W} ${y}Q${x} ${y - 240} ${x + W} ${y}Q${x} ${y + 220} ${x - W} ${y}Z`;
  s.defs('eclip', `<clipPath id="${s.gid('eclip')}"><path d="${outline}"/></clipPath>`);
  const rays = Array.from({length: 36}, (_, i) => { const a = i * 10 * Math.PI / 180; return `<path d="M${n(x + pupil * 1.03 * Math.cos(a))} ${n(y + pupil * 1.03 * Math.sin(a))}L${n(x + iris * Math.cos(a))} ${n(y + iris * Math.sin(a))}" stroke="#c98a4a" stroke-opacity=".3" stroke-width="3"/>`; }).join('');
  const fig = (px, py, k) => `<g transform="translate(${n(px, 1)} ${n(py, 1)}) scale(${k})"><circle cy="-22" r="7" fill="#f1dcb4"/><path d="M-9 0Q-10 -14 0 -15Q10 -14 9 0Z" fill="#f1dcb4"/></g>`;
  const cnt = Math.max(1, figures), fy = y + pupil * .42;
  const figs = Array.from({length: cnt - 1}, (_, i) => fig(x - 28 + i * (56 / Math.max(1, cnt - 2)), fy - (i % 2) * 8, 1.05 + (i % 3) * .05)).join('');
  const target = [x + 6, fy + 30];
  s.add('fg', `<rect x="${x - 700}" y="${y - 700}" width="1400" height="1500" fill="${s.url('eskin')}"/>` +
    `<path d="M${x - 320} ${y - 170}Q${x} ${y - 310} ${x + 320} ${y - 170}" stroke="#2c1a10" stroke-width="40" stroke-linecap="round" fill="none"/>` +
    `<path d="${outline}" fill="${s.url('escl')}"/><g clip-path="${s.url('eclip')}"><circle cx="${x}" cy="${y}" r="${iris}" fill="${s.url('eiris')}"/>${rays}<circle cx="${x}" cy="${y}" r="${iris}" fill="none" stroke="#1a0d05" stroke-width="10"/>` +
    `<circle class="${rp}" cx="${x}" cy="${y}" r="${pupil}" fill="#050302"/><g class="${rf}">${figs}${fig(target[0], target[1] - 10, 1.0)}</g>` +
    `<ellipse cx="${x - 42}" cy="${y - 36}" rx="20" ry="13" fill="#fff" opacity=".9" transform="rotate(-30 ${x - 42} ${y - 36})"/></g>` +
    `<path d="M${x - W} ${y}Q${x} ${y - 240} ${x + W} ${y}" fill="none" stroke="#1a0d08" stroke-width="12" stroke-linecap="round"/><path d="M${x - W} ${y}Q${x} ${y + 220} ${x + W} ${y}" fill="none" stroke="#6b3d28" stroke-width="5"/>` +
    `<circle class="${rg}" cx="${target[0]}" cy="${target[1] - 18}" r="22" fill="none" stroke="#f3c13c" stroke-width="3" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/>`);
  hide(s, [rf]);
  fx(s, '.' + rf, {opacity: 0}, {opacity: 1}, revealAt, revealDur);
  fx(s, '.' + rg, {strokeDashoffset: 1}, {strokeDashoffset: 0}, ringAt, ringDur);
  if (pulse) fx(s, '.' + rp, {scale: .9, svgOrigin: `${x} ${y}`}, {scale: 1.06, svgOrigin: `${x} ${y}`}, 0, .9, 'sine.inOut');
  return {center: [x, y], pupil: [x, y], target: [target[0], target[1] - 10]};
}
