import defaultData from '../studio-default.json';
import type {VisualActionPlan} from './visual-action-planner.mjs';

export type PaletteName = 'aurora' | 'sunset' | 'mono';
export type FormatName = 'vertical' | 'horizontal';
export type SceneLayout = 'hero' | 'orbit' | 'editorial' | 'data' | 'kinetic' | 'collage';
export type CueShape = 'ring' | 'dot' | 'bars' | 'square';
export type StyleName = 'modern' | 'horror' | 'watercolor' | 'documentary' | 'cinematic' | 'tech' | 'minimal' | 'energetic' | 'playful';
export type MotionPreset = 'auto' | 'static' | 'push' | 'pull' | 'pan-left' | 'pan-right' | 'rise' | 'drift';
export type ImageFit = 'auto' | 'contain' | 'cover';
export type TransitionPreset = 'cut' | 'fade' | 'dip' | 'flash';
export type NarrationMode = 'single' | 'dialogues';
export type CharacterMode = 'preserve' | 'new';
export type VisualEngine = 'adaptive' | 'classic' | 'canvas';
export type GraphicKind = 'counter' | 'bar' | 'donut' | 'icon';
export type GraphicUnit = 'currency' | 'percent' | 'number';
export type GraphicIcon = 'wallet' | 'home' | 'food' | 'transport' | 'shopping' | 'savings' | 'growth';

export type MotionGraphic = {
  id: string;
  kind: GraphicKind;
  label: string;
  value: number;
  unit: GraphicUnit;
  at: number;
  duration: number;
  maxValue?: number;
  icon?: GraphicIcon;
  segments?: {label: string; value: number}[];
};

export type VoiceClip = {
  id: string;
  speaker: string;
  asset: string;
  duration: number;
};

export type StudioCue = {
  id: string;
  at: number;
  duration: number;
  shape: CueShape;
  label: string;
};

export type CaptionCue = {
  id: string;
  at: number;
  duration: number;
  text: string;
  emphasis?: string[];
  position?: 'top' | 'bottom';
};

export type AudioCue = {
  id: string;
  at: number;
  duration?: number;
  asset: string;
  volume?: number;
};

export type SceneLayer = {
  id: string;
  asset: string;
  depth?: number;
  x?: number;
  y?: number;
  scale?: number;
  opacity?: number;
};

export type CustomScene = {
  html: string;
  css?: string;
  script?: string;
};

export type EnterPreset = 'none' | 'fade' | 'rise' | 'drop' | 'pop' | 'slide-left' | 'slide-right' | 'wipe' | 'zoom' | 'blur';
export type LeavePreset = 'none' | 'fade' | 'drop' | 'shrink';
export type SpringName = 'smooth' | 'soft' | 'snappy' | 'bouncy' | 'heavy';
export type IdleKind = 'none' | 'float' | 'sway' | 'breathe' | 'pulse' | 'spin' | 'blink' | 'talk';
export type AuthoredLayer = {id:string; type:'image'|'text'|'shape'|'particles'|'caption'|'svg'|'path'|'group'|'video'|'gradient'|'glow'|'mask'|'wave'|'arrow'|'icon'; parent?:string; x?:number;y?:number;width?:number;height?:number;rotate?:number;ax?:number;ay?:number;depth?:number;opacity?:number;flip?:boolean;shadow?:boolean;blend?:string;fixed?:boolean;enter?:{preset:EnterPreset;at:number;spring?:SpringName};leave?:{preset:LeavePreset;at:number;duration:number};idle?:{kind:IdleKind;amount?:number;speed?:number;phase?:number;from?:number;to?:number};asset?:string;text?:string;size?:number;weight?:number;font?:string;align?:string;color?:string;mode?:string;stagger?:number;wordTimes?:number[];emphasize?:number[];upper?:boolean;fillAsset?:string;words?:{w:string;s:number;e:number;box?:boolean}[];shape?:string;fill?:string;fill2?:string;angle?:number;stroke?:string;strokeWidth?:number;radius?:number;particles?:{kind:string;count:number;speed:number;size:number;seed:number}; points?:{x:number;y:number}[]; path?:string; icon?:string; videoAsset?:string; mask?:string; blur?:number; glow?:number; dash?:number; dashGap?:number; wave?:{amplitude:number;frequency:number;phase?:number}; arrow?:{head?:number;start?:number;end?:number}; gradient?:{stops:{color:string;offset:number}[];angle?:number}};
export type AuthoredSpec = {layers: AuthoredLayer[]; background?:{color?:string;color2?:string;angle?:number}; camera?:Record<string, unknown>; grade?:Record<string, unknown>; sfx?:unknown[]};

