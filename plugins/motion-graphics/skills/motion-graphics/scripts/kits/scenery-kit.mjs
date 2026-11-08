// Escenarios: cielo con ciclo de luz, oceano y barco, nave de iglesia con perspectiva y celda con bombilla.
// Todo es geometria SVG determinista; ningun elemento usa azar en reproduccion (las semillas quedan incrustadas).
import {n, checkTime, seededRandom} from './scene-kit.mjs';
import {clouds} from './materials-kit.mjs';
import {J, hide, fx, tw, put, fitRepeats, wavePath} from './kit-util.mjs';

const SKY = {day: ['#3f9bdc', '#cdeaf7'], dusk: ['#2a2a66', '#c8567a', '#ffb06a'], dawn: ['#5a4f8a', '#e0907a', '#ffd9a0'], night: ['#050b1c', '#0b1b3d', '#16264f']};
const SEA = {blue: ['#2f86c2', '#14508d', '#06193d'], teal: ['#2a9aa0', '#17687a', '#072a3a'], deep: ['#1c4f7a', '#0e2d52', '#040f26'], dusk: ['#7a5a9a', '#3a3a7a', '#0a0f2c']};
const grad = (s, key, cols, dir = 'v') => s.defs(key, `<linearGradient id="${s.gid(key)}" x1="0" y1="0" x2="${dir === 'v' ? 0 : 1}" y2="${dir === 'v' ? 1 : 0}">${cols.map((c, i) => `<stop offset="${n(i / (cols.length - 1))}" stop-color="${c}"/>`).join('')}</linearGradient>`);

/**
 * Cielo que cambia de luz: `from` -> `to` ('day'|'dawn'|'dusk'|'night'). El sol baja de sunFrom a sunTo.
 * Con to:'night' aparecen estrellas. Capas bg. Debe llamarse ANTES de ocean().
 */
export function skyCycle(s, {from = 'day', to = 'dusk', at = 0, dur = s.duration - at, horizon = 620, sun = true, sunFrom = [520, 430], sunTo = [544, 600], cloudCount = 3, cloudTone, seed = 2} = {}) {
  if (!SKY[from] || !SKY[to]) throw Error('skyCycle: from/to deben ser ' + Object.keys(SKY).join(', '));
  checkTime(s, at, dur, 'skyCycle'); s.use('scenery');
  grad(s, 'sky-' + from, SKY[from]); grad(s, 'sky-' + to, SKY[to]);
  const over = s.nid('skyto'), sc = s.nid('sun'), warm = s.nid('sunwarm'), stars = s.nid('star'), h = horizon + 240;
  s.add('bg', `<rect x="-220" y="-220" width="1160" height="${h}" fill="${s.url('sky-' + from)}"/><rect class="${over}" x="-220" y="-220" width="1160" height="${h}" fill="${s.url('sky-' + to)}"/>`);
  const toNight = to === 'night' || from === 'night';
  if (cloudCount > 0) s.add('bg', clouds(s, {y: 40, h: 240, count: cloudCount, seed, tone: cloudTone ?? (toNight ? '#26335f' : '#dcebf7'), light: toNight ? '#4a64a4' : '#ffffff', rough: 22, grain: .25}));
  if (to === 'night') {
    const r = seededRandom(seed + 7);
    s.add('bg', `<g>${Array.from({length: 46}, () => `<circle class="${stars}" cx="${n(r() * 720, 1)}" cy="${n(r() * (horizon - 40), 1)}" r="${n(.8 + r() * 1.4)}" fill="#fff"/>`).join('')}</g>`);
    hide(s, [stars]); fx(s, '.' + stars, {opacity: 0}, {opacity: .85}, at, dur, 'none');
  }
  if (sun) {
    s.add('bg', `<g class="${sc}"><circle cx="${sunFrom[0]}" cy="${sunFrom[1]}" r="120" fill="#fff3c0" opacity=".28"/><circle cx="${sunFrom[0]}" cy="${sunFrom[1]}" r="50" fill="#fff6d8"/><circle class="${warm}" cx="${sunFrom[0]}" cy="${sunFrom[1]}" r="50" fill="#ff8a3d"/></g>`);
    hide(s, [warm]);
    fx(s, '.' + warm, {opacity: 0}, {opacity: to === 'day' ? 0 : 1}, at, dur, 'none');
    fx(s, '.' + sc, {x: 0, y: 0}, {x: sunTo[0] - sunFrom[0], y: sunTo[1] - sunFrom[1]}, at, dur, 'sine.in');
  }
  hide(s, [over]); fx(s, '.' + over, {opacity: 0}, {opacity: to === 'night' ? 1 : .9}, at, dur, 'none');
  return {horizon};
}

