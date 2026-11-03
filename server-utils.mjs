import path from 'node:path';
import {ensureDistinctVisualActionPlan, normalizeVisualActionPlan} from './src/visual-action-planner.mjs';

export const MAX_PROJECT_BYTES = 8 * 1024 * 1024;
export const MAX_ASSET_BYTES = 50 * 1024 * 1024;
export const MAX_SCENES = 80;
export const MAX_VIDEO_SECONDS = 900;
// Presupuesto real del proyecto: 1 MB de base y 96 KB por escena. Una escena
// HTML a medida puede ocupar hasta ~54 KB, así que 80 escenas caben sin
// truncar y un proyecto de plantilla sigue limitado a cifras razonables.
export const PROJECT_BASE_BYTES = 1024 * 1024;
export const PROJECT_BYTES_PER_SCENE = 96 * 1024;
export const projectByteLimit = (sceneCount) =>
  PROJECT_BASE_BYTES + Math.max(1, Number(sceneCount) || 1) * PROJECT_BYTES_PER_SCENE;
export const formats = new Set(['vertical', 'horizontal']);
export const palettes = new Set(['aurora', 'sunset', 'mono']);
export const layouts = new Set(['hero', 'orbit', 'editorial', 'data', 'kinetic', 'collage']);
export const shapes = new Set(['ring', 'dot', 'bars', 'square']);
export const styles = new Set(['modern', 'horror', 'watercolor', 'documentary',
  'cinematic', 'tech', 'minimal', 'energetic', 'playful']);
export const motionPresets = new Set(['auto', 'static', 'push', 'pull', 'pan-left',
  'pan-right', 'rise', 'drift']);
export const transitionPresets = new Set(['cut', 'fade', 'dip', 'flash']);
export const characterModes = new Set(['preserve', 'new']);
export const graphicKinds = new Set(['counter', 'bar', 'donut', 'icon']);
export const graphicUnits = new Set(['currency', 'percent', 'number']);
export const graphicIcons = new Set(['wallet', 'home', 'food', 'transport', 'shopping', 'savings', 'growth']);
export const mediaExts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.mp3', '.wav', '.m4a', '.mp4',
  '.woff2', '.ttf', '.otf']);
const safeAsset = /^user-assets\/[0-9a-f-]{36}\.(?:png|jpg|jpeg|webp|mp3|wav|m4a|mp4|woff2|ttf|otf)$/;

