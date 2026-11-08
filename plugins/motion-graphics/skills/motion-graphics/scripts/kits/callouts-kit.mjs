// Texto y graficos informativos DENTRO de la escena (no son los subtitulos narrados).
// layer 'fg' (por defecto) se mueve con la camara y acompana al objeto; 'hud' queda fijo en pantalla.
// Todas las apariciones usan tiempos absolutos de escena (`at`, `out`) y nunca repeat infinito.
import {n, checkTime, textAttrs} from './scene-kit.mjs';

export const INK = {line: '#e9eefb', dim: '#8ea0c9', gold: '#e8b84a', warn: '#ff6a3d', blue: '#4C8DFF', panel: '#0a1226'};
const hide = (s, classes) => s.css(`__SCENE__ ${classes.map(c => '.' + c).join(',__SCENE__ ')}{opacity:0}`);
const show = (s, c, at, dur, out, outDur = .25) => {
  s.js(`tl.fromTo(S+' .${c}',{opacity:0},{opacity:1,duration:${n(dur, 3)},ease:'sine.out',immediateRender:false},T0+${n(at)});` +
    (out === undefined ? '' : `tl.to(S+' .${c}',{opacity:0,duration:${n(outDur, 3)},ease:'sine.in'},T0+${n(out)});`));
};
const draw = (s, sel, at, dur) =>
  s.js(`tl.fromTo(S+' ${sel}',{strokeDashoffset:1},{strokeDashoffset:0,duration:${n(dur, 3)},ease:'power2.out',immediateRender:false},T0+${n(at)});`);

// Keep labels readable after camera transforms, while their leader starts stay
// attached to the object. Reset from the original geometry on every seek.
export function makeCalloutFitter(root,selector='text[data-callout-label]'){
 const items=[...root.querySelectorAll(selector)].map(node=>{
  const key=[...node.classList].find(c=>c.endsWith('-t'));
  const path=key?node.parentElement.querySelector('.'+key.slice(0,-2)+'-p'):null;
  const d=path?.getAttribute('d')||'',points=d.match(/^M([\d.-]+)[ ,]+([\d.-]+)L([\d.-]+)[ ,]+([\d.-]+)L([\d.-]+)[ ,]+([\d.-]+)$/);
  return {node,path,d,points:points?.slice(1).map(Number),transform:node.getAttribute('transform')||'',fontSize:node.style.fontSize};
 });
 return ()=>{
  const display=root.style.display;
  if(display==='none')root.style.display='';
  try{
   const box=root.getBoundingClientRect();if(!box.width||!box.height)return;
   const left=box.left+box.width*.035,right=box.right-box.width*.035,top=box.top+box.height*.22,bottom=box.top+box.height*.90;
   for(const item of items){
    const {node,path,points}=item;
    node.setAttribute('transform',item.transform);node.style.fontSize=item.fontSize;
    if(path)path.setAttribute('d',item.d);
    let r=node.getBoundingClientRect();if(!r.width||!r.height)continue;
    if(r.width>right-left){node.style.fontSize=(parseFloat(getComputedStyle(node).fontSize)*(right-left)/r.width)+'px';r=node.getBoundingClientRect();}
    const dx=r.left<left?left-r.left:r.right>right?right-r.right:0;
    const dy=r.top<top?top-r.top:r.bottom>bottom?bottom-r.bottom:0;
    const matrix=node.parentElement.getScreenCTM();if(!matrix)continue;
    const inv=matrix.inverse(),x=inv.a*dx+inv.c*dy,y=inv.b*dx+inv.d*dy;
    node.setAttribute('transform',`translate(${x} ${y}) ${item.transform}`);
    if(path&&points){const [ax,ay,bx,by,cx,cy]=points,shelf=Math.sign(cx-bx)*(node.getBBox().width+12);path.setAttribute('d',`M${ax} ${ay}L${bx+x} ${by+y}L${bx+x+shelf} ${cy+y}`);}
   }
  }finally{if(display==='none')root.style.display=display;}
 };
}

