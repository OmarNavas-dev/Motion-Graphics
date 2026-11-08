// Fotografia del usuario dentro de una escena, con zoom lento (Ken Burns) y marco opcional.
// Contrato: solo `user-assets/<UUID>.(png|jpg|jpeg|webp)`. NO verificado en Motion Studio: confirmar que el motor resuelva la ruta
// relativa dentro de customScene; si no, usar scene.imageAsset/imageFit del contrato para el plano completo.
import {n, checkTime} from './scene-kit.mjs';
import {fx, ASSET, esc} from './kit-util.mjs';

export function photo(s, {asset, x = 360, y = 640, w = 600, h = 800, zoom = [1, 1.12], pan = [0, 0], at = 0, dur = s.duration - at, frame = true, radius = 14, caption = '', layer = 'fg'} = {}) {
  if (!ASSET.test(String(asset ?? ''))) throw Error('photo: asset debe ser user-assets/<UUID de 36 caracteres>.png|jpg|jpeg|webp.');
  checkTime(s, at, dur, 'photo'); s.use('photo');
  const c = s.nid('photo'), id = 'clip-' + c;
  s.defs(id, `<clipPath id="${s.gid(id)}"><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${radius}"/></clipPath>`);
  s.add(layer, `<g><rect x="${x - w / 2 - 10}" y="${y - h / 2 - 10}" width="${w + 20}" height="${h + 20}" rx="${radius + 6}" fill="${frame ? '#f4efe2' : 'none'}" opacity="${frame ? .96 : 0}"/><g clip-path="${s.url(id)}"><g class="${c}"><image href="${asset}" x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/></g></g>` +
    (caption ? `<text x="${x}" y="${y + h / 2 + 46}" text-anchor="middle" font-size="22" font-weight="600" fill="#e9eefb">${esc(caption)}</text>` : '') + `</g>`);
  fx(s, '.' + c, {scale: zoom[0], x: 0, y: 0, svgOrigin: `${x} ${y}`}, {scale: zoom[1], x: pan[0], y: pan[1], svgOrigin: `${x} ${y}`}, at, dur, 'none');
  return {cls: c};
}
