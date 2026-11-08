// Nucleo comun de los kits de motion graphics (v1.6).
// Codigo de AUTORIA: genera HTML/CSS/GSAP como texto que se incrusta en customScene.
// Nada de esto se necesita para reproducir el JSON final.
import vm from 'node:vm';
import {sanitizeCustomScene} from '../compat/server-utils.mjs';
import {CUSTOM_SCENE_LIMITS} from '../compat/src/scene-limits.mjs';
import {seededRandom, sceneSelectors} from '../rig-kit.mjs';
export {seededRandom, sceneSelectors};

/** Redondea a `d` decimales y devuelve texto (evita 0.30000000000000004 en el JSON). */
export const n = (v, d = 2) => {
  const x = Number(v);
  if (!Number.isFinite(x)) throw Error('Numero invalido: ' + v);
  return String(Math.round(x * 10 ** d) / 10 ** d);
};
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const NAME = /^[A-Za-z][\w-]*$/;
export const FONT = '"MS Inter",Inter,Arial,Helvetica,sans-serif';
export const LAYERS = ['bg', 'mid', 'fg', 'hud'];

/** Expresion JS que prefija S a cada selector de una lista: S+' .a',S+' .b' -> cadena unica. */
export const sj = (sel) => sceneSelectors(sel);

/**
 * createScene: una escena = un customScene.
 * - ids de defs unicos por escena (`uid-nombre`), exigido por Motion Studio.
 * - capas: bg / mid / fg se mueven con la camara (con paralaje); hud queda fija.
 * - build() valida con el mismo sanitizador de Motion Studio y mide el presupuesto.
 */
export function createScene({id, duration, uid, width = 720, height = 1280, bg = '#050b1c', bleed = 220} = {}) {
  if (!/^[A-Za-z0-9_-]{1,45}$/.test(id ?? '')) throw Error('Id de escena invalido (ASCII, max 45).');
  if (!Number.isFinite(duration) || duration < .5 || duration > 60) throw Error(id + ': duracion fuera de 0.5-60 s.');
  uid = uid ?? 'u' + id.replace(/[^A-Za-z0-9]/g, '').slice(-10);
  if (!NAME.test(uid)) throw Error('uid invalido.');
  const layers = Object.fromEntries(LAYERS.map(l => [l, []]));
  const defs = new Map(), css = [], js = [], kits = new Set(), counters = {};
  const s = {
    id, uid, duration, W: width, H: height, bleed, bg,
    gid: (name) => `${uid}-${name}`,
    url: (name) => `url(#${uid}-${name})`,
    /** Nombre de clase unico dentro de la escena: nid('boom') -> boom1, boom2... */
    nid(base) { counters[base] = (counters[base] ?? 0) + 1; return base + counters[base]; },
    /** Registra una definicion (gradiente, filtro, clipPath...) una sola vez por clave. */
    defs(key, markup) { if (!defs.has(key)) defs.set(key, markup); return s; },
    add(layer, markup) { if (!layers[layer]) throw Error('Capa desconocida: ' + layer); layers[layer].push(markup); return s; },
    css(text) { css.push(text); return s; },
    js(text) { js.push(text); return s; },
    use(kit) { kits.add(kit); return s; },
    /** Ultimo instante usado por animaciones (para avisos de duracion). */
    touch(t) { s._end = Math.max(s._end ?? 0, t); if (t > duration + 1e-6) throw Error(`${id}: animacion termina en ${n(t)} s, la escena dura ${n(duration)} s.`); return s; },
    stats() {
      const r = s.render();
      return {html: r.html.length, css: r.css.length, script: r.script.length, limits: {...CUSTOM_SCENE_LIMITS}};
    },
    render() {
      const html = `<svg class="dvj-stage" viewBox="0 0 ${width} ${height}" data-dvj-kits="${[...kits].sort().join(',')}">` +
        `<defs>${[...defs.values()].join('')}</defs>` +
        `<g class="shake"><g class="L-bg">${layers.bg.join('')}</g><g class="L-mid">${layers.mid.join('')}</g><g class="L-fg">${layers.fg.join('')}</g></g>` +
        `<g class="L-hud">${layers.hud.join('')}</g></svg>`;
      const style = `__SCENE__{background:${bg}}__SCENE__ > svg{width:100%;height:100%;display:block}` +
        `__SCENE__ .dvj-stage text{font-family:${FONT}}` + css.join('');
      return {html, css: style, script: js.join('\n')};
    },
    /** Devuelve el registro para assemble-scenes.mjs. scriptExcerpt es obligatorio (texto pronunciado). */
    build({title = '', scriptExcerpt} = {}) {
      if (typeof scriptExcerpt !== 'string') throw Error(id + ': indicar scriptExcerpt (texto pronunciado en la escena).');
      const r = s.render();
      for (const [k, max] of Object.entries(CUSTOM_SCENE_LIMITS)) {
        if (r[k].length > max) throw Error(`${id}: ${k} mide ${r[k].length} y el limite es ${max}. Dividir la escena o simplificar.`);
      }
      sanitizeCustomScene(r, id); // mismo filtro que aplica Motion Studio
      try { new vm.Script(`(function(tl,S,T0,D,gsap){${r.script}\n})`); }
      catch (e) { throw Error(id + ': sintaxis JS del script: ' + e.message); }
      return {id, duration, title, scriptExcerpt, customScene: r};
    },
  };
  return s;
}

/** Atributo de estilo comun para texto de etiquetas. */
export const textAttrs = (size, color = '#fff', extra = '') =>
  `font-size="${n(size)}" fill="${color}" font-weight="600" letter-spacing="${n(size * .12)}" ${extra}`;

/** Intervalo [a,b] -> comprueba orden; devuelve at absoluto en la timeline: 'T0+at'. */
export const T = (at) => `T0+${n(at)}`;

export function checkTime(s, at, dur = 0, what = 'animacion') {
  if (!Number.isFinite(at) || at < 0) throw Error(`${what}: inicio invalido (${at}).`);
  if (!Number.isFinite(dur) || dur < 0) throw Error(`${what}: duracion invalida (${dur}).`);
  s.touch(at + dur);
}

