import {visualActionProgress} from './visual-action-planner.mjs';

const colors = {
  stone: '#D7D2C5', wall: '#B96950', cool: '#91A8B3', roof: '#D6A65F',
  wood: '#9A6038', soil: '#41434A', deepSoil: '#292D37', water: 'rgba(32,157,188,.52)',
  cyan: '#56D7E5', gold: '#F4C56C', dark: '#111B28', white: '#F4F4EA',
};

const normalize = ([x, y, z]) => {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
};
const subtract = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export function buildVeniceGeometry(detail = 'foundation', frame = 0, plan = {}, progress = 0) {
  const polygons = [];
  const p = visualActionProgress(plan, progress);
  const eased = p * p * (3 - 2 * p);
  const actionType = plan?.actionType || 'reveal';
  const add = (points, color, tag = '') => polygons.push({points, color, tag});
  const box = (x, y, z, width, height, depth, color, tag = '') => {
    const x0 = x - width / 2, x1 = x + width / 2;
    const y0 = y - height / 2, y1 = y + height / 2;
    const z0 = z - depth / 2, z1 = z + depth / 2;
    const p = [[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
    [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[0,3,7,4],[1,5,6,2]].forEach((face) =>
      add(face.map((i) => p[i]), color, tag));
  };
  const roof = (x, z, width, depth, baseY, peakY) => {
    const x0 = x - width / 2, x1 = x + width / 2;
    const z0 = z - depth / 2, z1 = z + depth / 2;
    const peakFront = [x, peakY, z1], peakBack = [x, peakY, z0];
    const leftFront = [x0, baseY, z1], rightFront = [x1, baseY, z1];
    const leftBack = [x0, baseY, z0], rightBack = [x1, baseY, z0];
    add([leftFront, peakFront, peakBack, leftBack], colors.roof, 'techo');
    add([peakFront, rightFront, rightBack, peakBack], '#9D6649', 'techo');
    add([leftFront, rightFront, peakFront], '#E9BA72', 'techo');
    add([rightBack, leftBack, peakBack], '#79513D', 'techo');
  };
  const house = (x, width, height, color, z = 0, verticalOffset = 0) => {
    const depth = 1.05, base = 0.34 + verticalOffset;
    box(x, base + height / 2, z, width, height, depth, color, 'edificio');
    roof(x, z, width + 0.2, depth + 0.15, base + height, base + height + 0.64);
    const rows = Math.max(2, Math.floor(height / 0.68));
    for (let row = 0; row < rows; row++) {
      const yy = base + 0.46 + row * ((height - 0.5) / rows);
      for (const offset of [-0.26, 0.26]) {
        const wx = x + offset * width;
        box(wx, yy, z + depth / 2 + 0.035, 0.17, 0.37, 0.07, '#F4CF88', 'ventana');
        box(wx, yy, z + depth / 2 + 0.078, 0.095, 0.27, 0.025, '#263947', 'cristal');
      }
    }
    box(x, base + 0.31, z + depth / 2 + 0.04, 0.23, 0.56, 0.08, '#644338', 'puerta');
  };
  const gondola = (x, z = 1.35) => {
    add([[x-0.68,0.32,z],[x+0.68,0.32,z],[x+0.4,0.44,z],[x-0.4,0.44,z]], '#171F2B', 'góndola');
    add([[x+0.68,0.32,z],[x+0.4,0.44,z],[x-0.4,0.44,z]], colors.gold, 'cubierta góndola');
    box(x, 0.84, z, 0.06, 0.78, 0.06, colors.gold, 'remo');
  };
  const cylinder = (x, y, z, radius, height, sides, color, rotation = 0) => {
    const lower = [], upper = [];
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 * i) / sides + rotation;
      const px = x + Math.cos(angle) * radius, pz = z + Math.sin(angle) * radius;
      lower.push([px, y - height / 2, pz]);
      upper.push([px, y + height / 2, pz]);
    }
    for (let i = 0; i < sides; i++) add([lower[i], lower[(i + 1) % sides], upper[(i + 1) % sides], upper[i]], i % 3 ? color : '#C58B54', 'madera');
    add(upper, '#D5A66A', 'corte de madera');
  };
  const water = (y) => add([[-4.2,y,-2.8],[4.2,y,-2.8],[4.2,y,3.2],[-4.2,y,3.2]], colors.water, 'agua');
  const pileField = (count = 7) => {
    for (let i = 0; i < count; i++) {
      const x = -2.35 + (4.7 * i) / Math.max(1, count - 1);
      const staggered = Math.max(0.04, Math.min(1, (p * 1.35 - i * 0.055) / 0.95));
      const pileHeight = actionType === 'construct' ? 2.9 * staggered : 2.9;
      for (const z of [-0.52, 0.46]) box(x, -2.7 + pileHeight / 2, z, 0.17, pileHeight, 0.18, colors.wood, 'pilote');
    }
  };
  const city = (verticalOffset = 0) => {
    house(-2.05, 1.18, 1.72, colors.wall, 0.05, verticalOffset);
    house(0, 1.5, 2.58, colors.cool, -0.05, verticalOffset);
    house(2.02, 1.14, 1.8, '#AC7156', 0.12, verticalOffset);
    box(0.14, 3.43 + verticalOffset, -0.05, 0.35, 0.62, 0.36, colors.roof, 'campanario');
  };
  const focalBuilding = (verticalOffset = 0) => {
    house(0, 2.18, 2.55, colors.cool, -0.05, verticalOffset);
    box(0.12, 3.43 + verticalOffset, -0.05, 0.35, 0.62, 0.36, colors.roof, 'campanario');
  };
  const comparisonBuildings = (sink = 0) => {
    house(-1.42, 1.25, 1.8, colors.wall, 0.05, -0.52 * sink);
    house(1.45, 1.25, 1.8, colors.cool, -0.05, 0);
  };
  const distantSkyline = () => {
    house(-2.5, 0.78, 1.22, colors.wall, 0.05, 0);
    house(2.45, 0.82, 1.35, colors.cool, -0.05, 0);
  };
  const addArrow = (x, yTop, yBottom, z = 0.92) => {
    const height = Math.max(0.1, yTop - yBottom);
    const shaftHeight = Math.max(0.05, height - 0.3);
    box(x, (yTop + yBottom) / 2 + 0.15, z, 0.055, shaftHeight, 0.055, colors.gold, 'carga');
    add([[x - 0.18, yBottom + 0.34, z + 0.06], [x + 0.18, yBottom + 0.34, z + 0.06], [x, yBottom, z + 0.06]], colors.gold, 'flecha');
  };

  if (detail === 'timber') {
    box(0, -2.85, 0, 7.8, 0.8, 5.4, colors.deepSoil, 'estrato');
    water(0.04 + Math.sin(frame / 18) * 0.045);
    const woodRotation = actionType === 'inspect' ? (p - 0.5) * 0.9 : 0;
    cylinder(0, -1.05, 0, 0.66, 3.65, 16, colors.wood, woodRotation);
    for (const z of [-0.15, 0.17]) box(0, -1.05, z + 0.66, 1.18, 0.06, 0.04, '#E0B479', 'veta');
  } else if (actionType === 'inspect') {
    const inspectionOffset = (1 - eased) * 0.22;
    focalBuilding();
    box(0, -2.9, 0, 8, 0.72, 5.8, colors.deepSoil, 'suelo firme');
    box(0, -2.4, 0, 8, 0.28, 5.8, colors.soil, 'barro');
    box(0, 0.15, 0, 5.2, 0.25, 1.9, colors.stone, 'plataforma');
    [-0.95, 0, 0.95].forEach((x) => {
      box(x, -0.77 - inspectionOffset, 0.22, 0.22, 1.6 + inspectionOffset, 0.22, colors.wood, 'pilote');
      box(x, -1.57 - inspectionOffset, 0.35, 0.33, 0.16, 0.05, '#E0B479', 'corte de pilote');
    });
    water(0.04 + Math.sin(frame / 18) * 0.045);
  } else if (actionType === 'rise') {
    distantSkyline();
    gondola(-0.68);
    water(0.04 + eased * 0.82 + Math.sin(frame / 15) * 0.035);
    [-2.2, 0, 2.2].forEach((x, index) => {
      const waterline = 0.04 + eased * 0.82;
      const baseY = 0.34 - Math.max(0, waterline - 0.1) * (index === 1 ? 0.62 : 0.34);
      const height = index === 1 ? 1.56 : 1.1;
      box(x, baseY + height / 2, index === 1 ? -0.05 : 0.12, index === 1 ? 1.05 : 0.82, height, 0.85, index === 1 ? colors.cool : colors.wall, 'edificio mareado');
    });
    box(0, -1.5, 0, 8, 0.28, 5.8, colors.soil, 'costa');
    box(2.86, 0.9, 0.85, 0.09, 2.8, 0.09, colors.gold, 'mareometro');
    for (let i = 0; i < 6; i++) box(2.76, -0.25 + i * 0.44, 0.91, 0.27, 0.035, 0.05, colors.white, 'marca nivel');
  } else if (actionType === 'close') {
    distantSkyline();
    water(-0.12 + Math.sin(frame / 18) * 0.04);
    gondola(0.72, -0.5);
    box(0, -0.42, -0.55, 8, 0.18, 1.6, colors.deepSoil, 'fondo canal');
    for (let i = 0; i < 4; i++) {
      const x = -2.1 + i * 1.4;
      const gateHeight = 0.06 + 1.39 * eased;
      box(x, -1.08 + gateHeight / 2, 1.45, 0.32, gateHeight, 0.42, i % 2 ? colors.gold : colors.cyan, 'compuerta MOSE');
      box(x, -1.15, 1.45, 0.7, 0.18, 0.62, '#596B76', 'base compuerta');
    }
  } else {
    const cityOffset = actionType === 'install' ? 0.62 * (1 - eased) : 0;
    if (actionType === 'compare') comparisonBuildings(eased);
    else if (actionType === 'close') distantSkyline();
    else if (['construct', 'descend', 'install', 'transfer'].includes(actionType) || detail === 'load') focalBuilding(cityOffset);
    else city(cityOffset);
    const hasFoundation = ['foundation', 'load'].includes(detail) ||
      ['descend', 'construct', 'install', 'transfer', 'compare'].includes(actionType);
    if (hasFoundation) {
      const sink = actionType === 'compare' ? 0.18 * eased : 0;
      box(0, -2.9 - sink, 0, 8, 0.72, 5.8, colors.deepSoil, 'suelo firme');
      box(0, -2.4 - sink, 0, 8, 0.28, 5.8, colors.soil, 'barro');
      const platformY = actionType === 'install' ? 0.15 + 0.62 * (1 - eased) : 0.15;
      box(0, platformY, 0, 5.2, 0.25, 1.9, colors.stone, 'plataforma');
      pileField(detail === 'load' ? 5 : 7);
    }
    const risingWater = detail === 'tide' || actionType === 'rise';
    const waterLevel = risingWater ? 0.04 + eased * 0.82 + Math.sin(frame / 15) * 0.035 : 0.04;
    water(waterLevel);
    if (detail === 'load' || actionType === 'transfer') {
      const arrowEnd = actionType === 'transfer' ? 2.45 - eased * 4.35 : -2.2;
      [-1.45, 0, 1.45].forEach((x) => addArrow(x, 2.65, arrowEnd));
    }
    if (detail === 'tide') {
      box(2.86, 0.9, 0.85, 0.09, 2.8, 0.09, colors.gold, 'mareometro');
      for (let i = 0; i < 6; i++) box(2.76, -0.25 + i * 0.44, 0.91, 0.27, 0.035, 0.05, colors.white, 'marca nivel');
    }
    if (detail === 'mose') {
      for (let i = 0; i < 4; i++) {
        const x = -2.1 + i * 1.4;
        const gateHeight = actionType === 'close' ? 0.06 + 1.39 * eased : 1.45;
        const gateBottom = -1.08;
        box(x, gateBottom + gateHeight / 2, 1.45, 0.32, gateHeight, 0.42, i % 2 ? colors.gold : colors.cyan, 'compuerta MOSE');
        box(x, -1.15, 1.45, 0.7, 0.18, 0.62, '#596B76', 'base compuerta');
      }
    }
    if (['city', 'lagoon'].includes(detail) || ['establish', 'follow', 'resolve'].includes(actionType)) {
      const boatX = actionType === 'follow' ? -2.6 + 5.2 * p : -0.68;
      add([[boatX-0.5,0.32,1.35],[boatX+0.5,0.32,1.35],[boatX+0.3,0.43,1.35],[boatX-0.3,0.43,1.35]], '#171F2B', 'gondola');
      add([[boatX+0.5,0.32,1.35],[boatX+0.3,0.43,1.35],[boatX-0.3,0.43,1.35]], colors.gold, 'vela');
    }
  }
  return polygons;
}