/** Mar con bandas de olas en bucle (ciclos completos dentro de `dur`). Capas mid. */
export function ocean(s, {horizon = 620, tone = 'blue', bands, at = 0, dur = s.duration - at} = {}) {
  if (!SEA[tone]) throw Error('ocean: tone debe ser ' + Object.keys(SEA).join(', '));
  checkTime(s, at, dur, 'ocean'); s.use('scenery');
  grad(s, 'sea', SEA[tone]);
  const list = bands ?? [{y: horizon + 40, amp: 7, per: 90, color: '#7ec3ea', op: .22, period: 1.5}, {y: horizon + 140, amp: 11, per: 120, color: '#4a9ad0', op: .2, period: 2}, {y: horizon + 280, amp: 14, per: 140, color: '#82c4ea', op: .1, period: 2.4}];
  const cls = list.map(() => s.nid('wave'));
  s.add('mid', `<rect x="-220" y="${horizon}" width="1160" height="900" fill="${s.url('sea')}"/><rect x="-220" y="${horizon - 2}" width="1160" height="4" fill="#bfe3f5" opacity=".7"/>` +
    list.map((b, i) => `<g class="${cls[i]}"><path d="${wavePath(b.y, b.amp, b.per)}" fill="${b.color}" fill-opacity="${b.op}"/></g>`).join(''));
  list.forEach((b, i) => fx(s, '.' + cls[i], {x: 0}, {x: -b.per, repeat: fitRepeats(dur, b.period)}, at, b.period, 'none'));
  return {horizon, bands: list.length};
}

/** Ola frontal que tapa el casco. Llamar DESPUES de boat() para que quede por delante (capa fg). */
export function oceanFront(s, {y = 836, amp = 10, per = 100, period = 1.2, opacity = .96, at = 0, dur = s.duration - at, tone = 'blue'} = {}) {
  checkTime(s, at, dur, 'oceanFront'); s.use('scenery'); grad(s, 'sea', SEA[tone] ?? SEA.blue);
  const c = s.nid('wavefront');
  s.add('fg', `<g class="${c}"><path d="${wavePath(y, amp, per)}" fill="${s.url('sea')}" fill-opacity="${opacity}"/></g>`);
  fx(s, '.' + c, {x: 0}, {x: -per, repeat: fitRepeats(dur, period)}, at, period, 'none');
}

const person = (x, y, shirt, r, skin) => `<path d="M${n(x - r * 1.3)} ${y}Q${n(x - r * 1.5)} ${n(y - r * 3.6)} ${x} ${n(y - r * 4)}Q${n(x + r * 1.6)} ${n(y - r * 3.6)} ${n(x + r * 1.3)} ${y}Z" fill="${shirt}"/>` +
  `<circle cx="${x + 2}" cy="${n(y - r * 5)}" r="${r}" fill="${skin}"/><path d="M${n(x - r * .9)} ${n(y - r * 5.6)}Q${x + 2} ${n(y - r * 7)} ${n(x + r * 1.2)} ${n(y - r * 5.4)}Q${x + 2} ${n(y - r * 5.9)} ${n(x - r * .9)} ${n(y - r * 5.6)}Z" fill="#2a1c15"/>`;