export function keepCalloutLabelsInFrame(scene){
 if(scene._calloutFitter)return;scene._calloutFitter=true;
 scene.js(`{const fit=(${makeCalloutFitter.toString()})(document.querySelector(S)),previous=tl.eventCallback('onUpdate');tl.eventCallback('onUpdate',function(){if(previous)previous.apply(this,arguments);fit();});fit();}`);
}

/** Texto suelto (p. ej. «CAMARA LENTA»). Por defecto en la capa fija. */
export function tag(s, {text, x, y, at, dur = .3, out, size = 15, color = INK.line, anchor = 'middle', layer = 'hud'} = {}) {
  checkTime(s, at, dur, 'tag'); s.use('callouts');
  const c = s.nid('tag');
  s.add(layer, `<text class="${c}" x="${n(x, 1)}" y="${n(y, 1)}" text-anchor="${anchor}" ${textAttrs(size, color, 'style="text-shadow:0 1px 8px #000a"')}>${text}</text>`);
  hide(s, [c]); show(s, c, at, dur, out);
  if (out !== undefined) s.touch(out + .25);
  return c;
}

/** Etiqueta con linea guia que se dibuja hasta el objeto (PISTON, INYECTOR, GUIAS...). */
export function label(s, {text, x, y, dx = 70, dy = -46, at, dur = .45, out, size = 17, color = INK.line, dot = true, layer = 'fg'} = {}) {
  checkTime(s, at, dur, 'label'); s.use('callouts');
  const c = s.nid('lb'), dir = dx >= 0 ? 1 : -1, ex = x + dx, ey = y + dy, shelf = text.length * size * .66 + 12;
  const d = `M${n(x, 1)} ${n(y, 1)}L${n(ex, 1)} ${n(ey, 1)}L${n(ex + dir * shelf, 1)} ${n(ey, 1)}`;
  s.add(layer, `<g class="${c}">${dot ? `<circle cx="${n(x, 1)}" cy="${n(y, 1)}" r="3.4" fill="${color}"/>` : ''}` +
    `<path class="${c}-p" d="${d}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1" fill="none" stroke="${color}" stroke-opacity=".85" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<text data-callout-label="true" class="${c}-t" x="${n(ex + dir * 6, 1)}" y="${n(ey - 7, 1)}" text-anchor="${dir > 0 ? 'start' : 'end'}" ${textAttrs(size, color, 'style="text-shadow:0 1px 6px #000c"')}>${text}</text></g>`);
  hide(s, [c]); show(s, c, at, Math.min(.2, dur), out); draw(s, `.${c}-p`, at, dur);
  s.js(`tl.fromTo(S+' .${c}-t',{opacity:0},{opacity:1,duration:.2,immediateRender:false},T0+${n(at + dur * .6, 3)});`);
  keepCalloutLabelsInFrame(s);
  return c;
}

/** Flecha (simple o doble) que indica un movimiento; se dibuja del origen al destino. */
export function arrow(s, {x1, y1, x2, y2, double = false, at, dur = .4, out, color = INK.line, width = 2.6, head = 12, layer = 'fg'} = {}) {
  checkTime(s, at, dur, 'arrow'); s.use('callouts');
  const c = s.nid('ar'), a = Math.atan2(y2 - y1, x2 - x1);
  const tip = (px, py, ang) => `<path d="M${n(px, 1)} ${n(py, 1)}L${n(px - head * Math.cos(ang - .42), 1)} ${n(py - head * Math.sin(ang - .42), 1)}M${n(px, 1)} ${n(py, 1)}L${n(px - head * Math.cos(ang + .42), 1)} ${n(py - head * Math.sin(ang + .42), 1)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
  s.add(layer, `<g class="${c}"><path class="${c}-p" d="M${n(x1, 1)} ${n(y1, 1)}L${n(x2, 1)} ${n(y2, 1)}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>${tip(x2, y2, a)}${double ? tip(x1, y1, a + Math.PI) : ''}</g>`);
  hide(s, [c]); show(s, c, at, Math.min(.15, dur), out); draw(s, `.${c}-p`, at, dur);
  return c;
}