const text = (value, max = 90) => String(value ?? '').trim().slice(0, max);
const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function validateProject(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('El proyecto debe ser un objeto JSON.');
  }
  if (!Array.isArray(raw.scenes) || raw.scenes.length > MAX_SCENES) {
    throw new Error(`Se permiten hasta ${MAX_SCENES} escenas.`);
  }
  if (raw.scenes.length === 0 && [raw.audioAsset, raw.musicAsset, raw.fontAsset,
    raw.references?.length, raw.voiceClips?.length].some((value) => Boolean(value))) {
    throw new Error('Un proyecto sin escenas no puede conservar medios de otro proyecto.');
  }
  const references = raw.references ?? [];
  if (!Array.isArray(references) || references.length > 20) {
    throw new Error('Se permiten hasta 20 referencias visuales.');
  }
  const voiceClips = raw.voiceClips ?? [];
  if (!Array.isArray(voiceClips) || voiceClips.length > 100) {
    throw new Error('Se permiten hasta 100 audios de dialogo.');
  }
  const visualActionPlans = [];
  const project = {
    name: text(raw.name || 'Motion Studio', 42),
    format: formats.has(raw.format) ? raw.format : 'vertical',
    palette: palettes.has(raw.palette) ? raw.palette : 'aurora',
    audioAsset: validateAsset(raw.audioAsset, 'audio'),
    musicAsset: validateAsset(raw.musicAsset, 'audio'),
    musicVolume: Math.round(Math.min(0.5, Math.max(0, number(raw.musicVolume, 0.18))) * 100) / 100,
    script: text(raw.script, 45000),
    creativeBrief: text(raw.creativeBrief, 2000),
    style: styles.has(raw.style) ? raw.style : 'modern',
    visualEngine: ['classic', 'canvas'].includes(raw.visualEngine) ? raw.visualEngine : 'adaptive',
    resolution: raw.resolution === '1080p' ? '1080p' : '720p',
    fps: Number(raw.fps) === 30 ? 30 : 24,
    fontAsset: validateAsset(raw.fontAsset, 'font'),
    fontFamily: text(raw.fontFamily, 60).replace(/[^a-zA-Z0-9 _-]/g, ''),
    showText: typeof raw.showText === 'boolean' ? raw.showText : true,
    characterMode: characterModes.has(raw.characterMode) ? raw.characterMode : 'new',
    references: references.map((asset) => validateAsset(asset, 'image')),
    narrationMode: raw.narrationMode === 'dialogues' ? 'dialogues' : 'single',
    voiceClips: voiceClips.map((clip, index) => {
      if (!clip || typeof clip !== 'object') throw new Error('Audio de dialogo invalido.');
      const duration = number(clip.duration, NaN);
      if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_VIDEO_SECONDS) {
        throw new Error(`El audio de dialogo ${index + 1} necesita una duracion valida.`);
      }
      return {
        id: text(clip.id || `clip-${index + 1}`, 45).replace(/[^a-zA-Z0-9-_]/g, ''),
        speaker: text(clip.speaker || `Voz ${index + 1}`, 70),
        asset: validateAsset(clip.asset, 'audio'),
        duration: Math.round(duration * 1000) / 1000,
      };
    }),
    scenes: raw.scenes.map((rawScene, index) => {
      const scene = rawScene && typeof rawScene === 'object' ? rawScene : {};
      const duration = Math.min(60, Math.max(0.5, Math.round(number(scene.duration, 4) * 100) / 100));
      const hadVisualActionPlan = scene.visualActionPlan?.version === 1 && typeof scene.visualActionPlan.action === 'string';
      const normalizedPlan = normalizeVisualActionPlan(scene.visualActionPlan, scene, raw, index, visualActionPlans[index - 1]);
      const visualActionPlan = ensureDistinctVisualActionPlan(normalizedPlan, visualActionPlans, index);
      const planAdjusted = normalizedPlan.action !== visualActionPlan.action;
      visualActionPlans.push(visualActionPlan);
      const incomingCues = scene.cues === undefined ? [] : scene.cues;
      if (!Array.isArray(incomingCues) || incomingCues.length > 16) {
        throw new Error(`La escena ${index + 1} debe tener entre 0 y 16 elementos temporizados.`);
      }
      const incomingGraphics = scene.motionGraphics ?? [];
      if (!Array.isArray(incomingGraphics) || incomingGraphics.length > 8) {
        throw new Error(`La escena ${index + 1} admite hasta 8 gráficos inteligentes.`);
      }
      return {
        id: text(scene.id || `scene-${index + 1}`, 45).replace(/[^a-zA-Z0-9-_]/g, ''),
        layout: layouts.has(scene.layout) ? scene.layout : 'hero',
        duration,
        title: text(scene.title, 80),
        subtitle: text(scene.subtitle, 160),
        imageAsset: validateAsset(scene.imageAsset, 'image'),
        imageFit: ['contain', 'cover'].includes(scene.imageFit) ? scene.imageFit : 'auto',
        videoAsset: validateAsset(scene.videoAsset, 'video'),
        approved: scene.approved === true && hadVisualActionPlan && !planAdjusted,
        scriptExcerpt: text(scene.scriptExcerpt, 800),
        visualQuery: text(scene.visualQuery, 100),
        visualPlan: text(scene.visualPlan, 320),
        visualActionPlan,
        style: styles.has(scene.style) ? scene.style : undefined,
        motion: motionPresets.has(scene.motion) ? scene.motion : 'auto',
        motionStrength: Math.round(Math.min(100, Math.max(0, number(scene.motionStrength, 40)))),
        transition: transitionPresets.has(scene.transition) ? scene.transition : 'cut',
        focusX: Math.round(Math.min(100, Math.max(0, number(scene.focusX, 50)))),
        focusY: Math.round(Math.min(100, Math.max(0, number(scene.focusY, 50)))),
        customScene: sanitizeCustomScene(scene.customScene, index + 1),
        layers: (Array.isArray(scene.layers) ? scene.layers : []).slice(0, 8).map((rawLayer, layerIndex) => {
          const layer = rawLayer && typeof rawLayer === 'object' ? rawLayer : {};
          return {id: text(layer.id || `layer-${layerIndex + 1}`, 45).replace(/[^a-zA-Z0-9-_]/g, ''), asset: validateAsset(layer.asset, 'image'), depth: Math.round(Math.min(100, Math.max(-100, number(layer.depth, 0)))), x: Math.round(Math.min(100, Math.max(0, number(layer.x, 50)))), y: Math.round(Math.min(100, Math.max(0, number(layer.y, 50)))), scale: Math.round(Math.min(3, Math.max(0.1, number(layer.scale, 1))) * 100) / 100, opacity: Math.round(Math.min(1, Math.max(0, number(layer.opacity, 1))) * 100) / 100};
        }).filter((layer) => layer.asset),
        audioCues: (Array.isArray(scene.audioCues) ? scene.audioCues : []).slice(0, 8).map((rawCue, cueIndex) => {
          const cue = rawCue && typeof rawCue === 'object' ? rawCue : {};
          return {id: text(cue.id || `audio-cue-${cueIndex + 1}`, 45).replace(/[^a-zA-Z0-9-_]/g, ''), at: Math.max(0, Math.min(duration - 0.05, number(cue.at, 0))), duration: Math.max(0.05, Math.min(duration, number(cue.duration, 1))), asset: validateAsset(cue.asset, 'audio'), volume: Math.round(Math.min(1, Math.max(0, number(cue.volume, 0.45))) * 100) / 100};
        }).filter((cue) => cue.asset),
        captions: (Array.isArray(scene.captions) ? scene.captions : []).slice(0, 80).map((rawCaption, captionIndex) => {
          const caption = rawCaption && typeof rawCaption === 'object' ? rawCaption : {};
          const at = Math.max(0, Math.min(duration - 0.05, number(caption.at, 0)));
          return {
            id: text(caption.id || `caption-${captionIndex + 1}`, 45).replace(/[^a-zA-Z0-9-_]/g, ''),
            at: Math.round(at * 1000) / 1000,
            duration: Math.round(Math.min(duration - at, Math.max(0.05, number(caption.duration, 0.8))) * 1000) / 1000,
            text: text(caption.text, 180),
            emphasis: Array.isArray(caption.emphasis) ? caption.emphasis.map((word) => text(word, 40)).filter(Boolean).slice(0, 8) : [],
            position: caption.position === 'top' ? 'top' : 'bottom',
          };
        }).filter((caption) => caption.text),
        cues: incomingCues.map((rawCue, cueIndex) => {
          const cue = rawCue && typeof rawCue === 'object' ? rawCue : {};
          const at = Math.max(0, Math.min(duration - 0.2, number(cue.at, 0)));
          return {
            id: text(cue.id || `cue-${cueIndex + 1}`, 45).replace(/[^a-zA-Z0-9-_]/g, ''),
            at: Math.round(at * 10) / 10,
            duration: Math.min(duration - at, Math.max(0.2, number(cue.duration, 1))),
            shape: shapes.has(cue.shape) ? cue.shape : 'ring',
            label: text(cue.label, 30),
          };
        }),
        motionGraphics: incomingGraphics.map((input, graphicIndex) => {
          const graphic = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
          const at = Math.max(0, Math.min(duration - 0.2, number(graphic.at, 0.4)));
          const segments = Array.isArray(graphic.segments) ? graphic.segments.slice(0, 5) : [];
          return {
            id: text(graphic.id || `graphic-${graphicIndex + 1}`, 45).replace(/[^a-zA-Z0-9-_]/g, ''),
            kind: graphicKinds.has(graphic.kind) ? graphic.kind : 'counter',
            label: text(graphic.label, 55),
            value: Math.min(1e9, Math.max(0, number(graphic.value, 0))),
            unit: graphicUnits.has(graphic.unit) ? graphic.unit : 'number',
            at: Math.round(at * 100) / 100,
            duration: Math.round(Math.min(duration - at, Math.max(0.2, number(graphic.duration, 1.1))) * 100) / 100,
            maxValue: Math.min(1e9, Math.max(1, number(graphic.maxValue, 100))),
            icon: graphicIcons.has(graphic.icon) ? graphic.icon : 'wallet',
            segments: segments.map((part) => ({
              label: text(part?.label, 30),
              value: Math.min(100, Math.max(0, number(part?.value, 0))),
            })),
          };
        }),
      };
    }),
  };
  const length = project.scenes.reduce((acc, scene) => acc + scene.duration, 0);
  if (length > MAX_VIDEO_SECONDS) throw new Error('El video no puede superar 15 minutos.');
  if (project.voiceClips.reduce((sum, clip) => sum + clip.duration, 0) > MAX_VIDEO_SECONDS) {
    throw new Error('La suma de audios por dialogo no puede superar 15 minutos.');
  }
  if (project.narrationMode === 'dialogues' && project.voiceClips.some((clip) => !clip.asset)) {
    throw new Error('Cada dialogo necesita un archivo de audio.');
  }
  return project;
}

