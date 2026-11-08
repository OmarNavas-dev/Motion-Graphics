// Piezas de mecanismos con movimiento fisicamente coherente. Devuelven SVG (s.add) y registran su GSAP.
// El pistón-biela-cigüeñal usa la cinematica real muestreada (no un seno aproximado).
import {n, seededRandom, checkTime} from './scene-kit.mjs';
import {rod, steel, mix} from './materials-kit.mjs';
import {INK} from './callouts-kit.mjs';

const hide = (s, classes) => s.css(`__SCENE__ ${classes.map(c => '.' + c).join(',__SCENE__ ')}{opacity:0}`);

/** Dos guias verticales con tapas (por donde corre una masa). Devuelve {svg, left, right}. */
export function rails(s, {x, y, h, gap, w = 10, tone = '#9aa6b8'} = {}) {
  s.use('mechanism');
  const lx = x - gap / 2 - w / 2, rx = x + gap / 2 - w / 2;
  return {svg: rod(s, {x: lx, y, w, h, tone}) + rod(s, {x: rx, y, w, h, tone}), left: lx + w / 2, right: rx + w / 2};
}

/**
 * Camara de combustion en corte: paredes rayadas, interior oscuro y capa de brillo.
 * Devuelve {svg, cls, inner:{x,y,w,h}}; usar chamberGlow() y gasDots() con el resultado.
 */
export function chamber(s, {x, y, w, h, wall = 24} = {}) {
  s.use('mechanism');
  const c = s.nid('ch');
  s.defs('hatch', `<pattern id="${s.gid('hatch')}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#17233f"/><line x1="0" y1="0" x2="0" y2="7" stroke="#cdd8ee" stroke-width="2.6"/></pattern>`);
  s.defs('fglow', `<radialGradient id="${s.gid('fglow')}"><stop offset="0" stop-color="#fff6d6"/><stop offset=".3" stop-color="#ffb347"/><stop offset=".7" stop-color="#ff5a1f" stop-opacity=".7"/><stop offset="1" stop-color="#ff5a1f" stop-opacity="0"/></radialGradient>`);
  const ix = x + wall, iw = w - 2 * wall;
  const svg = `<g><rect x="${n(ix)}" y="${n(y)}" width="${n(iw)}" height="${n(h)}" fill="#050a18"/>` +
    `<rect class="${c}-glow" x="${n(ix)}" y="${n(y)}" width="${n(iw)}" height="${n(h)}" fill="${s.url('fglow')}" style="mix-blend-mode:screen"/>` +
    `<rect x="${n(x)}" y="${n(y)}" width="${n(wall)}" height="${n(h)}" fill="${s.url('hatch')}" stroke="#cdd8ee" stroke-opacity=".7"/>` +
    `<rect x="${n(x + w - wall)}" y="${n(y)}" width="${n(wall)}" height="${n(h)}" fill="${s.url('hatch')}" stroke="#cdd8ee" stroke-opacity=".7"/></g>`;
  hide(s, [c + '-glow']);
  return {svg, cls: c, inner: {x: ix, y, w: iw, h}};
}

/** Brillo de ignicion: sube rapido y decae. */
export function chamberGlow(s, ch, {at, rise = .12, decay = .6, peak = 1} = {}) {
  checkTime(s, at, rise + decay, 'chamberGlow'); s.use('mechanism');
  s.js(`tl.fromTo(S+' .${ch.cls}-glow',{opacity:0},{opacity:${n(peak)},duration:${n(rise, 3)},ease:'power2.out',immediateRender:false},T0+${n(at)});tl.to(S+' .${ch.cls}-glow',{opacity:0,duration:${n(decay, 3)},ease:'power2.in'},T0+${n(at + rise, 3)});`);
}