/** Termometro/medidor lineal que se llena (CALOR, PRESION, CARGA). from/to en 0-1. */
export function thermometer(s, {x, y, h = 190, w = 22, from = .08, to = .95, at, dur = .9, out, text = '', textColor = INK.warn, layer = 'fg', ease = 'power2.inOut'} = {}) {
  checkTime(s, at, dur, 'thermometer'); s.use('callouts');
  const c = s.nid('th'), gid = c + 'g';
  s.defs(gid, `<linearGradient id="${s.gid(gid)}" gradientUnits="userSpaceOnUse" x1="0" y1="${n(y + h)}" x2="0" y2="${n(y)}"><stop offset="0" stop-color="#3d7bff"/><stop offset=".5" stop-color="#ffb02e"/><stop offset="1" stop-color="#ff3b2e"/></linearGradient>`);
  const ix = x + 3, iw = w - 6, iy = y + 3, ih = h - 6;
  let ticks = ''; for (let i = 1; i < 5; i++) ticks += `<line x1="${n(x + w, 1)}" x2="${n(x + w + (i % 2 ? 6 : 10), 1)}" y1="${n(y + h * i / 5, 1)}" y2="${n(y + h * i / 5, 1)}" stroke="${INK.line}" stroke-opacity=".6"/>`;
  s.add(layer, `<g class="${c}"><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(w / 2)}" fill="${INK.panel}" fill-opacity=".72" stroke="${INK.line}" stroke-opacity=".75" stroke-width="2"/>` +
    `<rect class="${c}-f" x="${n(ix)}" y="${n(iy)}" width="${n(iw)}" height="${n(ih)}" rx="${n(iw / 2)}" fill="${s.url(gid)}"/>${ticks}` +
    (text ? `<text x="${n(x + w / 2, 1)}" y="${n(y - 12, 1)}" text-anchor="middle" ${textAttrs(15, textColor)}>${text}</text>` : '') + '</g>');
  hide(s, [c]); show(s, c, at, .25, out);
  s.js(`tl.fromTo(S+' .${c}-f',{scaleY:${n(from, 3)},svgOrigin:'${n(ix + iw / 2, 1)} ${n(iy + ih, 1)}'},{scaleY:${n(to, 3)},svgOrigin:'${n(ix + iw / 2, 1)} ${n(iy + ih, 1)}',duration:${n(dur, 3)},ease:${JSON.stringify(ease)},immediateRender:false},T0+${n(at + .1, 3)});`);
  s.touch(at + .1 + dur);
  return c;
}

