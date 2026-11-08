// Efectos deterministas: todo numero aleatorio sale de una semilla y queda incrustado en el JSON.
// Cada funcion anade su SVG a una capa y su GSAP a la escena (s.js). Ninguna usa azar en reproduccion.
import {n, seededRandom, checkTime} from './scene-kit.mjs';

const arr = (a, d = 1) => '[' + a.map(v => n(v, d)).join(',') + ']';
const hide = (s, classes) => s.css(`__SCENE__ ${classes.map(c => '.' + c).join(',__SCENE__ ')}{opacity:0}`);

/** Resplandor suave (luz de farol, bujia, brasas). Devuelve SVG; animalo con pulse(). */
export function glow(s, {x, y, r = 40, color = '#ffb35a', cls = s.nid('glow'), opacity = .9} = {}) {
  s.use('fx');
  s.defs('glow' + color.slice(1), `<radialGradient id="${s.gid('glow' + color.slice(1))}"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".25" stop-color="${color}" stop-opacity=".75"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`);
  return `<circle class="${cls}" cx="${n(x, 1)}" cy="${n(y, 1)}" r="${n(r, 1)}" fill="${s.url('glow' + color.slice(1))}" opacity="${opacity}" style="mix-blend-mode:screen"/>`;
}

/** Pulso de opacidad acotado a la escena (sin repeat infinito): `times` latidos entre at y at+dur. */
export function pulse(s, selector, {at, dur, from = .25, to = 1, times = 2, ease = 'sine.inOut'} = {}) {
  checkTime(s, at, dur, 'pulse'); s.use('fx');
  const half = dur / (2 * times);
  s.js(`tl.fromTo(S+${JSON.stringify(' ' + selector)},{opacity:${n(from)}},{opacity:${n(to)},duration:${n(half, 3)},repeat:${2 * times - 1},yoyo:true,ease:${JSON.stringify(ease)},immediateRender:false},T0+${n(at)});`);
}

/** Destello de pantalla completa (capa HUD, no la mueve la camara). */
export function flash(s, {at, dur = .22, color = '#ffd9a0', peak = .5} = {}) {
  checkTime(s, at, dur, 'flash'); s.use('fx');
  const c = s.nid('flash');
  s.add('hud', `<rect class="${c}" x="0" y="0" width="${s.W}" height="${s.H}" fill="${color}" style="mix-blend-mode:screen"/>`);
  hide(s, [c]);
  s.js(`tl.fromTo(S+' .${c}',{opacity:0},{opacity:${n(peak)},duration:${n(dur * .25, 3)},ease:'power2.out',immediateRender:false},T0+${n(at)});tl.to(S+' .${c}',{opacity:0,duration:${n(dur * .75, 3)},ease:'power2.in'},T0+${n(at + dur * .25, 3)});`);
}

/** Onda de choque: anillo que se expande y se desvanece. */
export function shockwave(s, {cx, cy, r = 200, at, dur = .8, color = '#ffe7c2', width = 5, layer = 'fg'} = {}) {
  checkTime(s, at, dur, 'shockwave'); s.use('fx');
  const c = s.nid('wave');
  s.add(layer, `<g transform="translate(${n(cx, 1)} ${n(cy, 1)})"><circle class="${c}" r="${n(r / 3, 1)}" fill="none" stroke="${color}" stroke-width="${width}" vector-effect="non-scaling-stroke"/></g>`);
  hide(s, [c]);
  s.js(`tl.fromTo(S+' .${c}',{opacity:.9,scale:.3,svgOrigin:'0 0'},{opacity:0,scale:3,svgOrigin:'0 0',duration:${n(dur, 3)},ease:'power2.out',immediateRender:false},T0+${n(at)});`);
}

/** Chispas radiales (contacto de metal, soldadura, ignicion). */
export function sparks(s, {x, y, at, dur = .6, count = 14, reach = 120, seed = 4, spread = [0, 360], color = '#ffd27a', layer = 'fg'} = {}) {
  checkTime(s, at, dur, 'sparks'); s.use('fx');
  const c = s.nid('sparks'), r = seededRandom(seed), ang = [], len = [], d0 = [], d1 = [];
  for (let i = 0; i < count; i++) { ang.push(spread[0] + r() * (spread[1] - spread[0])); len.push(8 + r() * 12); d0.push(6 + r() * 10); d1.push(reach * (.45 + r() * .55)); }
  s.add(layer, `<g transform="translate(${n(x, 1)} ${n(y, 1)})" style="mix-blend-mode:screen">${ang.map((a, i) => `<g transform="rotate(${n(a, 1)})"><line class="${c}" x1="0" y1="0" x2="${n(len[i], 1)}" y2="0" stroke="${color}" stroke-width="${n(1.6 + r() * 1.6)}" stroke-linecap="round"/></g>`).join('')}</g>`);
  hide(s, [c]);
  s.js(`tl.fromTo(S+' .${c}',{x:(i)=>${arr(d0)}[i],opacity:1},{x:(i)=>${arr(d1)}[i],opacity:0,duration:${n(dur, 3)},ease:'power2.out',immediateRender:false},T0+${n(at)});`);
}

