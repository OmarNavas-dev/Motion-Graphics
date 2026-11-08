// Pantalla de cierre del propio canal: logotipo, nombre, boton «Seguir» que se pulsa, «PARTE 2» y pastilla «Parte 1 de 2».
// El usuario aporta logo y nombre; el kit NO inventa marcas ni firmas.
import {n, checkTime} from './scene-kit.mjs';
import {hide, fx, tw, esc, fitSize} from './kit-util.mjs';

export function endCard(s, {logo, name, button = 'Seguir', done = 'Siguiendo ✓', part, pill, y = 560, rays = true, tapAt = 1.4, partAt = 3.0, pillAt = 3.6} = {}) {
  if (!Array.isArray(logo) || !logo.length || !name) throw Error('endCard: indicar logo (lineas de texto) y name; el kit no inventa la identidad del canal.');
  checkTime(s, tapAt, 1.5, 'endCard boton'); if (part) checkTime(s, partAt, .4, 'endCard parte'); if (pill) checkTime(s, pillAt, .4, 'endCard pastilla'); s.use('endcard');
  const c = s.nid('end'), cx = 360, by = y + 282, py = y + 450;
  s.defs('endbg', `<radialGradient id="${s.gid('endbg')}" cx=".5" cy=".43" r=".7"><stop offset="0" stop-color="#5a3512"/><stop offset="1" stop-color="#140b05"/></radialGradient>`);
  s.defs('endring', `<linearGradient id="${s.gid('endring')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5e57"/><stop offset=".5" stop-color="#f5b335"/><stop offset="1" stop-color="#ffd36b"/></linearGradient>`);
  const ray = Array.from({length: 22}, (_, i) => { const a1 = (i * 360 / 22 - 3.2) * Math.PI / 180, a2 = (i * 360 / 22 + 3.2) * Math.PI / 180; return `<polygon points="${cx},${y} ${n(cx + 1100 * Math.cos(a1))},${n(y + 1100 * Math.sin(a1))} ${n(cx + 1100 * Math.cos(a2))},${n(y + 1100 * Math.sin(a2))}" fill="#f3b53f" opacity=".16"/>`; }).join('');
  s.add('bg', `<rect x="-220" y="-220" width="1160" height="1700" fill="${s.url('endbg')}"/>` + (rays ? `<g class="${c}-rays">${ray}</g>` : ''));
  const lsz = Math.min(46, ...logo.map(l => fitSize(l, 190, 46, .62)));
  s.add('fg', `<g class="${c}-logo"><circle cx="${cx}" cy="${y}" r="150" fill="#f3b53f" opacity=".18"/><circle cx="${cx}" cy="${y}" r="122" fill="#f4f1ea" stroke="${s.url('endring')}" stroke-width="12"/>` +
    logo.map((l, i) => `<text x="${cx}" y="${n(y + (i - (logo.length - 1) / 2) * lsz * 1.1 + lsz * .35)}" text-anchor="middle" font-family="Georgia,serif" font-size="${n(lsz)}" font-weight="700" fill="#1a1a1a">${esc(l)}</text>`).join('') + `</g>` +
    `<text x="${cx}" y="${y + 208}" text-anchor="middle" font-size="${n(fitSize(name, 560, 36, .56))}" font-weight="700" fill="#fff">${esc(name)}</text>` +
    `<g class="${c}-btn"><rect x="250" y="${by - 40}" width="220" height="64" rx="14" fill="#1d8cff"/><text x="360" y="${by + 3}" text-anchor="middle" font-size="28" font-weight="700" fill="#fff">${esc(button)}</text>` +
    `<g class="${c}-done"><rect x="250" y="${by - 40}" width="220" height="64" rx="14" fill="#3a3f4a"/><text x="360" y="${by + 3}" text-anchor="middle" font-size="26" font-weight="700" fill="#fff">${esc(done)}</text></g></g>` +
    `<circle class="${c}-ripple" cx="372" cy="${by - 2}" r="10" fill="none" stroke="#fff" stroke-width="4"/><circle class="${c}-tap" cx="372" cy="${by - 2}" r="17" fill="#fff" opacity=".85"/>` +
    (part ? `<g class="${c}-part"><rect x="150" y="${py - 70}" width="420" height="96" rx="16" fill="#0d0b09" fill-opacity=".9" stroke="#f3b53f" stroke-opacity=".6"/><text x="360" y="${py}" text-anchor="middle" font-family="Courier New,Courier,monospace" font-size="64" font-weight="700" fill="#f5b335" letter-spacing="4">${esc(part)}</text></g>` : '') +
    (pill ? `<g class="${c}-pill"><rect x="225" y="${py + 50}" width="270" height="52" rx="26" fill="#10131a" fill-opacity=".9"/><circle cx="256" cy="${py + 76}" r="16" fill="#3aa0ff"/><text x="284" y="${py + 82}" font-size="19" font-weight="600" fill="#fff">${esc(pill)}</text><rect x="400" y="${py + 62}" width="84" height="28" rx="14" fill="#3a3f4a"/><text x="442" y="${py + 82}" text-anchor="middle" font-size="15" font-weight="600" fill="#fff">Siguiendo</text></g>` : ''));
  hide(s, [c + '-done', c + '-ripple', c + '-tap', c + '-part', c + '-pill']);
  if (rays) fx(s, `.${c}-rays`, {rotation: 0, svgOrigin: `${cx} ${y}`}, {rotation: 16, svgOrigin: `${cx} ${y}`}, 0, s.duration, 'none');
  fx(s, `.${c}-logo`, {scale: .6, opacity: 0, svgOrigin: `${cx} ${y}`}, {scale: 1, opacity: 1, svgOrigin: `${cx} ${y}`}, .1, .7, 'back.out(1.6)');
  fx(s, `.${c}-tap`, {opacity: 0, x: 170, y: 140}, {opacity: .85, x: 0, y: 0}, tapAt, .7);
  fx(s, `.${c}-tap`, {scale: 1, svgOrigin: `372 ${by - 2}`}, {scale: .7, svgOrigin: `372 ${by - 2}`}, tapAt + .75, .12);
  fx(s, `.${c}-ripple`, {opacity: .9, scale: 1, svgOrigin: `372 ${by - 2}`}, {opacity: 0, scale: 6, svgOrigin: `372 ${by - 2}`}, tapAt + .8, .6);
  fx(s, `.${c}-done`, {opacity: 0}, {opacity: 1}, tapAt + .9, .2);
  tw(s, `.${c}-tap`, {opacity: 0}, tapAt + 1.1, .3);
  if (part) fx(s, `.${c}-part`, {opacity: 0, scale: 1.4, svgOrigin: `360 ${py - 22}`}, {opacity: 1, scale: 1, svgOrigin: `360 ${py - 22}`}, partAt, .35, 'back.out(1.8)');
  if (pill) fx(s, `.${c}-pill`, {opacity: 0, y: 14}, {opacity: 1, y: 0}, pillAt, .3);
  return {cls: c};
}