const colorToRgba = (color, factor) => {
  const hex = /^#([\da-f]{6})$/i.exec(color);
  if (hex) {
    const value = Number.parseInt(hex[1], 16);
    const r = Math.round(((value >> 16) & 255) * factor);
    const g = Math.round(((value >> 8) & 255) * factor);
    const b = Math.round((value & 255) * factor);
    return `rgb(${r},${g},${b})`;
  }
  const rgba = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(color);
  if (rgba) return `rgba(${Math.round(Number(rgba[1]) * factor)},${Math.round(Number(rgba[2]) * factor)},${Math.round(Number(rgba[3]) * factor)},${rgba[4]})`;
  return color;
};

export function drawVeniceFrame(ctx, width, height, frame, detail = 'foundation', showText = false, plan = {}, progress = 0) {
  const scaleX = width / 720, scaleY = height / 1280;
  ctx.save();
  ctx.scale(scaleX, scaleY);
  const background = ctx.createLinearGradient(0, 0, 0, 1280);
  background.addColorStop(0, '#07131E');
  background.addColorStop(0.58, '#10263A');
  background.addColorStop(1, '#07111B');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 720, 1280);
  const glow = ctx.createRadialGradient(520, 365, 10, 520, 365, 610);
  glow.addColorStop(0, 'rgba(74,167,194,.22)');
  glow.addColorStop(1, 'rgba(74,167,194,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 720, 1280);
  for (let i = 0; i < 36; i++) {
    const x = (i * 193 + 41) % 720, y = (i * 137 + 53) % 370;
    ctx.fillStyle = `rgba(216,235,238,${0.1 + (i % 4) * 0.045})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  const actionProgress = visualActionProgress(plan, p);
  const eased = p * p * (3 - 2 * p);
  const actionType = plan?.actionType || 'reveal';
  const cameraPreset = plan?.camera || 'drift';
  const shotScale = plan?.shotScale || 'medium';
  const baseDistance = shotScale === 'close' ? 8.8 : shotScale === 'wide' ? 12.4 : 10.5;
  const camera = [3.5, 4.1, baseDistance];
  if (cameraPreset === 'push') camera[2] -= 1.25 * eased;
  if (cameraPreset === 'pull') camera[2] += 1.25 * eased;
  if (cameraPreset === 'pan-left') camera[0] -= 0.9 * eased;
  if (cameraPreset === 'pan-right') camera[0] += 0.9 * eased;
  if (cameraPreset === 'rise') camera[1] += 0.85 * eased;
  if (cameraPreset === 'drift') {
    camera[0] += Math.sin(Math.PI * p) * 0.38;
    camera[1] += Math.sin(Math.PI * p) * 0.12;
  }
  const target = [0, -0.12 + (actionType === 'descend' ? -0.78 * eased : 0), 0];
  const forward = normalize(subtract(target, camera));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = normalize(cross(right, forward));
  const focal = shotScale === 'close' ? 1920 : shotScale === 'wide' ? 1540 : 1720;
  const polygons = buildVeniceGeometry(detail, frame, plan, p).map((polygon) => {
    const cameraPoints = polygon.points.map((point) => {
      const relative = subtract(point, camera);
      return {x: dot(relative, right), y: dot(relative, up), z: dot(relative, forward)};
    });
    const z = cameraPoints.reduce((sum, point) => sum + point.z, 0) / cameraPoints.length;
    const normal = normalize(cross(subtract(polygon.points[1], polygon.points[0]), subtract(polygon.points[2], polygon.points[0])));
    const lighting = Math.max(0.48, Math.min(1.22, 0.55 + Math.abs(dot(normal, normalize([-0.45, 0.78, 0.56]))) * 0.62));
    return {polygon, cameraPoints, z, lighting};
  }).filter((item) => item.z > 0.2).sort((a, b) => b.z - a.z);

  for (const item of polygons) {
    ctx.beginPath();
    item.cameraPoints.forEach((point, index) => {
      const x = 360 + (point.x * focal) / point.z;
      const y = 650 - (point.y * focal) / point.z;
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = colorToRgba(item.polygon.color, item.lighting);
    ctx.fill();
    ctx.strokeStyle = item.polygon.tag === 'agua' ? 'rgba(179,247,247,.36)' : 'rgba(6,15,24,.72)';
    ctx.lineWidth = item.polygon.tag === 'agua' ? 2 : 1.5;
    ctx.stroke();
  }

  const waveY = 736 - (actionType === 'rise' ? 170 * actionProgress : 0) + Math.sin(frame / 13) * 7;
  ctx.beginPath();
  for (let x = 20; x <= 700; x += 16) {
    const y = waveY + Math.sin(x / 39 + frame / 9) * 5;
    if (x === 20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = 'rgba(179,247,247,.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (showText) {
    const labels = {foundation:'PILOTES Y CIMIENTOS', timber:'MADERA SUMERGIDA', load:'REPARTO DE CARGAS', tide:'MAREA ALTA', mose:'BARRERAS MOSE', city:'LAGUNA DE VENECIA', lagoon:'LAGUNA DE VENECIA'};
    const actionLabels = {establish:'VENECIA SOBRE LA LAGUNA', descend:'CORTE BAJO LA CALLE', construct:'HINCADO DE PILOTES', install:'PLATAFORMA Y CIMIENTOS', inspect:'MADERA SUMERGIDA', transfer:'TRAYECTORIA DE CARGA', compare:'SUELO Y NIVEL DEL AGUA', rise:'MAREA EN ASCENSO', close:'COMPUERTAS MOSE', resolve:'EQUILIBRIO DE VENECIA'};
    const label = actionLabels[actionType] || labels[detail] || 'EXPLICADOR 3D';
    ctx.font = '800 22px Arial, sans-serif';
    const pillWidth = ctx.measureText(label).width + 42;
    ctx.fillStyle = 'rgba(4,12,20,.86)';
    ctx.beginPath();
    ctx.roundRect(34, 1120, pillWidth, 52, 10);
    ctx.fill();
    ctx.strokeStyle = '#E5B95F';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#FFE2A0';
    ctx.fillText(label, 55, 1154);
  }
  ctx.restore();
}