/** Humo: bocanadas que suben, crecen y se disuelven. La duracion total es dur + stagger*(count-1). */
export function smoke(s, {x, y, at, dur = 1.6, count = 6, rise = 170, spread = 55, r = 26, color = '#8e99b0', opacity = .5, stagger = .08, seed = 9, layer = 'fg', blur = 7} = {}) {
  checkTime(s, at, dur + stagger * (count - 1), 'smoke'); s.use('fx');
  const c = s.nid('smoke'), rnd = seededRandom(seed), px = [], py = [], sc = [];
  s.defs('blur' + blur, `<filter id="${s.gid('blur' + blur)}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${blur}"/></filter>`);
  let body = '';
  for (let i = 0; i < count; i++) {
    const ox = (rnd() - .5) * spread * .8;
    px.push((rnd() - .5) * spread * 1.4); py.push(-rise * (.6 + rnd() * .5)); sc.push(1.2 + rnd() * 1.1);
    body += `<g transform="translate(${n(x + ox, 1)} ${n(y + (rnd() - .5) * 12, 1)})"><circle class="${c}" r="${n(r * (.7 + rnd() * .6), 1)}" fill="${color}"/></g>`;
  }
  s.add(layer, `<g filter="${s.url('blur' + blur)}">${body}</g>`);
  hide(s, [c]);
  s.js(`tl.fromTo(S+' .${c}',{opacity:0,scale:.35,x:0,y:0,svgOrigin:'0 0'},{opacity:${n(opacity)},scale:(i)=>${arr(sc, 2)}[i],x:(i)=>${arr(px)}[i],y:(i)=>${arr(py)}[i],svgOrigin:'0 0',duration:${n(dur * .35, 3)},ease:'power2.out',stagger:${n(stagger, 3)},immediateRender:false},T0+${n(at)});` +
    `tl.to(S+' .${c}',{opacity:0,duration:${n(dur * .65, 3)},ease:'sine.in',stagger:${n(stagger, 3)}},T0+${n(at + dur * .35, 3)});`);
}

/** Particulas ambientales de duracion acotada (polvo, brasas, petalos). Usarlas con medida. */
export function particles(s, {x, y, w, h, count = 16, at = 0, dur, dx = 0, dy = -60, r = 2, color = '#cfe0ff', opacity = .6, seed = 11, layer = 'mid'} = {}) {
  checkTime(s, at, dur, 'particles'); s.use('fx');
  const c = s.nid('part'), rnd = seededRandom(seed), mx = [], my = [];
  let body = '';
  for (let i = 0; i < count; i++) {
    mx.push(dx * (.6 + rnd() * .8)); my.push(dy * (.6 + rnd() * .8));
    body += `<circle class="${c}" cx="${n(x + rnd() * w, 1)}" cy="${n(y + rnd() * h, 1)}" r="${n(r * (.5 + rnd()), 1)}" fill="${color}"/>`;
  }
  s.add(layer, `<g>${body}</g>`); hide(s, [c]);
  s.js(`tl.fromTo(S+' .${c}',{x:0,y:0},{x:(i)=>${arr(mx)}[i],y:(i)=>${arr(my)}[i],duration:${n(dur, 3)},ease:'none',immediateRender:false},T0+${n(at)});` +
    `tl.fromTo(S+' .${c}',{opacity:0},{opacity:${n(opacity)},duration:${n(dur * .3, 3)},ease:'sine.out',immediateRender:false},T0+${n(at)});tl.to(S+' .${c}',{opacity:0,duration:${n(dur * .3, 3)},ease:'sine.in'},T0+${n(at + dur * .7, 3)});`);
}

/**
 * Explosion completa: destello, bola de fuego con turbulencia, onda, chispas, humo y escombros.
 * Para empujar la camara usar camera.shake() al mismo `at`. Devuelve {cls} por si hay que ajustar mas.
 */