/** Barca con motor fuera de borda y tripulantes sentados; se mece dentro de `dur`. Capa fg. */
export function boat(s, {x = 360, y = 800, scale = 1.3, hull = ['#d84a36', '#8e2418'], crew = [{x: -84, shirt: '#3a78a8', skin: '#c98d68', r: 17}, {x: 92, shirt: '#c4452f', skin: '#e0a67e', r: 21}], rock = true, rockDeg = 2.2, at = 0, dur = s.duration - at} = {}) {
  checkTime(s, at, dur, 'boat'); s.use('scenery');
  s.defs('hull', `<linearGradient id="${s.gid('hull')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hull[0]}"/><stop offset="1" stop-color="${hull[1]}"/></linearGradient>`);
  const c = s.nid('boat');
  s.add('fg', `<g transform="translate(${x} ${y}) scale(${scale})"><g class="${c}"><ellipse cx="0" cy="56" rx="175" ry="10" fill="#05213f" opacity=".35"/>` +
    `<rect x="-192" y="-50" width="26" height="74" rx="6" fill="#2b2f36"/><rect x="-192" y="-50" width="26" height="14" rx="5" fill="#c33"/>` +
    crew.map(p => person(p.x, -12, p.shirt, p.r, p.skin)).join('') +
    `<rect x="-36" y="-54" width="76" height="44" rx="4" fill="#e9e6df"/><rect x="-28" y="-46" width="32" height="24" fill="#8fb7d6"/>` +
    `<path d="M-172 -12H172L134 52Q0 68 -134 52Z" fill="${s.url('hull')}"/><path d="M-172 -12H172L164 6H-164Z" fill="#f4f1ea"/><path d="M-160 22H160" stroke="#fff" stroke-opacity=".25" stroke-width="3"/></g></g>`);
  if (rock) fx(s, '.' + c, {rotation: -rockDeg, svgOrigin: '0 20'}, {rotation: rockDeg, svgOrigin: '0 20', repeat: fitRepeats(dur, .8), yoyo: true}, at, .8, 'sine.inOut');
  return {cls: c};
}

/**
 * Nave de iglesia en perspectiva de un punto de fuga. Devuelve pt(X,Y,z) para colocar objetos propios:
 * x = vp[0] + X/z, y = vp[1] + Y/z con suelo en Y=360, techo en Y=-920, paredes en X=+-440, fondo en z=4.
 * vitrines: lista de profundidades z con vitrinas doradas a ambos lados y velas. Capas mid y fg.
 */
