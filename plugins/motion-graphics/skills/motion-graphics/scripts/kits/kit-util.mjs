// Utilidades internas de los kits de escenarios, objetos, placas y cierre (v2.1). No se re-exportan en index.mjs.
import {n} from './scene-kit.mjs';

export const J = JSON.stringify;
const TOL = 1e-3;
/** Registra el final de una animacion; tolera el redondeo flotante pero rechaza excesos reales. */
export const touch = (s, end, what = 'animacion') => {
  if (!Number.isFinite(end) || end < 0) throw Error(`${what}: tiempo invalido (${end}).`);
  s.touch(end > s.duration && end - s.duration < TOL ? s.duration : end);
};
/** Oculta clases hasta su primera aparicion (estado inicial reproducible al buscar hacia atras). */
export const hide = (s, classes) => s.css(`__SCENE__ ${classes.map(c => '.' + c).join(',__SCENE__ ')}{opacity:0}`);
const span = (to, dur) => dur * ((to.repeat ?? 0) + 1);
/** fromTo con inmediateRender:false; el repeat cuenta para la duracion total. */
export const fx = (s, sel, from, to, at, dur, ease = 'power2.out') => {
  touch(s, at + span(to, dur), 'fx ' + sel);
  s.js(`tl.fromTo(S+${J(' ' + sel)},${J(from)},${J({...to, duration: dur, ease, immediateRender: false})},T0+${n(at, 3)});`);
};
export const tw = (s, sel, vals, at, dur, ease = 'power2.out') => {
  touch(s, at + span(vals, dur), 'tw ' + sel);
  s.js(`tl.to(S+${J(' ' + sel)},${J({...vals, duration: dur, ease})},T0+${n(at, 3)});`);
};
export const put = (s, sel, vals, at = 0) => s.js(`tl.set(S+${J(' ' + sel)},${J(vals)},T0+${n(at, 3)});`);
/** Repeticiones de un ciclo de `period` s que caben en `dur` sin pasarse (devuelve el valor de `repeat`). */
export const fitRepeats = (dur, period) => Math.max(0, Math.floor(dur / period + 1e-9) - 1);
/** Perfil de onda periodico: al desplazarlo -per en x se repite sin salto. */
export const wavePath = (y, amp, per, left = -720, right = 1440, bottom = 1500) => {
  let d = `M${n(left)} ${n(y)}`;
  for (let x = left; x < right; x += per) d += `q${n(per / 4)} ${n(-amp)} ${n(per / 2)} 0 t${n(per / 2)} 0`;
  return `${d}V${bottom}H${n(left)}Z`;
};
/** Escapa texto para SVG. */
export const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Tamano de fuente que hace caber `text` en `maxW` (aprox. 0.52 em por caracter en serif/sans). */
export const fitSize = (text, maxW, size, em = .52) => Math.min(size, maxW / Math.max(1, String(text).length * em));
export const ASSET = /^user-assets\/[0-9a-f-]{36}\.(?:png|jpg|jpeg|webp)$/;