/** Puntitos de aire/combustible dentro de la camara; `squeeze` los comprime hacia el fondo (compresion). */
export function gasDots(s, ch, {count = 36, color = '#cfe6ff', r = 2.2, at, dur = .8, squeeze = .45, out, seed = 6} = {}) {
  checkTime(s, at, dur, 'gasDots'); s.use('mechanism');
  const c = s.nid('gas'), rnd = seededRandom(seed), {x, y, w, h} = ch.inner;
  let dots = ''; for (let i = 0; i < count; i++) dots += `<circle cx="${n(x + 6 + rnd() * (w - 12), 1)}" cy="${n(y + 6 + rnd() * (h - 12), 1)}" r="${n(r * (.6 + rnd() * .8), 1)}" fill="${color}"/>`;
  s.add('fg', `<g class="${c}">${dots}</g>`); hide(s, [c]);
  s.js(`tl.fromTo(S+' .${c}',{opacity:0,scaleY:1},{opacity:.95,duration:.25,immediateRender:false},T0+${n(at)});tl.fromTo(S+' .${c}',{scaleY:1,svgOrigin:'${n(x + w / 2, 1)} ${n(y + h, 1)}'},{scaleY:${n(1 - squeeze, 3)},svgOrigin:'${n(x + w / 2, 1)} ${n(y + h, 1)}',immediateRender:false,duration:${n(dur, 3)},ease:'power2.in'},T0+${n(at + .1, 3)});` +
    (out === undefined ? '' : `tl.to(S+' .${c}',{opacity:0,duration:.2},T0+${n(out)});`));
  return c;
}

/**
 * Piston-biela-cigueñal. Geometria en px: r = radio de manivela (carrera = 2r), L = longitud de biela.
 * Devuelve {svg, animate(at,dur,{cycles,samples,phase}), geo:{tdcY,bdcY,pinX,pinY,cx,cy}}.
 */
export function pistonCrank(s, {cx, cy, r = 34, L = 118, bore = 66, tone = '#aab6c9'} = {}) {
  if (L <= r * 1.2) throw Error('pistonCrank: la biela debe ser bastante mas larga que la manivela.');
  s.use('mechanism');
  const c = s.nid('pc'), tdcY = cy - (r + L), bdcY = cy - (L - r);
  s.defs(c + 'p', `<linearGradient id="${s.gid(c + 'p')}" x1="0" x2="1"><stop offset="0" stop-color="#4b566b"/><stop offset=".3" stop-color="#e6edf8"/><stop offset=".7" stop-color="#9aa6b8"/><stop offset="1" stop-color="#3b455a"/></linearGradient>`);
  s.defs(c + 'w', `<radialGradient id="${s.gid(c + 'w')}" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#c3cddd"/><stop offset=".6" stop-color="#6c7890"/><stop offset="1" stop-color="#2b3448"/></radialGradient>`);
  const hb = bore / 2, wr = r * 1.9;
  const piston = `<g class="${c}-piston" transform="translate(${n(cx, 1)} ${n(tdcY, 1)})"><g class="${c}-pv">` +
    `<rect x="${n(-hb)}" y="${n(-bore * .55)}" width="${n(bore)}" height="${n(bore * .82)}" rx="4" fill="${s.url(c + 'p')}" stroke="#0a1020" stroke-opacity=".7"/>` +
    [.12, .22, .32].map(k => `<line x1="${n(-hb)}" x2="${n(hb)}" y1="${n(-bore * .55 + bore * k)}" y2="${n(-bore * .55 + bore * k)}" stroke="#0a1020" stroke-opacity=".55" stroke-width="2"/>`).join('') +
    `<circle r="6" fill="#2a3246" stroke="#cfd8ea" stroke-width="1.5"/></g></g>`;
  const rodSvg = `<g class="${c}-rod"><line x1="${n(cx, 1)}" y1="${n(cy - r, 1)}" x2="${n(cx, 1)}" y2="${n(tdcY, 1)}" stroke="#101729" stroke-width="12" stroke-linecap="round"/>` +
    `<line x1="${n(cx, 1)}" y1="${n(cy - r, 1)}" x2="${n(cx, 1)}" y2="${n(tdcY, 1)}" stroke="${tone}" stroke-width="7.5" stroke-linecap="round"/></g>`;
  const crank = `<g class="${c}-crank"><circle cx="${n(cx, 1)}" cy="${n(cy, 1)}" r="${n(wr, 1)}" fill="${s.url(c + 'w')}" stroke="#0a1020" stroke-opacity=".7" stroke-width="2"/>` +
    `<path d="M${n(cx, 1)} ${n(cy, 1)}L${n(cx - wr * .8, 1)} ${n(cy + wr * .55, 1)}A${n(wr * .97, 1)} ${n(wr * .97, 1)} 0 0 0 ${n(cx + wr * .8, 1)} ${n(cy + wr * .55, 1)}Z" fill="#1c2438" fill-opacity=".55"/>` +
    `<circle cx="${n(cx, 1)}" cy="${n(cy - r, 1)}" r="7" fill="#d8e0ee" stroke="#0a1020" stroke-width="1.5"/></g>` +
    `<circle cx="${n(cx, 1)}" cy="${n(cy, 1)}" r="5" fill="#e6edf8" stroke="#0a1020"/>`;
  return {
    svg: rodSvg + piston + crank, cls: c, geo: {tdcY, bdcY, cx, cy, r, L},
    /** cycles = vueltas completas del cigueñal; samples = muestras por vuelta (24 suele bastar). */
    animate(at, dur, {cycles = 1, samples = 24, phase = 0} = {}) {
      checkTime(s, at, dur, 'pistonCrank');
      const N = Math.max(4, Math.round(cycles * samples)), rk = [], pk = [], dt = n(dur / N, 4), ph = phase * Math.PI / 180;
      for (let i = 1; i <= N; i++) {
        const th = ph + 2 * Math.PI * cycles * i / N, px = cx + r * Math.sin(th), py = cy - r * Math.cos(th);
        const y = cy - (r * Math.cos(th) + Math.sqrt(L * L - r * r * Math.sin(th) ** 2));
        rk.push(`{attr:{x1:${n(px, 1)},y1:${n(py, 1)},y2:${n(y, 1)}},duration:${dt}}`);
        pk.push(`{y:${n(y - tdcY, 1)},duration:${dt}}`);
      }
      s.js(`tl.fromTo(S+' .${c}-crank',{rotation:${n(phase)},svgOrigin:'${n(cx, 1)} ${n(cy, 1)}'},{rotation:${n(phase + 360 * cycles)},svgOrigin:'${n(cx, 1)} ${n(cy, 1)}',duration:${n(dur, 3)},ease:'none',immediateRender:false},T0+${n(at)});` +
        `tl.to(S+' .${c}-rod line',{keyframes:[${rk.join(',')}],ease:'none'},T0+${n(at)});` +
        `tl.to(S+' .${c}-pv',{keyframes:[${pk.join(',')}],ease:'none'},T0+${n(at)});`);
    },
  };
}