export function explosion(s, {cx, cy, r = 150, at, dur = 1.2, seed = 1, sparks: ns = 22, debris: nd = 7, smoke: nm = 6, layer = 'fg', flashScreen = true} = {}) {
  const smokeDur = dur * 1.4;
  checkTime(s, at, smokeDur + .06 * (nm - 1), 'explosion'); s.use('fx');
  const c = s.nid('boom'), rnd = seededRandom(seed);
  s.defs('fireg', `<radialGradient id="${s.gid('fireg')}"><stop offset="0" stop-color="#fffbe6"/><stop offset=".3" stop-color="#ffd25a"/><stop offset=".65" stop-color="#ff7a1f"/><stop offset="1" stop-color="#b3200c" stop-opacity="0"/></radialGradient>`);
  s.defs('flashg', `<radialGradient id="${s.gid('flashg')}"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#ffe8a8" stop-opacity=".85"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>`);
  s.defs('fire' + c, `<filter id="${s.gid('fire' + c)}" x="-60%" y="-60%" width="220%" height="220%"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="${seed + 2}" result="n"/><feDisplacementMap class="${c}-disp" in="SourceGraphic" in2="n" scale="10" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="2.2"/></filter>`);
  const parts = [];
  parts.push(`<circle class="${c}-fl" r="${n(r * 1.15, 1)}" fill="${s.url('flashg')}" style="mix-blend-mode:screen"/>`);
  parts.push(`<circle class="${c}-core" r="${n(r * .62, 1)}" fill="${s.url('fireg')}" filter="${s.url('fire' + c)}" style="mix-blend-mode:screen"/>`);
  parts.push(`<circle class="${c}-ring" r="${n(r * .4, 1)}" fill="none" stroke="#ffe9c2" stroke-width="5" vector-effect="non-scaling-stroke"/>`);
  // chispas
  const sa = [], sd0 = [], sd1 = []; let sp = '';
  for (let i = 0; i < ns; i++) { const a = rnd() * 360; sa.push(a); sd0.push(r * .12 + rnd() * 14); sd1.push(r * (.7 + rnd() * .9)); sp += `<g transform="rotate(${n(a, 1)})"><line class="${c}-sp" x1="0" y1="0" x2="${n(9 + rnd() * 14, 1)}" y2="0" stroke="#ffd27a" stroke-width="${n(1.8 + rnd() * 1.8)}" stroke-linecap="round"/></g>`; }
  parts.push(`<g style="mix-blend-mode:screen">${sp}</g>`);
  // humo
  s.defs('blur8', `<filter id="${s.gid('blur8')}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="8"/></filter>`);
  const mx = [], my = [], ms = []; let sm = '';
  for (let i = 0; i < nm; i++) { mx.push((rnd() - .5) * r * 1.6); my.push(-r * (.5 + rnd() * .9)); ms.push(1.3 + rnd() * 1.2); sm += `<g transform="translate(${n((rnd() - .5) * r * .5, 1)} ${n((rnd() - .3) * r * .4, 1)})"><circle class="${c}-pf" r="${n(r * (.22 + rnd() * .18), 1)}" fill="#3b4256"/></g>`; }
  parts.push(`<g filter="${s.url('blur8')}">${sm}</g>`);
  // escombros
  const dx = [], dr = [], up = [], fall = []; let db = '';
  for (let i = 0; i < nd; i++) {
    const side = rnd() > .5 ? 1 : -1; dx.push(side * r * (.5 + rnd() * 1.1)); dr.push(side * (180 + rnd() * 540)); up.push(-r * (.5 + rnd() * .9)); fall.push(r * (.2 + rnd() * .8));
    const q = 5 + rnd() * 9; db += `<g transform="translate(${n((rnd() - .5) * r * .3, 1)} ${n((rnd() - .5) * r * .3, 1)})"><polygon class="${c}-db" points="${n(-q, 1)},${n(-q * .6, 1)} ${n(q, 1)},${n(-q * .4, 1)} ${n(q * .7, 1)},${n(q * .7, 1)} ${n(-q * .8, 1)},${n(q * .5, 1)}" fill="#5c677c" stroke="#10141f" stroke-width="1"/></g>`;
  }
  parts.push(db);
  s.add(layer, `<g transform="translate(${n(cx, 1)} ${n(cy, 1)})">${parts.join('')}</g>`);
  hide(s, [c + '-fl', c + '-core', c + '-ring', c + '-sp', c + '-pf', c + '-db']);
  const A = (v) => n(v, 3), q = (sel) => `S+' .${c}-${sel}'`;
  s.js(`{const t=T0+${n(at)};` +
    `tl.fromTo(${q('fl')},{opacity:1,scale:.2,svgOrigin:'0 0'},{opacity:0,scale:1.2,svgOrigin:'0 0',duration:${A(dur * .32)},ease:'power2.out',immediateRender:false},t);` +
    `tl.fromTo(${q('core')},{opacity:0,scale:.25,svgOrigin:'0 0'},{opacity:1,scale:.8,svgOrigin:'0 0',duration:${A(dur * .12)},ease:'power2.out',immediateRender:false},t);` +
    `tl.to(${q('core')},{scale:1.3,opacity:0,duration:${A(dur * .7)},ease:'power2.out'},t+${A(dur * .12)});` +
    `tl.fromTo(S+' .${c}-disp',{attr:{scale:8}},{attr:{scale:75},duration:${A(dur * .8)},ease:'none',immediateRender:false},t);` +
    `tl.fromTo(${q('ring')},{opacity:.95,scale:.3,svgOrigin:'0 0'},{opacity:0,scale:3.4,svgOrigin:'0 0',duration:${A(dur * .85)},ease:'power2.out',immediateRender:false},t);` +
    `tl.fromTo(${q('sp')},{x:(i)=>${arr(sd0)}[i],opacity:1},{x:(i)=>${arr(sd1)}[i],opacity:0,duration:${A(dur * .75)},ease:'power2.out',immediateRender:false},t);` +
    `tl.fromTo(${q('pf')},{opacity:0,scale:.3,x:0,y:0,svgOrigin:'0 0'},{opacity:.62,scale:(i)=>${arr(ms, 2)}[i],x:(i)=>${arr(mx)}[i],y:(i)=>${arr(my)}[i],svgOrigin:'0 0',duration:${A(smokeDur * .4)},ease:'power2.out',stagger:.06,immediateRender:false},t+${A(dur * .1)});` +
    `tl.to(${q('pf')},{opacity:0,duration:${A(smokeDur * .6)},ease:'sine.in',stagger:.06},t+${A(dur * .1 + smokeDur * .4)});` +
    `tl.fromTo(${q('db')},{opacity:1,x:0,y:0,rotation:0,svgOrigin:'0 0'},{x:(i)=>${arr(dx)}[i],rotation:(i)=>${arr(dr)}[i],svgOrigin:'0 0',duration:${A(dur * 1.1)},ease:'none',immediateRender:false},t);` +
    `tl.to(${q('db')},{y:(i)=>${arr(up)}[i],duration:${A(dur * .35)},ease:'power2.out'},t);` +
    `tl.to(${q('db')},{y:(i)=>${arr(fall)}[i],duration:${A(dur * .75)},ease:'power2.in'},t+${A(dur * .35)});` +
    `tl.to(${q('db')},{opacity:0,duration:.25,ease:'none'},t+${A(Math.max(0, dur * 1.1 - .25))});}`);
  if (flashScreen) flash(s, {at, dur: .22, peak: .4});
  return {cls: c};
}