export function nave(s, {vp = [360, 560], vitrines = [3.0, 2.2, 1.5], candles = true, windows = [[1.0, 1.7], [1.9, 2.8]], at = 0, dur = s.duration - at} = {}) {
  checkTime(s, at, dur, 'nave'); s.use('scenery');
  const pt = (X, Y, z) => [vp[0] + X / z, vp[1] + Y / z];
  const q = (pts) => pts.map(p => p.map(v => n(v, 1)).join(',')).join(' ');
  grad(s, 'nave-wall', ['#1a110c', '#3a2618'], 'h'); grad(s, 'nave-floor', ['#3a2a1d', '#0d0805']);
  s.defs('nave-altar', `<radialGradient id="${s.gid('nave-altar')}" cx=".5" cy=".55" r=".7"><stop offset="0" stop-color="#ffe9a0"/><stop offset=".55" stop-color="#d9a23a"/><stop offset="1" stop-color="#6b4513"/></radialGradient>`);
  s.add('bg', `<rect x="-220" y="-220" width="1160" height="1700" fill="#0b0705"/>`);
  const z0 = .38, zb = 4, back = [pt(-440, -920, zb), pt(440, -920, zb), pt(440, 360, zb), pt(-440, 360, zb)];
  s.add('mid', `<polygon points="${q([pt(-440, -920, z0), pt(440, -920, z0), pt(440, -920, zb), pt(-440, -920, zb)])}" fill="#120b07"/>` +
    `<polygon points="${q([pt(-440, 360, z0), pt(-440, 360, zb), pt(440, 360, zb), pt(440, 360, z0)])}" fill="${s.url('nave-floor')}"/>` +
    `<polygon points="${q([pt(-440, -920, z0), pt(-440, -920, zb), pt(-440, 360, zb), pt(-440, 360, z0)])}" fill="${s.url('nave-wall')}"/>` +
    `<polygon points="${q([pt(440, -920, z0), pt(440, -920, zb), pt(440, 360, zb), pt(440, 360, z0)])}" fill="#2a1a10"/>` +
    `<polygon points="${q(back)}" fill="${s.url('nave-altar')}"/>`);
  const arch = (X, w, top, bot) => { const [a, b] = pt(X - w / 2, top, zb), [c, d] = pt(X + w / 2, bot, zb), r = (c - a) / 2; return `<path d="M${n(a)} ${n(d)}V${n(b + r)}A${n(r)} ${n(r)} 0 0 1 ${n(c)} ${n(b + r)}V${n(d)}Z" fill="#3a2410" fill-opacity=".55" stroke="#ffe7a8" stroke-opacity=".8" stroke-width="2"/>`; };
  s.add('mid', arch(-250, 180, -700, 330) + arch(0, 200, -780, 330) + arch(250, 180, -700, 330));
  let fl = '';
  [.55, .7, .9, 1.15, 1.5, 2, 2.7, 3.5].forEach(z => { const a = pt(-440, 360, z), b = pt(440, 360, z); fl += `M${n(a[0])} ${n(a[1])}H${n(b[0])}`; });
  for (let X = -440; X <= 440; X += 110) { const a = pt(X, 360, zb), b = pt(X, 360, z0); fl += `M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}`; }
  s.add('mid', `<path d="${fl}" stroke="#d9b36a" stroke-opacity=".16" stroke-width="1.6" fill="none"/>`);
  const win = (side, z1, z2, c1, c2) => {
    const X = side * 440, top = -330, bot = 110, zm = z1 + (z2 - z1) * .5;
    return `<polygon points="${q([pt(X, top, z1), pt(X, top, z2), pt(X, bot, z2), pt(X, bot, z1)])}" fill="${c1}" fill-opacity=".85" stroke="#ffd98a" stroke-opacity=".5" stroke-width="2"/>` +
      `<polygon points="${q([pt(X, top, zm), pt(X, top, z2), pt(X, bot, z2), pt(X, bot, zm)])}" fill="${c2}" fill-opacity=".7"/>`;
  };
  windows.forEach(([a, b], i) => s.add('mid', win(-1, a, b, i % 2 ? '#2a9aa8' : '#6a2fc2', i % 2 ? '#e6a82e' : '#d9402e') + win(1, a, b, i % 2 ? '#6a2fc2' : '#2a9aa8', i % 2 ? '#d9402e' : '#e6a82e')));
  [.62, 1.8, 3.0].forEach(z => [-1, 1].forEach(sd => { const a = pt(sd * 440, -920, z), b = pt(sd * 380, 360, z); s.add('mid', `<polygon points="${q([a, [b[0], a[1]], b, [a[0], b[1]]])}" fill="#27180e" stroke="#ffd98a" stroke-opacity=".25"/>`); }));
  const vit = (X0, X1, z0v, z1v) => {
    const H = 110, f = [pt(X0, 360 - H, z0v), pt(X1, 360 - H, z0v), pt(X1, 360, z0v), pt(X0, 360, z0v)], t = [pt(X0, 360 - H, z0v), pt(X1, 360 - H, z0v), pt(X1, 360 - H, z1v), pt(X0, 360 - H, z1v)];
    return `<polygon points="${q(t)}" fill="#ffd98a" fill-opacity=".14" stroke="#e8b84a" stroke-width="2.4"/><polygon points="${q(f)}" fill="#1b120b" fill-opacity=".72" stroke="#e8b84a" stroke-width="2.8"/>` +
      `<path d="M${n(f[0][0] + 8)} ${n(f[3][1] - 22)}L${n(f[1][0] - 8)} ${n(f[3][1] - 22)}" stroke="#d9c9a0" stroke-opacity=".6" stroke-width="${n(10 / z0v)}" stroke-linecap="round"/>`;
  };
  const flames = [];
  const cand = (X, z) => { const [x, y] = pt(X, 360, z), h = 90 / z, c = s.nid('flame'); flames.push(c); return `<g><rect x="${n(x - 5 / z)}" y="${n(y - h)}" width="${n(10 / z)}" height="${n(h)}" fill="#efe6cf"/><ellipse class="${c}" cx="${n(x)}" cy="${n(y - h - 8 / z)}" rx="${n(5 / z)}" ry="${n(12 / z)}" fill="#ffb33a"/><circle cx="${n(x)}" cy="${n(y - h - 8 / z)}" r="${n(34 / z)}" fill="#ffb33a" opacity=".18"/></g>`; };
  s.add('fg', vitrines.map(z => vit(-210, -70, z, z + .45) + vit(70, 210, z, z + .45) + (candles ? cand(-250, z) + cand(250, z) : '')).join(''));
  if (flames.length) fx(s, flames.map(c => '.' + c).join(','), {opacity: .6}, {opacity: 1, repeat: fitRepeats(dur, .4), yoyo: true}, at, .4, 'sine.inOut');
  return {pt, floorY: 360, wallX: 440, zBack: zb};
}

