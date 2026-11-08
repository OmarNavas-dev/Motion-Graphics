// Placas y medidores editoriales: dato en placa oscura, insignia de capitulo, barra de nivel, pulso cardiaco y cronometro.
// Complementan callouts-kit (counter, gauge, tag...). Mantener y>=215 en la capa hud para no pisar el subtitulo superior.
import {n, checkTime} from './scene-kit.mjs';
import {hide, fx, tw, esc, touch} from './kit-util.mjs';

const INK = {ivory: '#fff1cc', gold: '#e8d3a0', panel: '#0d0b09', line: '#f3e2b3', red: '#e8365d', dim: '#e9eefb'};

/** Placa de dato (anio, edad, magnitud): numero grande marfil y unidad pequena. Aparece con rebote. */
export function chip(s, {x, y, big, unit = '', at = .3, dur = .3, w, out, layer = 'fg', cls} = {}) {
  if (big === undefined) throw Error('chip: indicar big.');
  checkTime(s, at, dur, 'chip'); s.use('hud');
  big = String(big);
  const c = cls ?? s.nid('chip'), width = w ?? Math.max(150, big.length * 26 + String(unit).length * 14 + 70);
  s.add(layer, `<g class="${c}"><rect x="${n(x - width / 2, 1)}" y="${n(y - 38, 1)}" width="${n(width, 1)}" height="64" rx="14" fill="${INK.panel}" fill-opacity=".88" stroke="${INK.line}" stroke-opacity=".35"/>` +
    `<text x="${x}" y="${n(y + 10, 1)}" text-anchor="middle" font-size="40" font-weight="800" fill="${INK.ivory}">${esc(big)}${unit ? `<tspan font-size="22" dx="8" fill="${INK.gold}">${esc(unit)}</tspan>` : ''}</text></g>`);
  hide(s, [c]);
  fx(s, '.' + c, {opacity: 0, scale: .7, svgOrigin: `${x} ${y - 6}`}, {opacity: 1, scale: 1, svgOrigin: `${x} ${y - 6}`}, at, dur, 'back.out(2)');
  if (out !== undefined) tw(s, '.' + c, {opacity: 0}, out, .25);
  return {cls: c, w: width};
}

/** Insignia de capitulo numerada (cuadro de color + etiqueta), p. ej. «1 La sed». Capa hud. */
export function chapterBadge(s, {n: num, label, x = 36, y = 224, at = .2, dur = .3, color = INK.red, out, layer = 'hud'} = {}) {
  if (num === undefined || !label) throw Error('chapterBadge: indicar n y label.');
  checkTime(s, at, dur, 'chapterBadge'); s.use('hud');
  const c = s.nid('chap'), lw = Math.max(90, String(label).length * 11 + 28);
  s.add(layer, `<g class="${c}"><rect x="${x}" y="${y}" width="30" height="30" rx="7" fill="${color}"/><text x="${x + 15}" y="${y + 22}" text-anchor="middle" font-size="20" font-weight="800" fill="#fff">${esc(num)}</text>` +
    `<rect x="${x + 34}" y="${y}" width="${lw}" height="30" rx="7" fill="#101a33" fill-opacity=".88"/><text x="${x + 46}" y="${y + 21}" font-size="17" font-weight="600" fill="#fff">${esc(label)}</text></g>`);
  hide(s, [c]); fx(s, '.' + c, {opacity: 0, y: -8}, {opacity: 1, y: 0}, at, dur);
  if (out !== undefined) tw(s, '.' + c, {opacity: 0}, out, .25);
  return {cls: c};
}

/** Barra de nivel que baja o sube (agua, energia, bateria). from/to en 0..1. Capa hud. */
export function meterBar(s, {x = 484, y = 250, w = 200, label = '', from = .64, to = .45, at = .5, dur = 4, color = '#ff4d6d', layer = 'hud'} = {}) {
  checkTime(s, at, dur, 'meterBar'); s.use('hud');
  const c = s.nid('meter'), f = s.nid('fill');
  s.add(layer, `<g class="${c}">${label ? `<text x="${x + w}" y="${y - 10}" text-anchor="end" font-size="14" fill="${INK.dim}" font-weight="600">${esc(label)}</text>` : ''}` +
    `<rect x="${x}" y="${y}" width="${w}" height="14" rx="7" fill="#0a1226" fill-opacity=".8" stroke="${INK.dim}" stroke-opacity=".7"/><rect class="${f}" x="${x + 2}" y="${y + 2}" width="${w - 4}" height="10" rx="5" fill="${color}"/></g>`);
  hide(s, [c]); fx(s, '.' + c, {opacity: 0}, {opacity: 1}, Math.max(0, at - .3), .3);
  fx(s, '.' + f, {scaleX: from, svgOrigin: `${x + 2} ${y + 7}`}, {scaleX: to, svgOrigin: `${x + 2} ${y + 7}`}, at, dur, 'none');
  return {cls: c};
}