/** Medidor circular con aguja (presion, velocidad). from/to en grados dentro de [-120, 120]. */
export function gauge(s, {cx, cy, r = 54, from = -110, to = 80, at, dur = .8, out, text = '', layer = 'fg', ease = 'power3.out'} = {}) {
  checkTime(s, at, dur, 'gauge'); s.use('callouts');
  const c = s.nid('ga'), pt = (deg, rr) => [cx + rr * Math.sin(deg * Math.PI / 180), cy - rr * Math.cos(deg * Math.PI / 180)];
  const [a0x, a0y] = pt(-120, r), [a1x, a1y] = pt(120, r), [g0x, g0y] = pt(30, r), [g1x, g1y] = pt(120, r);
  let ticks = ''; for (let d = -120; d <= 120; d += 30) { const [p1x, p1y] = pt(d, r - 3), [p2x, p2y] = pt(d, r - 11); ticks += `<line x1="${n(p1x, 1)}" y1="${n(p1y, 1)}" x2="${n(p2x, 1)}" y2="${n(p2y, 1)}" stroke="${INK.line}" stroke-opacity=".7" stroke-width="1.6"/>`; }
  s.add(layer, `<g class="${c}"><circle cx="${n(cx, 1)}" cy="${n(cy, 1)}" r="${n(r + 8, 1)}" fill="${INK.panel}" fill-opacity=".78" stroke="${INK.line}" stroke-opacity=".6" stroke-width="2"/>` +
    `<path d="M${n(a0x, 1)} ${n(a0y, 1)}A${r} ${r} 0 1 1 ${n(a1x, 1)} ${n(a1y, 1)}" fill="none" stroke="${INK.dim}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M${n(g0x, 1)} ${n(g0y, 1)}A${r} ${r} 0 0 1 ${n(g1x, 1)} ${n(g1y, 1)}" fill="none" stroke="${INK.warn}" stroke-width="3" stroke-linecap="round"/>${ticks}` +
    `<g class="${c}-n"><line x1="${n(cx, 1)}" y1="${n(cy + 8, 1)}" x2="${n(cx, 1)}" y2="${n(cy - r + 12, 1)}" stroke="${INK.gold}" stroke-width="3" stroke-linecap="round"/></g>` +
    `<circle cx="${n(cx, 1)}" cy="${n(cy, 1)}" r="5" fill="${INK.line}"/>` +
    (text ? `<text x="${n(cx, 1)}" y="${n(cy + r + 28, 1)}" text-anchor="middle" ${textAttrs(14, INK.line)}>${text}</text>` : '') + '</g>');
  hide(s, [c]); show(s, c, at, .25, out);
  s.js(`tl.fromTo(S+' .${c}-n',{rotation:${n(from)},svgOrigin:'${n(cx, 1)} ${n(cy, 1)}'},{rotation:${n(to)},svgOrigin:'${n(cx, 1)} ${n(cy, 1)}',duration:${n(dur, 3)},ease:${JSON.stringify(ease)},immediateRender:false},T0+${n(at + .1, 3)});`);
  s.touch(at + .1 + dur);
  return c;
}

/** Lista de pasos (CAE / APRIETA / INYECTA...) donde se enciende el paso activo en su momento real. */
export function stepList(s, {x, y, items, times, at, out, gap = 27, size = 15, color = INK.dim, active = INK.gold, anchor = 'start', layer = 'fg'} = {}) {
  if (!Array.isArray(items) || items.length !== times?.length) throw Error('stepList: items y times deben tener la misma longitud.');
  checkTime(s, at, .3, 'stepList'); times.forEach(t => checkTime(s, t, .15, 'stepList.times')); s.use('callouts');
  const c = s.nid('st');
  s.add(layer, `<g class="${c}">${items.map((t, i) => `<text class="${c}-i${i}" x="${n(x, 1)}" y="${n(y + i * gap, 1)}" text-anchor="${anchor}" ${textAttrs(size, color)}>${t}</text>`).join('')}</g>`);
  hide(s, [c]); show(s, c, at, .3, out);
  items.forEach((_, i) => {
    s.js(`tl.to(S+' .${c}-i${i}',{fill:${JSON.stringify(active)},duration:.14,ease:'none'},T0+${n(times[i], 3)});`);
    if (i < items.length - 1) s.js(`tl.to(S+' .${c}-i${i}',{fill:${JSON.stringify(color)},duration:.14,ease:'none'},T0+${n(times[i + 1], 3)});`);
  });
  return c;
}