/**
 * Cuarto cerrado con bombilla colgante, cono de luz, ventana con barrotes, marcas en la pared y puerta.
 * Devuelve {floorY, door:{x,y,w,h}} para colocar personajes (puppet) y camaras.
 */
export function cellRoom(s, {bulb = [240, 356], floorY = 1000, door = {x: 520, y: 610, w: 164, h: 392}, window = true, tally = true, at = 0, dur = s.duration - at} = {}) {
  checkTime(s, at, dur, 'cellRoom'); s.use('scenery');
  grad(s, 'cell-wall', ['#3a2d22', '#1b140e']); grad(s, 'cell-floor', ['#2d2016', '#0c0806']);
  s.defs('cell-cone', `<radialGradient id="${s.gid('cell-cone')}" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".55"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>`);
  const glow = s.nid('bulbglow');
  s.add('bg', `<rect x="-220" y="-220" width="1160" height="${floorY + 220}" fill="${s.url('cell-wall')}"/><rect x="-220" y="${floorY}" width="1160" height="500" fill="${s.url('cell-floor')}"/><rect x="-220" y="${floorY - 4}" width="1160" height="6" fill="#0a0705"/>`);
  s.add('mid', `<path d="M${bulb[0]} ${bulb[1] - 6}L${bulb[0] - 280} ${floorY}H${bulb[0] + 280}Z" fill="${s.url('cell-cone')}" opacity=".6"/><ellipse cx="${bulb[0]}" cy="${floorY + 4}" rx="230" ry="22" fill="#ffe9a8" opacity=".12"/>` +
    (window ? `<rect x="60" y="400" width="120" height="84" fill="#0b1426" stroke="#4b4f58" stroke-width="6"/><path d="M90 400V484M120 400V484M150 400V484" stroke="#4b4f58" stroke-width="5"/>` : '') +
    (tally ? [0, 1].map(g => `<path d="M${74 + g * 74} 560V618M${88 + g * 74} 560V618M${102 + g * 74} 560V618M${116 + g * 74} 560V618M${68 + g * 74} 604L${124 + g * 74} 572" stroke="#e8dfc8" stroke-opacity=".75" stroke-width="5" stroke-linecap="round"/>`).join('') : ''));
  s.add('mid', `<path d="M${bulb[0]} -220V${bulb[1] - 16}" stroke="#0a0a0a" stroke-width="3"/><circle class="${glow}" cx="${bulb[0]}" cy="${bulb[1]}" r="74" fill="#ffe9a8" opacity=".22"/><circle cx="${bulb[0]}" cy="${bulb[1]}" r="17" fill="#fff4c4"/><path d="M${bulb[0] - 9} ${bulb[1] - 16}h18v-14h-18z" fill="#2a2a2a"/>`);
  if (door) s.add('fg', `<g><rect x="${door.x}" y="${door.y}" width="${door.w}" height="${door.h}" fill="#2c2f36" stroke="#14161a" stroke-width="6"/><rect x="${door.x + 20}" y="${door.y + 22}" width="${door.w - 40}" height="${door.h - 42}" fill="#3d424b"/><rect x="${door.x + 32}" y="${door.y + 40}" width="${door.w - 64}" height="${n(door.h * .38)}" fill="#353a43"/><rect x="${door.x + 32}" y="${door.y + n(door.h * .52)}" width="${door.w - 64}" height="${n(door.h * .36)}" fill="#353a43"/><circle cx="${door.x + 28}" cy="${door.y + n(door.h * .52)}" r="8" fill="#b9bfc9"/></g>`);
  fx(s, '.' + glow, {opacity: .22}, {opacity: .12, repeat: fitRepeats(dur, .5), yoyo: true}, at, .5, 'sine.inOut');
  return {floorY, door};
}