/** Engranaje de dientes trapezoidales. Para engranar dos: fase del segundo = 180/dientes y giro opuesto. */
export function gear(s, {cx, cy, teeth = 14, r = 44, depth = 7, tone = '#9aa6b8', spokes = 5, phase = 0} = {}) {
  s.use('mechanism');
  const c = s.nid('gr'), p = 2 * Math.PI / teeth, ro = r, ri = r - depth;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = i * p, pts = [[ri, a - p * .32], [ro, a - p * .17], [ro, a + p * .17], [ri, a + p * .32]];
    pts.forEach(([rr, aa], k) => { d += (i === 0 && k === 0 ? 'M' : 'L') + n(cx + rr * Math.cos(aa), 1) + ' ' + n(cy + rr * Math.sin(aa), 1); });
  }
  d += 'Z';
  s.defs(c, `<radialGradient id="${s.gid(c)}" cx=".4" cy=".35" r=".85"><stop offset="0" stop-color="${mix(tone, '#ffffff', .4)}"/><stop offset=".6" stop-color="${tone}"/><stop offset="1" stop-color="${mix(tone, '#000000', .45)}"/></radialGradient>`);
  let sp = ''; for (let i = 0; i < spokes; i++) { const a = i * 2 * Math.PI / spokes; sp += `<line x1="${n(cx, 1)}" y1="${n(cy, 1)}" x2="${n(cx + (ri - 6) * Math.cos(a), 1)}" y2="${n(cy + (ri - 6) * Math.sin(a), 1)}" stroke="#0a1020" stroke-opacity=".5" stroke-width="5"/>`; }
  const svg = `<g class="${c}" transform="rotate(${n(phase)} ${n(cx, 1)} ${n(cy, 1)})"><g class="${c}-s"><path d="${d}" fill="${s.url(c)}" stroke="#0a1020" stroke-opacity=".7" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<circle cx="${n(cx, 1)}" cy="${n(cy, 1)}" r="${n(ri - 4, 1)}" fill="none" stroke="#0a1020" stroke-opacity=".45" stroke-width="3"/>${sp}<circle cx="${n(cx, 1)}" cy="${n(cy, 1)}" r="${n(r * .22, 1)}" fill="#cfd8ea" stroke="#0a1020"/></g></g>`;
  return {svg, cls: c, cx, cy, teeth, r};
}