/** Contador numerico por pasos discretos (seguro al buscar hacia atras; sin onUpdate). */
export function counter(s, {x, y, from = 0, to, at, dur = 1, steps = 14, format = (v) => String(Math.round(v)), unit = '', size = 40, color = INK.gold, anchor = 'middle', ease = 'out', out, layer = 'fg', plate = true} = {}) {
  checkTime(s, at, dur, 'counter'); s.use('callouts');
  const c = s.nid('cn');
  const vals = Array.from({length: steps}, (_, i) => { const p = i / (steps - 1), e = ease === 'out' ? 1 - (1 - p) ** 2 : p; return from + (to - from) * e; });
  const wide = Math.max(format(from).length, format(to).length) * size * .62 + (unit ? unit.length * size * .5 : 0) + 34;
  const px = anchor === 'middle' ? x - wide / 2 : anchor === 'start' ? x - 16 : x - wide + 16;
  s.add(layer, `<g class="${c}">` + (plate ? `<rect x="${n(px, 1)}" y="${n(y - size * .95, 1)}" width="${n(wide, 1)}" height="${n(size * 1.4, 1)}" rx="10" fill="${INK.panel}" fill-opacity=".82" stroke="${color}" stroke-opacity=".55"/>` : '') +
    vals.map((v, i) => `<text class="${c}-v${i}" x="${n(x, 1)}" y="${n(y, 1)}" text-anchor="${anchor}" font-size="${size}" font-weight="800" fill="${color}">${format(v)}${unit ? `<tspan font-size="${n(size * .5)}" dx="6">${unit}</tspan>` : ''}</text>`).join('') + '</g>');
  hide(s, [c]); s.css(`__SCENE__ ${vals.map((_, i) => `.${c}-v${i}`).join(',__SCENE__ ')}{opacity:0}`);
  s.js(`tl.fromTo(S+' .${c}',{opacity:0},{opacity:1,duration:.2,immediateRender:false},T0+${n(at)});` + vals.map((_, i) => {
    const t = at + dur * i / (steps - 1), t2 = at + dur * (i + 1) / (steps - 1);
    return `tl.set(S+' .${c}-v${i}',{opacity:1},T0+${n(t, 3)});` + (i < steps - 1 ? `tl.set(S+' .${c}-v${i}',{opacity:0},T0+${n(t2, 3)});` : '');
  }).join('') + (out === undefined ? '' : `tl.to(S+' .${c}',{opacity:0,duration:.25},T0+${n(out)});`));
  return c;
}

/** Marcas de conteo |||| que van apareciendo (golpes, intentos, dias). */
export function tally(s, {x, y, count = 5, at, step = .22, size = 36, color = INK.line, out, layer = 'fg'} = {}) {
  checkTime(s, at, step * count, 'tally'); s.use('callouts');
  const c = s.nid('ta'); let body = '';
  for (let i = 0; i < count; i++) {
    const g = Math.floor(i / 5), k = i % 5, gx = x + g * (size * 1.6);
    body += k < 4 ? `<line class="${c}-m" x1="${n(gx + k * size * .3, 1)}" y1="${n(y - size, 1)}" x2="${n(gx + k * size * .3, 1)}" y2="${n(y, 1)}" stroke="${color}" stroke-width="3.4" stroke-linecap="round"/>` :
      `<line class="${c}-m" x1="${n(gx - size * .25, 1)}" y1="${n(y - size * .15, 1)}" x2="${n(gx + size * 1.1, 1)}" y2="${n(y - size * .85, 1)}" stroke="${color}" stroke-width="3.4" stroke-linecap="round"/>`;
  }
  s.add(layer, `<g class="${c}">${body}</g>`); hide(s, [c + '-m']); s.css(`__SCENE__ .${c}{opacity:1}`);
  s.js(`tl.fromTo(S+' .${c}-m',{opacity:0,scale:1.3,svgOrigin:'${n(x + size, 1)} ${n(y - size / 2, 1)}'},{opacity:1,scale:1,svgOrigin:'${n(x + size, 1)} ${n(y - size / 2, 1)}',duration:.14,stagger:${n(step, 3)},ease:'power2.out',immediateRender:false},T0+${n(at)});` +
    (out === undefined ? '' : `tl.to(S+' .${c}-m',{opacity:0,duration:.25},T0+${n(out)});`));
  return c;
}