const CUSTOM_LIMITS = {html: 30000, css: 12000, script: 12000};
const BLOCKED_HTML = /<\s*(script|iframe|object|embed|link|meta|base|form|style\b[^>]*\bsrc)\b|\son[a-z]+\s*=|javascript:|data:text\/html/i;
const BLOCKED_REMOTE = /(?:src|href)\s*=\s*["']?\s*(?:https?:)?\/\/|url\(\s*["']?\s*(?:https?:)?\/\/|@import/i;
const BLOCKED_SCRIPT = /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|importScripts|eval|localStorage|sessionStorage|indexedDB|requestAnimationFrame|setTimeout|setInterval|require|process|globalThis)\b|\bnew\s+Function\b|\bimport\s*[(\s{*]|\bMath\.random\b|\bDate\.now\b|\bnew\s+Date\b|\bperformance\.now\b|document\.(?:cookie|write)|window\.(?:open|location|parent|top)|\blocation\b|\bpostMessage\b|\bnavigator\b/;

export function sanitizeCustomScene(raw, sceneNumber) {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`La escena ${sceneNumber} tiene un bloque HTML a medida invalido.`);
  }
  const out = {};
  for (const key of ['html', 'css', 'script']) {
    const value = raw[key] === undefined ? '' : String(raw[key]);
    if (value.length > CUSTOM_LIMITS[key]) {
      throw new Error(`En la escena ${sceneNumber}, ${key} supera ${CUSTOM_LIMITS[key]} caracteres.`);
    }
    out[key] = value;
  }
  if (!out.html.trim()) return undefined;
  const namespaced = (text) => text.replace(/https?:\/\/www\.w3\.org\/[0-9A-Za-z/._-]*/g, '');
  if (BLOCKED_HTML.test(out.html)) {
    throw new Error(`La escena ${sceneNumber} contiene etiquetas o eventos no permitidos en su HTML (script, iframe, onclick...).`);
  }
  if (BLOCKED_REMOTE.test(namespaced(out.html)) || BLOCKED_REMOTE.test(namespaced(out.css))) {
    throw new Error(`La escena ${sceneNumber} usa recursos externos. Importa la imagen y usa __IMAGE__ en su lugar.`);
  }
  if (/<\s*\/?\s*style/i.test(out.css) || /<\s*script/i.test(out.css)) {
    throw new Error(`El CSS de la escena ${sceneNumber} no debe incluir etiquetas.`);
  }
  if (BLOCKED_SCRIPT.test(out.script)) {
    throw new Error(`El script de la escena ${sceneNumber} usa funciones no permitidas (red, relojes, azar o almacenamiento). Debe ser determinista.`);
  }
  return out;
}