/** Gira un engranaje (turns vueltas, dir = 1 horario / -1 antihorario) con velocidad constante. */
export function spin(s, g, {at, dur, turns = 1, dir = 1} = {}) {
  checkTime(s, at, dur, 'spin');
  s.js(`tl.fromTo(S+' .${g.cls}-s',{rotation:0,svgOrigin:'${n(g.cx, 1)} ${n(g.cy, 1)}'},{rotation:${n(360 * turns * dir)},svgOrigin:'${n(g.cx, 1)} ${n(g.cy, 1)}',duration:${n(dur, 3)},ease:'none',immediateRender:false},T0+${n(at)});`);
}

/** Resorte en zigzag; compress() lo comprime respecto a su extremo superior. */
export function spring(s, {x, y1, y2, w = 26, coils = 7, color = '#d8c58a', width = 3} = {}) {
  s.use('mechanism');
  const c = s.nid('sp'), step = (y2 - y1) / (coils * 2);
  let d = `M${n(x, 1)} ${n(y1, 1)}`; for (let i = 0; i < coils * 2; i++) d += `L${n(x + (i % 2 ? -w / 2 : w / 2), 1)} ${n(y1 + step * (i + .5), 1)}`; d += `L${n(x, 1)} ${n(y2, 1)}`;
  return {svg: `<path class="${c}" d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`, cls: c, x, y1};
}
export function compress(s, sp, {at, dur, to = .5, ease = 'power2.inOut'} = {}) {
  checkTime(s, at, dur, 'compress');
  s.js(`tl.fromTo(S+' .${sp.cls}',{scaleY:1,svgOrigin:'${n(sp.x, 1)} ${n(sp.y1, 1)}'},{scaleY:${n(to, 3)},svgOrigin:'${n(sp.x, 1)} ${n(sp.y1, 1)}',immediateRender:false,duration:${n(dur, 3)},ease:${JSON.stringify(ease)}},T0+${n(at)});`);
}