/**
 * Corte interno: una ventana (clipPath) que se abre revelando `inner` sobre `outer`.
 * from: 'center' | 'top' | 'bottom' | 'left' | 'right'. `out` (opcional) la cierra.
 * Devuelve SVG con outer + inner recortado + marco. Pasar el resultado a s.add(...).
 */
export function cutaway(s, {x, y, w, h, rx = 14, at, dur = .7, from = 'center', out, outer = '', inner = '', frame = '#9db8ee', ease = 'power3.inOut'} = {}) {
  checkTime(s, at, dur, 'cutaway'); if (out !== undefined) checkTime(s, out, dur, 'cutaway.out'); s.use('cutaway');
  const c = s.nid('cut');
  const start = {center: [x + w / 2, y + h / 2, 0, 0], top: [x, y, w, 0], bottom: [x, y + h, w, 0], left: [x, y, 0, h], right: [x + w, y, 0, h]}[from];
  if (!start) throw Error('cutaway: from invalido.');
  const A = (v) => `{x:${n(v[0], 1)},y:${n(v[1], 1)},width:${n(v[2], 1)},height:${n(v[3], 1)}}`;
  s.defs(c, `<clipPath id="${s.gid(c)}"><rect class="${c}-r" x="${n(start[0], 1)}" y="${n(start[1], 1)}" width="${n(start[2], 1)}" height="${n(start[3], 1)}" rx="${rx}"/></clipPath>`);
  s.css(`__SCENE__ .${c}-f{opacity:0}`);
  const sel = `S+' .${c}-r,'+S+' .${c}-f'`;
  s.js(`tl.fromTo(${sel},{attr:${A(start)}},{attr:${A([x, y, w, h])},duration:${n(dur, 3)},ease:${JSON.stringify(ease)},immediateRender:false},T0+${n(at)});tl.fromTo(S+' .${c}-f',{opacity:0},{opacity:1,duration:${n(dur * .3, 3)},immediateRender:false},T0+${n(at)});` +
    (out !== undefined ? `tl.to(${sel},{attr:${A(start)},duration:${n(dur, 3)},ease:${JSON.stringify(ease)}},T0+${n(out)});tl.to(S+' .${c}-f',{opacity:0,duration:${n(dur * .3, 3)}},T0+${n(out + dur * .7, 3)});` : ''));
  return `${outer}<g clip-path="${s.url(c)}">${inner}</g><rect class="${c}-r ${c}-f" x="${n(start[0], 1)}" y="${n(start[1], 1)}" width="${n(start[2], 1)}" height="${n(start[3], 1)}" rx="${rx}" fill="none" stroke="${frame}" stroke-width="2.5"/>`;
}

