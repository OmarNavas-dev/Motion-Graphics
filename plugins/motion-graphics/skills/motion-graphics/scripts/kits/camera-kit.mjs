// Camara con intencion sobre las capas bg/mid/fg (paralaje) + sacudida + corte + camara lenta.
// Los subtitulos NUNCA van en estas capas: viven fuera de la camara (los inserta add-captions.mjs).
// Todo son tweens GSAP con valores iniciales explicitos: seguro al buscar hacia atras.
import {n, seededRandom, checkTime} from './scene-kit.mjs';
import {tag} from './callouts-kit.mjs';
import {flash} from './fx-kit.mjs';

/**
 * camera(s, {layers, anchor, focus, k})
 * - anchor: punto de pantalla donde queda el foco (por defecto centro, algo bajo para dejar libre el subtitulo).
 * - layers: [[nombre, factor]] con factor 0..1 (1 = capa de accion, <1 = fondo mas lento).
 *   El fondo debe dibujarse con margen (bleed) para no mostrar bordes al hacer zoom.
 * Los movimientos deben anadirse en orden cronologico; se encadenan desde el estado anterior.
 */
export function camera(s, {layers = [['bg', .5], ['mid', .85], ['fg', 1]], anchor = [s.W / 2, s.H * .55], focus, k = 1, safeTop = 330} = {}) {
  s.use('camera');
  const [cx, cy] = anchor;
  let st = {f: focus ?? [cx, cy], k}, last = 0;
  // Protege la zona superior de subtítulos al acercarse; safeTop:0 desactiva.
  const pose = (f, kk, F) => { const kl = 1 + (kk - 1) * f, fx = cx + f * (F[0] - cx), fy = cy + f * (F[1] - cy); let y = cy - kl * fy; if (safeTop > 0 && kl > 1) y = Math.max(y, -(kl - 1) * safeTop); return {x: cx - kl * fx, y, scale: kl}; };
  const P = (p) => `x:${n(p.x, 1)},y:${n(p.y, 1)},scale:${n(p.scale, 4)}`;
  layers.forEach(([l, f]) => s.js(`gsap.set(S+' .L-${l}',{svgOrigin:'0 0',${P(pose(f, st.k, st.f))}});tl.set(S+' .L-${l}',{svgOrigin:'0 0',${P(pose(f, st.k, st.f))}},T0);`));
  const api = {
    /** Mueve foco y/o zoom suavemente. focus=[x,y] en coordenadas del mundo; k = zoom total. */
    move(at, dur, {focus: F, k: K, ease = 'power2.inOut'} = {}) {
      checkTime(s, at, dur, 'camera.move');
      if (at < last - 1e-6) throw Error('camera: anadir los movimientos en orden cronologico (' + n(at) + ' < ' + n(last) + ').');
      const to = {f: F ?? st.f, k: K ?? st.k};
      layers.forEach(([l, f]) => s.js(`tl.fromTo(S+' .L-${l}',{${P(pose(f, st.k, st.f))},svgOrigin:'0 0'},{${P(pose(f, to.k, to.f))},svgOrigin:'0 0',duration:${n(dur, 3)},ease:${JSON.stringify(ease)},immediateRender:false},T0+${n(at)});`));
      st = to; last = at + dur; return api;
    },
    push(at, dur, o = {}) { return api.move(at, dur, o); },
    pull(at, dur, o = {}) { return api.move(at, dur, {k: 1, focus: [cx, cy], ...o}); },
    /** Corte instantaneo a otro encuadre (con destello opcional de 2-3 fotogramas). */
    cut(at, {focus: F, k: K, dip = false} = {}) {
      checkTime(s, at, 0, 'camera.cut');
      if (at < last - 1e-6) throw Error('camera: corte antes del ultimo movimiento.');
      const to = {f: F ?? st.f, k: K ?? st.k};
      layers.forEach(([l, f]) => s.js(`tl.set(S+' .L-${l}',{${P(pose(f, to.k, to.f))}},T0+${n(at)});`));
      if (dip) flash(s, {at: Math.max(0, at - .02), dur: .14, peak: .25, color: '#ffffff'});
      st = to; last = at; return api;
    },
    /** Deriva muy lenta para dar vida a un plano largo. */
    drift(at, dur, {dx = 0, dy = 0, dk = .03} = {}) { return api.move(at, dur, {focus: [st.f[0] + dx, st.f[1] + dy], k: st.k + dk, ease: 'none'}); },
    /** Sacudida con caida exponencial (impacto, explosion). Usa la capa .shake, independiente de la camara. */
    shake(at, dur = .6, {amp = 12, hz = 22, decay = 2.6, seed = 3} = {}) {
      checkTime(s, at, dur, 'camera.shake');
      const r = seededRandom(seed), N = Math.max(3, Math.round(dur * hz)), kf = [];
      for (let i = 0; i < N; i++) { const a = i === N - 1 ? 0 : amp * Math.exp(-decay * i / N); kf.push(`{x:${n((r() * 2 - 1) * a, 1)},y:${n((r() * 2 - 1) * a * .8, 1)},duration:${n(dur / N, 3)}}`); }
      s.js(`tl.to(S+' .shake',{keyframes:[${kf.join(',')}]},T0+${n(at)});`); return api;
    },
    /** «Camara lenta»: viñeta + etiqueta fija + acercamiento suave. No cambia la velocidad de la timeline. */
    emphasis(at, dur, {label = '', focus: F, k: K, vignette = .6} = {}) {
      checkTime(s, at, dur, 'camera.slowMo');
      const c = s.nid('vig'), g = s.gid(c);
      s.defs(c, `<radialGradient id="${g}" cx=".5" cy=".5" r=".75"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".9"/></radialGradient>`);
      s.add('hud', `<rect class="${c}" x="0" y="0" width="${s.W}" height="${s.H}" fill="url(#${g})"/>`);
      s.css(`__SCENE__ .${c}{opacity:0}`);
      const e = Math.min(.4, dur / 3);
      s.js(`tl.fromTo(S+' .${c}',{opacity:0},{opacity:${n(vignette)},duration:${n(e, 3)},immediateRender:false},T0+${n(at)});tl.to(S+' .${c}',{opacity:0,duration:${n(e, 3)}},T0+${n(at + dur - e, 3)});`);
      if(label)tag(s, {text: label, x: s.W / 2, y: s.H - 92, at, dur: .3, out: at + dur - .3, size: 17});
      if (F || K) api.move(at, dur, {focus: F, k: K, ease: 'sine.inOut'});
      return api;
    },
    // Compatibility alias. This is visual emphasis, never a time remapping.
    slowMo(at, dur, options = {}) { return api.emphasis(at, dur, options); },
    get state() { return {...st}; },
  };
  return api;
}