export type StudioScene = {
  id: string;
  layout: SceneLayout;
  duration: number;
  title: string;
  subtitle: string;
  imageAsset: string;
  imageFit?: ImageFit;
  videoAsset?: string;
  cues: StudioCue[];
  captions?: CaptionCue[];
  layers?: SceneLayer[];
  audioCues?: AudioCue[];
  customScene?: CustomScene;
  authored?: AuthoredSpec;
  motionGraphics?: MotionGraphic[];
  approved?: boolean;
  scriptExcerpt?: string;
  visualQuery?: string;
  visualPlan?: string;
  visualActionPlan?: VisualActionPlan;
  style?: StyleName;
  motion?: MotionPreset;
  motionStrength?: number;
  transition?: TransitionPreset;
  focusX?: number;
  focusY?: number;
};

export type StudioProject = {
  name: string;
  format: FormatName;
  resolution?: '720p' | '1080p';
  fps?: 24 | 30;
  fontAsset?: string;
  palette: PaletteName;
  audioAsset: string;
  musicAsset: string;
  musicVolume?: number;
  script?: string;
  creativeBrief?: string;
  style?: StyleName;
  visualEngine?: VisualEngine;
  showText?: boolean;
  characterMode?: CharacterMode;
  references?: string[];
  narrationMode?: NarrationMode;
  voiceClips?: VoiceClip[];
  scenes: StudioScene[];
};

export type StudioProps = {project: StudioProject};
export const FPS = 24;
export const getProjectFps = (project: StudioProject) => project.fps === 30 ? 30 : FPS;
export const getProjectResolution = (project: StudioProject) => project.resolution === '1080p' ? '1080p' : '720p';
export const defaultStudioProject = defaultData as StudioProject;

export const getSceneFrames = (scene: StudioScene, project?: StudioProject) =>
  Math.max(1, Math.round(scene.duration * getProjectFps(project ?? defaultStudioProject)));

export const getTotalFrames = (project: StudioProject) =>
  project.scenes.length === 0 ? 1 : project.scenes.reduce((n, scene) => n + getSceneFrames(scene, project), 0);

export const getNarrationSeconds = (project: StudioProject) =>
  project.narrationMode === 'dialogues'
    ? (project.voiceClips ?? []).reduce((seconds, clip) => seconds + clip.duration, 0)
    : 0;

export const suggestedStyle = (source: string): StyleName => {
  const value = source.toLowerCase();
  if (/(bacter|microb|g[eé]rmen|defensa|inmun|cuerpo humano)/.test(value) &&
    /(ni[nñ]os|ni[nñ]as|infantil|superh[eé]roe|para peque[nñ]os)/.test(value)) return 'playful';
  if (/llorona|fantasma|terror|miedo|horror|maldici[oó]n|hospital abandonado|sombra/.test(value)) return 'horror';
  if (/biblia|g[eé]nesis|antonio|par[aá]bola|jes[uú]s|dios|god|cuento infantil/.test(value)) return 'watercolor';
  if (/noticia|documental|historia real|investigaci[oó]n|reportaje/.test(value)) return 'documentary';
  if (/programaci[oó]n|software|inteligencia artificial|tecnolog[ií]a|aplicaci[oó]n|c[oó]digo|robot|ciencia ficci[oó]n/.test(value)) return 'tech';
  if (/deporte|fitness|entrenamiento|oferta|descuento|lanzamiento|promoci[oó]n|tr[aá]iler/.test(value)) return 'energetic';
  if (/comedia|humor|juego|juguete|infantil|mascota|diversi[oó]n|receta/.test(value)) return 'playful';
  if (/elegante|lujo|minimalista|arquitectura|dise[nñ]o/.test(value)) return 'minimal';
  if (/cine|cinematogr[aá]fico|aventura|drama|ficci[oó]n|viaje/.test(value)) return 'cinematic';
  return 'modern';
};

export const resolveSceneStyle = (project: StudioProject, scene: StudioScene): StyleName =>
  scene.style ?? project.style ?? 'modern';

export const getDimensions = (format: FormatName, resolution: '720p' | '1080p' = '720p') => {
  const scale = resolution === '1080p' ? 1.5 : 1;
  return format === 'horizontal'
    ? {width: Math.round(1280 * scale), height: Math.round(720 * scale)}
    : {width: Math.round(720 * scale), height: Math.round(1280 * scale)};
};

export const paletteColors = {
  aurora: {background: '#090D1B', base: '#111A35', accent: '#6DFBDC', second: '#9987FF', text: '#F5F8FF'},
  sunset: {background: '#180D17', base: '#38203C', accent: '#FFBE8C', second: '#EF7CB8', text: '#FFF9F4'},
  mono: {background: '#0C1015', base: '#29333E', accent: '#E9F3F7', second: '#8CA9BE', text: '#FFFFFF'},
} as const;