/** Pulso cardiaco: trazo electrocardiografico que se dibuja y etiqueta «150 lpm». Capa fg. */
export function heartRate(s, {x, y, w = 130, bpm, beats = 3, at = .4, dur = 1.2, color = '#ff4d6d', layer = 'fg'} = {}) {
  if (!bpm) throw Error('heartRate: indicar bpm.');
  checkTime(s, at, dur, 'heartRate'); s.use('hud');
  const c = s.nid('ecg'), seg = w / beats;
  let d = `M${x} ${y}`;
  for (let i = 0; i < beats; i++) { const b = x + i * seg; d += `H${n(b + seg * .25)}l${n(seg * .06)} -6l${n(seg * .06)} 6h${n(seg * .05)}l${n(seg * .05)} 10l${n(seg * .08)} -34l${n(seg * .08)} 44l${n(seg * .05)} -20h${n(seg * .1)}l${n(seg * .08)} -8l${n(seg * .08)} 8`; d += `H${n(b + seg)}`; }
  s.add(layer, `<g class="${c}"><path class="${c}-p" d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/><text x="${x + w / 2}" y="${y + 34}" text-anchor="middle" font-size="15" font-weight="700" fill="${color}" font-family="monospace">${bpm} lpm</text></g>`);
  hide(s, [c]); fx(s, '.' + c, {opacity: 0}, {opacity: 1}, at, .2); fx(s, `.${c}-p`, {strokeDashoffset: 1}, {strokeDashoffset: 0}, at, dur, 'none');
  return {cls: c};
}

const clock = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
/** Cronometro mm:ss con subrayado; fromSec == toSec lo deja fijo (con un pulso). Capa fg. */
export function stopwatch(s, {x, y, fromSec = 2700, toSec = fromSec, at = .3, dur = 2, steps, color = '#ff3b5c', size = 58, layer = 'fg'} = {}) {
  checkTime(s, at, dur, 'stopwatch'); s.use('hud');
  const c = s.nid('clock'), cnt = fromSec === toSec ? 1 : Math.min(30, steps ?? Math.abs(Math.round(toSec - fromSec)) + 1);
  const vals = Array.from({length: cnt}, (_, i) => fromSec + (toSec - fromSec) * (cnt === 1 ? 0 : i / (cnt - 1)));
  s.add(layer, `<g class="${c}">` + vals.map((v, i) => `<text class="${c}-v${i}" x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="800" fill="${color}" font-family="monospace" letter-spacing="3">${clock(v)}</text>`).join('') +
    `<rect x="${x - size * 1.6}" y="${y + 12}" width="${n(size * 3.2)}" height="5" fill="${color}"/></g>`);
  hide(s, [c]); s.css(`__SCENE__ ${vals.map((_, i) => `.${c}-v${i}`).join(',__SCENE__ ')}{opacity:0}`);
  s.js(`tl.fromTo(S+' .${c}',{opacity:0},{opacity:1,duration:.2,immediateRender:false},T0+${n(at)});` + vals.map((_, i) => {
    const t = at + dur * i / cnt, t2 = at + dur * (i + 1) / cnt;
    return `tl.set(S+' .${c}-v${i}',{opacity:1},T0+${n(t, 3)});` + (i < cnt - 1 ? `tl.set(S+' .${c}-v${i}',{opacity:0},T0+${n(t2, 3)});` : '');
  }).join(''));
  if (cnt === 1) fx(s, '.' + c, {scale: 1, svgOrigin: `${x} ${y}`}, {scale: 1.04, svgOrigin: `${x} ${y}`, repeat: 1, yoyo: true}, at + .3, .3, 'sine.inOut');
  return {cls: c};
}