/** Deposito de vidrio con liquido y oleaje. level() cambia el nivel; las ondas se desplazan durante la accion. */
export function tank(s, {x, y, w, h, level = .7, color = '#ff9a2e', wall = 5} = {}) {
  s.use('mechanism');
  const c = s.nid('tk'), ix = x + wall, iw = w - 2 * wall, iy = y + wall, ih = h - 2 * wall, period = Math.max(24, iw / 2);
  s.defs(c, `<clipPath id="${s.gid(c)}"><rect x="${n(ix, 1)}" y="${n(iy, 1)}" width="${n(iw, 1)}" height="${n(ih, 1)}" rx="6"/></clipPath>`);
  s.defs(c + 'l', `<linearGradient id="${s.gid(c + 'l')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(color, '#ffffff', .25)}"/><stop offset="1" stop-color="${mix(color, '#000000', .35)}"/></linearGradient>`);
  let wave = `M${n(ix - period * 2, 1)} 0`; for (let k = -2; k < Math.ceil(iw / period) + 2; k++) wave += `Q${n(ix + (k + .5) * period, 1)} -7 ${n(ix + (k + 1) * period, 1)} 0`; wave += `V${n(ih + 20, 1)}H${n(ix - period * 2, 1)}Z`;
  const y0 = iy + (1 - level) * ih;
  const svg = `<g><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="10" fill="#0a1226" fill-opacity=".8"/>` +
    `<g clip-path="${s.url(c)}"><g class="${c}-l" transform="translate(0 ${n(y0, 1)})"><g class="${c}-lv"><g class="${c}-w"><path d="${wave}" fill="${s.url(c + 'l')}"/></g></g></g></g>` +
    `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="10" fill="none" stroke="#dbe5f7" stroke-opacity=".75" stroke-width="${wall / 2}"/>` +
    `<rect x="${n(x + w * .14)}" y="${n(y + 12)}" width="${n(Math.max(3, w * .07))}" height="${n(h - 24)}" rx="3" fill="#fff" opacity=".22"/></g>`;
  return {svg, cls: c, ih, y0, iy, period};
}
/** Cambia el nivel del deposito entre dos fracciones 0-1 y mueve la onda durante la accion. */
export function setLevel(s, t, {at, dur, from, to, ease = 'power2.inOut'} = {}) {
  checkTime(s, at, dur, 'setLevel');
  const yf = t.iy + (1 - from) * t.ih, yt = t.iy + (1 - to) * t.ih;
  s.js(`tl.fromTo(S+' .${t.cls}-l',{y:0},{y:${n(yt - yf, 1)},duration:${n(dur, 3)},ease:${JSON.stringify(ease)},immediateRender:false},T0+${n(at)});` +
    `tl.fromTo(S+' .${t.cls}-w',{x:0},{x:${n(-t.period * 2, 1)},duration:${n(dur, 3)},ease:'none',immediateRender:false},T0+${n(at)});`);
}

/** Tuberia con flujo: trazo base oscuro + guiones brillantes que avanzan a velocidad constante. */
export function flow(s, {d, at, dur, color = '#ff9a2e', pipe = '#1a243f', width = 9, dash = [7, 15], speed = 150, out, reverse = false} = {}) {
  checkTime(s, at, dur, 'flow'); s.use('mechanism');
  const c = s.nid('fl'), total = dash[0] + dash[1];
  s.add('fg', `<g class="${c}"><path d="${d}" fill="none" stroke="${pipe}" stroke-width="${width + 5}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#8695b3" stroke-opacity=".45" stroke-width="${width + 1}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path class="${c}-d" d="${d}" fill="none" stroke="${color}" stroke-width="${n(width * .55, 1)}" stroke-dasharray="${dash[0]} ${dash[1]}" stroke-linecap="round" stroke-linejoin="round" style="mix-blend-mode:screen"/></g>`);
  s.css(`__SCENE__ .${c}-d{opacity:0}`);
  const dist = Math.ceil(speed * dur / total) * total * (reverse ? 1 : -1);
  s.js(`tl.fromTo(S+' .${c}-d',{strokeDashoffset:0},{strokeDashoffset:${n(dist)},duration:${n(dur, 3)},ease:'none',immediateRender:false},T0+${n(at)});` +
    `tl.fromTo(S+' .${c}-d',{opacity:0},{opacity:1,duration:.2,immediateRender:false},T0+${n(at)});` +
    (out === undefined ? '' : `tl.to(S+' .${c}-d',{opacity:0,duration:.2},T0+${n(out)});`));
  return c;
}

/** Celda de combustible/bateria: cuerpo oscuro, relleno de color con brillo y tapa de acero. */
export function fuelCell(s, {x, y, w = 40, h = 56, color = '#ff8a2e', level = .75, cap = true} = {}) {
  s.use('mechanism');
  const ih = (h - 12) * level;
  return `<g><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="7" fill="#1a2543" stroke="#8fa3cf" stroke-opacity=".7" stroke-width="2"/>` +
    `<rect x="${n(x + 6)}" y="${n(y + h - 6 - ih)}" width="${n(w - 12)}" height="${n(ih)}" rx="4" fill="${color}"/><rect x="${n(x + 9)}" y="${n(y + h - 6 - ih + 3)}" width="4" height="${n(Math.max(2, ih - 6))}" rx="2" fill="#fff" opacity=".35"/>` +
    (cap ? steel(s, {x: x + w * .25, y: y - 7, w: w * .5, h: 8, r: 2, rivets: false, texture: .3}) : '') + '</g>';
}