/** Marco de enfasis azul con cuatro puntos en las esquinas (mismo lenguaje que el subtitulo con recuadro). */
export function frame(s, {x, y, w, h, at, dur = .3, out, color = INK.blue, layer = 'fg', handle = 9} = {}) {
  checkTime(s, at, dur, 'frame'); s.use('callouts');
  const c = s.nid('fr'), sq = (px, py) => `<rect x="${n(px - handle / 2, 1)}" y="${n(py - handle / 2, 1)}" width="${handle}" height="${handle}" fill="#fff" stroke="${color}" stroke-width="1.6"/>`;
  s.add(layer, `<g class="${c}"><rect x="${n(x, 1)}" y="${n(y, 1)}" width="${n(w, 1)}" height="${n(h, 1)}" fill="none" stroke="${color}" stroke-width="3"/>${sq(x, y)}${sq(x + w, y)}${sq(x, y + h)}${sq(x + w, y + h)}</g>`);
  hide(s, [c]);
  s.js(`tl.fromTo(S+' .${c}',{opacity:0,scale:1.1,svgOrigin:'${n(x + w / 2, 1)} ${n(y + h / 2, 1)}'},{opacity:1,scale:1,svgOrigin:'${n(x + w / 2, 1)} ${n(y + h / 2, 1)}',duration:${n(dur, 3)},ease:'power2.out',immediateRender:false},T0+${n(at)});` +
    (out === undefined ? '' : `tl.to(S+' .${c}',{opacity:0,duration:.2},T0+${n(out)});`));
  return c;
}

/** Palabra de alerta grande (PELIGRO, ERROR, STOP) con entrada contundente y parpadeo acotado. */
export function warning(s, {text, x, y, at, dur = .35, out, size = 38, color = INK.warn, blink = 2, layer = 'fg'} = {}) {
  checkTime(s, at, dur + blink * .24, 'alert'); s.use('callouts');
  const c = s.nid('al');
  s.add(layer, `<text class="${c}" x="${n(x, 1)}" y="${n(y, 1)}" text-anchor="middle" font-size="${size}" font-weight="800" letter-spacing="${n(size * .1)}" fill="${color}" style="text-shadow:0 0 18px ${color}88">${text}</text>`);
  hide(s, [c]);
  s.js(`tl.fromTo(S+' .${c}',{opacity:0,scale:1.45,svgOrigin:'${n(x, 1)} ${n(y - size / 3, 1)}'},{opacity:1,scale:1,svgOrigin:'${n(x, 1)} ${n(y - size / 3, 1)}',duration:${n(dur, 3)},ease:'back.out(2)',immediateRender:false},T0+${n(at)});` +
    (blink ? `tl.to(S+' .${c}',{opacity:.35,duration:.12,repeat:${blink * 2 - 1},yoyo:true,ease:'none'},T0+${n(at + dur, 3)});` : '') +
    (out === undefined ? '' : `tl.to(S+' .${c}',{opacity:0,duration:.2},T0+${n(out)});`));
  return c;
}

/** Cota: linea de medida con topes y texto central (distancias, alturas). */
export function dimension(s, {x1, y1, x2, y2, text, at, dur = .4, out, color = INK.line, layer = 'fg', size = 15} = {}) {
  checkTime(s, at, dur, 'dimension'); s.use('callouts');
  const c = s.nid('dm'), a = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2, tx = Math.cos(a) * 7, ty = Math.sin(a) * 7;
  s.add(layer, `<g class="${c}"><path class="${c}-p" d="M${n(x1, 1)} ${n(y1, 1)}L${n(x2, 1)} ${n(y2, 1)}M${n(x1 - tx, 1)} ${n(y1 - ty, 1)}L${n(x1 + tx, 1)} ${n(y1 + ty, 1)}M${n(x2 - tx, 1)} ${n(y2 - ty, 1)}L${n(x2 + tx, 1)} ${n(y2 + ty, 1)}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>` +
    `<text x="${n((x1 + x2) / 2 + tx * 2.4, 1)}" y="${n((y1 + y2) / 2 + ty * 2.4 + 5, 1)}" text-anchor="middle" ${textAttrs(size, color, 'style="text-shadow:0 1px 6px #000c"')}>${text}</text></g>`);
  hide(s, [c]); show(s, c, at, .2, out); draw(s, `.${c}-p`, at, dur);
  return c;
}

