const source = 'storyboard-art/v1';
const identifier = /^[A-Za-z][\w-]{0,44}$/;
const paint = /^(?:none|#[0-9a-f]{3}|#[0-9a-f]{4}|#[0-9a-f]{6}|#[0-9a-f]{8})$/i;
const pathData = /^[Mm][MmLlHhVvCcSsQqTtAaZz0-9eE+.,\s-]+$/;
const imageAsset = /^user-assets\/[0-9a-f-]{36}\.(?:png|jpg|jpeg|webp)$/;

function numeric(value, min, max, label) {
  if (!Number.isFinite(value) || value < min || value > max)
    throw Error(label + ' debe estar entre ' + min + ' y ' + max + '.');
  return value;
}

function color(value, label) {
  if (typeof value !== 'string' || !paint.test(value)) throw Error(label + ': usa un color hexadecimal o none.');
  return value;
}

function compilePaths(paths, prefix) {
  if (!Array.isArray(paths) || !paths.length || paths.length > 60)
    throw Error('Cada pieza vectorial requiere entre 1 y 60 trazados.');
  return paths.map((path, index) => {
    if (typeof path?.d !== 'string' || path.d.length > 8000 || !pathData.test(path.d.trim()))
      throw Error('Trazado SVG inválido en ' + prefix + ' (' + (index + 1) + ').');
    let fill = color(path.fill ?? 'none', prefix);
    let definition = '';
    if (path.gradient !== undefined) {
      const {from, to, vertical = true} = path.gradient ?? {};
      if (typeof vertical !== 'boolean') throw Error(prefix + ': vertical debe ser booleano.');
      const id = prefix + '.' + index;
      definition = `<defs><linearGradient id="${id}" x2="${vertical ? '0%' : '100%'}" y2="${vertical ? '100%' : '0%'}"><stop stop-color="${color(from, prefix)}"/><stop offset="1" stop-color="${color(to, prefix)}"/></linearGradient></defs>`;
      fill = 'url(#' + id + ')';
    }
    const stroke = color(path.stroke ?? 'none', prefix);
    const width = numeric(path.strokeWidth ?? 1, 0, 100, 'Grosor');
    return definition + `<path d="${path.d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join('');
}

function compileKeys(keys, duration, label, ranges) {
  if (keys === undefined) return undefined;
  if (!Array.isArray(keys) || !keys.length || keys.length > (label === 'Cámara' ? 24 : 100))
    throw Error(label + ': lista de fotogramas clave inválida.');
  let previous = -1;
  return keys.map(key => {
    const at = numeric(key?.at, 0, duration, label + '.at');
    if (at <= previous) throw Error(label + ': los tiempos deben aumentar.');
    previous = at;
    const pose = {at};
    for (const prop of Object.keys(key)) {
      if (prop === 'at') continue;
      if (!Object.hasOwn(ranges, prop)) throw Error(label + ': propiedad de animación desconocida: ' + prop);
      pose[prop] = numeric(key[prop], ...ranges[prop], label + '.' + prop);
    }
    if (Object.keys(pose).length === 1) throw Error(label + ': falta el valor del fotograma clave.');
    return pose;
  });
}

const motionRanges = {x: [-200, 200], y: [-200, 200], rotate: [-3600, 3600], scale: [0.05, 10], opacity: [0, 1]};

export function compileSceneArt(scene, duration) {
  const art = scene.art;
  if (typeof scene.id !== 'string' || !identifier.test(scene.id) || !Array.isArray(art?.parts) || !art.parts.length || art.parts.length > 100)
    throw Error('Arte de escena: se requiere un ID válido y entre 1 y 100 piezas.');
  const ids = new Set();
  const layers = art.parts.map(part => {
    const id = part?.id;
    if (typeof id !== 'string' || !identifier.test(id) || ids.has(id))
      throw Error('Identificador de pieza inválido o duplicado: ' + id);
    if (part.parent !== undefined && !ids.has(part.parent))
      throw Error(id + ': declara primero el grupo padre.');
    ids.add(id);
    const sources = Number(part.paths !== undefined) + Number(part.asset !== undefined) + Number(part.group === true);
    if (sources !== 1) throw Error(id + ': define paths, asset o group.');
    const layer = {
      id,
      type: part.group === true ? 'group' : part.asset !== undefined ? 'image' : 'svg',
      x: numeric(part.x ?? 50, -100, 200, id + '.x'),
      y: numeric(part.y ?? 50, -100, 200, id + '.y'),
      width: numeric(part.width, 0.1, 500, id + '.width'),
      height: numeric(part.height, 0.1, 500, id + '.height'),
      ax: numeric(part.pivot?.x ?? 50, 0, 100, id + '.pivot.x'),
      ay: numeric(part.pivot?.y ?? 50, 0, 100, id + '.pivot.y'),
      opacity: numeric(part.opacity ?? 1, 0, 1, id + '.opacity'),
      ...(part.parent === undefined ? {} : {parent: part.parent}),
    };
    if (part.depth !== undefined) layer.depth = numeric(part.depth, 0, 1, id + '.depth');
    const keyframes = compileKeys(part.keys, duration, id, motionRanges);
    if (keyframes) layer.keyframes = keyframes;
    if (layer.type === 'image') {
      if (typeof part.asset !== 'string' || !imageAsset.test(part.asset))
        throw Error(id + ': selecciona una imagen importada en Motion Studio.');
      layer.asset = part.asset;
    }
    if (layer.type === 'svg') {
      if (!Array.isArray(part.viewBox) || part.viewBox.length !== 4)
        throw Error(id + ': define viewBox como [x, y, ancho, alto].');
      layer.viewBox = part.viewBox.map((n, i) => numeric(n, i < 2 ? -100000 : 0.01, 100000, id + '.viewBox')).join(' ');
      layer.svg = compilePaths(part.paths, 'ms-art-' + scene.id + '.' + id);
    }
    return layer;
  });
  const groups = new Set(layers.filter(layer => layer.type === 'group').map(layer => layer.id));
  for (const layer of layers) {
    if (layer.parent && !groups.has(layer.parent)) throw Error(layer.id + ': el padre debe ser un grupo.');
  }
  const camera = compileKeys(art.camera, duration, 'Cámara', {x: [-100, 100], y: [-100, 100], zoom: [.1, 4], rotate: [-360, 360]});
  return {
    source,
    layers,
    ...(art.background === undefined ? {} : {background: {color: color(art.background, 'Fondo')}}),
    ...(camera ? {camera: {keyframes: camera}} : {}),
  };
}

export function storyboardPartForSelector(authored, selector) {
  if (authored?.source !== source || typeof selector !== 'string' || !selector.startsWith('.ms-part-'))
    return undefined;
  return authored.layers?.find(layer => '.ms-part-' + layer.id === selector);
}

export function storyboardPartMoves(authored, selector, from, to) {
  let layer = storyboardPartForSelector(authored, selector);
  const visited = new Set();
  while (layer && !visited.has(layer.id)) {
    visited.add(layer.id);
    let start = 0;
    const pose = {x: 0, y: 0, rotate: 0, scale: 1, opacity: 1};
    for (const {at, ...values} of layer.keyframes ?? []) {
      const changes = Object.entries(values).some(([key, value]) => pose[key] !== value);
      if (changes && at > from && start < to) return true;
      start = at;
      Object.assign(pose, values);
    }
    layer = authored.layers.find(parent => parent.id === layer.parent);
  }
  return false;
}