export function assertApproved(project) {
  if (project.scenes.length === 0) throw new Error('Añade al menos una escena antes de exportar.');
  const unapproved = project.scenes.filter((scene) => scene.approved !== true);
  if (unapproved.length > 0) {
    throw new Error(`Revisa y aprueba las ${unapproved.length} escenas pendientes antes de exportar.`);
  }
}

export function validateAsset(value, kind = 'any') {
  const asset = String(value || '');
  if (!asset) return '';
  if (!safeAsset.test(asset)) throw new Error('Referencia de archivo no permitida.');
  const ext = path.extname(asset).toLowerCase();
  if (kind === 'audio' && !['.mp3', '.wav', '.m4a'].includes(ext)) {
    throw new Error('El audio debe estar en MP3, WAV o M4A.');
  }
  if (kind === 'image' && !['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
    throw new Error('La imagen debe estar en PNG, JPG o WebP.');
  }
  if (kind === 'video' && ext !== '.mp4') {
    throw new Error('El video debe estar en MP4.');
  }
  if (kind === 'font' && !['.woff2', '.ttf', '.otf'].includes(ext)) {
    throw new Error('La fuente debe estar en WOFF2, TTF u OTF.');
  }
  return asset;
}

export function assetExtension(filename) {
  const ext = path.extname(String(filename || '')).toLowerCase();
  if (!mediaExts.has(ext)) throw new Error('Formato no permitido. Usa PNG, JPG, WebP, MP3, WAV, M4A o MP4.');
  return ext;
}

export function validMediaSignature(bytes, ext) {
  if (ext === '.png') return bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  if (ext === '.jpg' || ext === '.jpeg') return bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'));
  if (ext === '.webp') return bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP';
  if (ext === '.wav') return bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WAVE';
  if (ext === '.m4a') return bytes.toString('ascii', 4, 8) === 'ftyp';
  if (ext === '.mp4') return bytes.toString('ascii', 4, 8) === 'ftyp';
  if (ext === '.mp3') return bytes.toString('ascii', 0, 3) === 'ID3' ||
    (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  return false;
}

export function safeFilename(name) {
  return /^[a-zA-Z0-9_-]+(?:\.[a-z0-9]+)?$/.test(name);
}
