import {collectProjectAssets} from './project-assets.mjs';
import {useEffect, useRef, useState, type ChangeEvent} from 'react';
import {createRoot} from 'react-dom/client';
import {FaithfulPreview, type PreviewHandle} from './FaithfulPreview';
import {exportHyperframesProject, exportHyperframesScene} from './hyperframes-bridge';
import {assignReferenceImages} from './media-director.mjs';
import {suggestMotionGraphics, timedStoryboardBlocks} from './auto-graphics.mjs';
import {createVisualActionPlan, createVisualActionPlans} from './visual-action-planner.mjs';
import {
  FPS, defaultStudioProject, getDimensions, getSceneFrames, getTotalFrames,
  getNarrationSeconds, suggestedStyle, resolveSceneStyle,
  type CueShape, type FormatName, type PaletteName,
  type SceneLayout, type StudioCue, type StudioProject, type StudioScene,
  type StyleName, type VoiceClip, type MotionPreset, type TransitionPreset,
  type MotionGraphic, type GraphicKind, type GraphicUnit, type GraphicIcon,
  type ImageFit, type CaptionCue,
} from './studio-schema';
import './studio-app.css';

type JobStatus = {
  engine?: 'hyperframes' | 'remotion';
  status: string;
  progress: number;
  error: string;
  log: string;
  download: string | null;
};
type MediaCandidate = {id: string; thumbnail: string; title: string;
  creator: string; license: string; sourceUrl: string};
type IntegrationStatus = {openverse: boolean; pixabay: boolean; groq: boolean;
  hyperframes: string; paidApisEnabled: boolean;
  ollama?: {enabled:boolean; model:string; endpoint:string};
  freeLLMApi?: {configured: boolean; model: string}};
type AiScenePlan = {
  index: number; purpose?: string; visualPlan?: string; title: string; subtitle: string; visualQuery: string;
  layout: SceneLayout; style: StyleName; motion: MotionPreset;
  motionStrength: number; transition: TransitionPreset; captions?: {id: string; at: number; duration: number; text: string; emphasis?: string[]}[]; motionGraphics: MotionGraphic[];
};
type AiProposal = {plan: {style: StyleName; creativeBrief: string; topic?: string; audience?: string; promise?: string; facts?: string[];
  scenes: AiScenePlan[]}; provider: string};

const layoutNames: Record<SceneLayout, string> = {
  hero: 'Titular cinematográfico',
  orbit: 'Órbitas y geometría',
  editorial: 'Editorial minimalista',
  data: 'Gráficos y barras',
  kinetic: 'Tipografía cinética',
  collage: 'Collage audiovisual',
};
const shapeNames: Record<CueShape, string> = {
  ring: 'Anillo',
  dot: 'Círculo',
  bars: 'Barras',
  square: 'Cuadrado',
};
const graphicNames: Record<GraphicKind, string> = {
  counter: 'Contador numérico', bar: 'Barra de progreso',
  donut: 'Gráfico circular', icon: 'Icono animado',
};
const unitNames: Record<GraphicUnit, string> = {
  currency: 'Dinero ($)', percent: 'Porcentaje (%)', number: 'Número',
};
const iconNames: Record<GraphicIcon, string> = {
  wallet: 'Dinero', home: 'Vivienda', food: 'Comida', transport: 'Transporte',
  shopping: 'Compras', savings: 'Ahorro', growth: 'Crecimiento',
};
const styleNames: Record<StyleName, string> = {
  modern: 'Motion graphics moderno',
  horror: 'Terror cinematográfico',
  watercolor: 'Acuarela infantil',
  documentary: 'Documental cinematográfico',
  cinematic: 'Cine / historias y viajes',
  tech: 'Tecnología / infografías',
  minimal: 'Minimalista / elegante',
  energetic: 'Publicidad / deporte / ritmo',
  playful: 'Divertido / educativo / juegos',
};
const motionNames: Record<MotionPreset, string> = {
  auto: 'Automático según el estilo',
  static: 'Cámara fija',
  push: 'Acercamiento suave',
  pull: 'Alejamiento suave',
  'pan-left': 'Desplazamiento a la izquierda',
  'pan-right': 'Desplazamiento a la derecha',
  rise: 'Ascenso vertical',
  drift: 'Deriva delicada',
};
const transitionNames: Record<TransitionPreset, string> = {
  cut: 'Corte limpio',
  fade: 'Entrada desde negro',
  dip: 'Oscurecer entre escenas',
  flash: 'Destello breve',
};
const labelForAsset = (asset: string) =>
  asset ? asset.split('/').slice(-1)[0]?.slice(0, 23) : 'Ningún archivo';

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data as T;
}

const localDraft = (description: string, original: StudioProject): StudioProject => {
  const sentences = description
    .replace(/\s+/g, ' ')
    .split(/[.!?;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 6);
  const lines = sentences.length ? sentences : ['Una historia visual', 'Cada segundo importa', 'Mira el resultado'];
  const layouts: SceneLayout[] = ['hero', 'orbit', 'data', 'editorial'];
  return {
    ...original,
    name: 'Nuevo proyecto',
    scenes: lines.map((line, index) => ({
      id: crypto.randomUUID(),
      layout: layouts[index % layouts.length],
      duration: 4,
      title: line.slice(0, 46).toUpperCase(),
      subtitle: index === 0 ? 'Una pieza creada con Motion Studio.' : '',
      imageAsset: '',
      cues: [],
      approved: false,
      scriptExcerpt: line,
    })),
  };
};

const markForReview = (scenes: StudioScene[]) =>
  scenes.map((scene) => ({...scene, approved: false}));

const withSuggestedGraphics = (original: StudioProject): StudioProject => ({
  ...original,
  scenes: original.scenes.map((scene) => {
    const suggested = scene.videoAsset ? [] : suggestMotionGraphics({
      text: scene.scriptExcerpt || scene.title, script: original.script || original.name,
      duration: scene.duration, style: resolveSceneStyle(original, scene),
      showText: original.showText ?? true,
    });
    const layout = suggested.length ? 'data' as SceneLayout : scene.layout;
    const changed = layout !== scene.layout ||
      JSON.stringify(scene.motionGraphics ?? []) !== JSON.stringify(suggested);
    return {...scene, motionGraphics: suggested, layout,
      approved: changed ? false : scene.approved};
  }),
});

const narrationDraft = (script: string, length: number, original: StudioProject,
  audioMeasured = false): StudioProject => {
  const seconds = Math.max(1, Math.min(900, length));
  const timed = timedStoryboardBlocks(script, seconds, audioMeasured);
  const planSeconds = timed
    ? Math.min(900, timed.reduce((sum, part) => sum + part.duration, 0)) : seconds;
  const sentences = script.replace(/\(\d{1,2}:\d{2}\)/g, ' ')
    .replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const targetScenes = Math.max(1, Math.min(80, Math.round(planSeconds / 8)));
  const blocks: {text: string; duration: number}[] = [];
  if (timed) {
    for (const part of timed) {
      const pieces = Math.max(1, Math.ceil(part.duration / 30));
      for (let i = 0; i < pieces; i++) blocks.push({
        text: part.text, duration: part.duration / pieces,
      });
    }
  } else {
    const chunks = Math.min(targetScenes, Math.max(1, sentences.length));
    for (let i = 0; i < chunks; i++) {
      const start = Math.floor(i * sentences.length / chunks);
      const end = Math.floor((i + 1) * sentences.length / chunks);
      blocks.push({text: sentences.slice(start, end).join(' '), duration: planSeconds / chunks});
    }
  }
  if (!blocks.length) blocks.push({text: script.trim(), duration: planSeconds});
  if (blocks.length > 80) blocks.length = 80;
  let assigned = 0;
  const draftScenes = blocks.map((block, index) => {
    const duration = index === blocks.length - 1
      ? Math.max(0.5, Math.round((planSeconds - assigned) * 100) / 100)
      : Math.max(0.5, Math.round(block.duration * 100) / 100);
    assigned += duration;
    return {
      id: crypto.randomUUID(), layout: 'hero' as SceneLayout, duration,
      title: block.text.slice(0, 70), subtitle: '', imageAsset: '',
      cues: [], approved: false, scriptExcerpt: block.text.slice(0, 800),
    };
  });
  // The new script takes priority over the previous project's name.
  const finance = /presupuesto|finanzas|dinero|ahorro|deudas|gastos|ingresos|ventas/i.test(script);
  const style = finance ? 'modern' : suggestedStyle(script + ' ' + original.name);
  const actionPlans = createVisualActionPlans(draftScenes, {...original, script, style});
  const scenes = draftScenes.map((scene, index) => ({...scene, visualActionPlan: actionPlans[index]}));
  const hasData = /\d\s*%|por ciento|porcentaje|presupuesto|finanzas|estad[ií]stic|ventas|ingresos/i.test(script);
  const references = [...new Set([...(original.references ?? []),
    ...original.scenes.map((scene) => scene.imageAsset).filter(Boolean)])];
  return withSuggestedGraphics({...original, script, scenes, style, references,
    showText: ['modern', 'tech', 'energetic', 'playful'].includes(style) ||
      (hasData && !['horror', 'watercolor'].includes(style))});
};

const captionsFromTranscript = (scenes: StudioScene[], segments: {at: number; text: string}[], offset = 0, preserve = false) => {
  const starts: number[] = [];
  let elapsed = 0;
  for (const scene of scenes) { starts.push(elapsed); elapsed += scene.duration; }
  const next = scenes.map((scene) => ({...scene, captions: preserve ? [...(scene.captions ?? [])] : [] as CaptionCue[]}));
  segments.forEach((segment, index) => {
    const at = Math.max(0, Number(segment.at) + offset);
    const sceneIndex = starts.findIndex((start, i) => at >= start && at < start + scenes[i].duration);
    if (sceneIndex < 0) return;
    const localAt = at - starts[sceneIndex];
    const nextAt = index + 1 < segments.length ? Number(segments[index + 1].at) + offset : at + 2.6;
    const duration = Math.max(0.45, Math.min(4.5, nextAt - at, scenes[sceneIndex].duration - localAt));
    const text = String(segment.text ?? '').trim().slice(0, 180);
    if (!text) return;
    next[sceneIndex].captions.push({id: crypto.randomUUID(), at: Math.round(localAt * 100) / 100,
      duration: Math.round(duration * 100) / 100, text, emphasis: []});
  });
  return next;
};

const audioFileDuration = (file: File): Promise<number> => new Promise((resolve, reject) => {
  const blobUrl = URL.createObjectURL(file);
  const sound = new window.Audio(blobUrl);
  sound.preload = 'metadata';
  const cleanup = () => {sound.onloadedmetadata = null; sound.onerror = null; URL.revokeObjectURL(blobUrl);};
  sound.onloadedmetadata = () => {
    const value = sound.duration; cleanup();
    if (Number.isFinite(value) && value > 0) resolve(value);
    else reject(new Error('Duración de audio inválida'));
  };
  sound.onerror = () => {cleanup(); reject(new Error('No se pudo medir el audio'));};
});

const makeScene = (project: StudioProject = defaultStudioProject): StudioScene => {
  const scene: StudioScene = {
    id: crypto.randomUUID(),
    layout: 'hero',
    duration: 4,
    title: 'NUEVA ESCENA',
    subtitle: 'Describe tu idea aquí.',
    imageAsset: '',
    cues: [],
    approved: false,
    scriptExcerpt: '',
  };
  const candidate = {...scene};
  const plans = createVisualActionPlans([...project.scenes, candidate], project);
  return {...candidate, visualActionPlan: plans[plans.length - 1]};
};

const ClaudePrompt = (project: StudioProject) => `Actúa como director de motion graphics.
Crea un objeto JSON para el editor local Motion Studio. Responde SOLO con JSON válido, sin markdown.
No incluyas enlaces, código ejecutable, imágenes externas ni servicios de pago.
El JSON debe tener exactamente esta estructura:
{
  "name": "Nombre del video",
  "format": "vertical",
  "palette": "aurora",
  "audioAsset": "",
  "musicAsset": "",
  "script": "",
  "creativeBrief": "Describe el estilo propio de este proyecto",
  "style": "cinematic",
  "showText": false,
  "characterMode": "preserve",
  "references": [],
  "narrationMode": "single",
  "voiceClips": [],
  "scenes": [
    {
      "id": "escena1",
      "layout": "hero",
      "duration": 4,
      "title": "TÍTULO CORTO",
      "subtitle": "Una frase",
      "imageAsset": "",
      "videoAsset": "",
      "cues": [{"id": "evento1", "at": 1.5, "duration": 1.3, "shape": "ring", "label": ""}],
      "scriptExcerpt": "Fragmento narrado de esta escena",
      "approved": false,
      "style": "cinematic",
      "motion": "push",
      "motionStrength": 35,
      "transition": "cut",
      "focusX": 50,
      "focusY": 50
    }
  ]
}
Reglas: formato vertical u horizontal; paleta aurora, sunset o mono;
layouts hero, orbit, editorial, data, kinetic o collage; entre 1 y 80 escenas;
duración entre 0.5 y 60 segundos por escena, total máximo 900 segundos;
cues opcionales de formas ring, dot, bars o square, con tiempos dentro de su escena.
El proyecto puede usar style (modern, horror, watercolor, documentary, cinematic,
tech, minimal, energetic, playful) y creativeBrief como dirección creativa libre.
Cada escena puede definir su propio style, motion (auto, static, push, pull,
pan-left, pan-right, rise, drift), motionStrength (0-100), transition
(cut, fade, dip, flash), focusX y focusY (0-100).
Evita efectos repetidos por defecto: el movimiento debe servir al mensaje.
showText (false en historias narradas), characterMode (preserve o new),
script, narrationMode (single o dialogues), voiceClips y references.
Conserva las rutas de audioAsset, musicAsset, voiceClips, references y
los videoAsset ya importados del proyecto. Para un clip HyperFrames, usa
videoAsset solo después de que el usuario haya renderizado y cargado el MP4.
Marca toda escena nueva con approved: false; la persona debe revisarla antes de exportar.
No agregues subtítulos visibles salvo petición expresa.
Proyecto de referencia: ${JSON.stringify(project)}`;

function StudioApp() {
  const [project, setProject] = useState<StudioProject>({...defaultStudioProject, scenes:[]});
  const [selected, setSelected] = useState(0);
  const [idea, setIdea] = useState('');
  const [jsonToImport, setJsonToImport] = useState('');
  const [busy, setBusy] = useState(false);
  const [renderJobId, setRenderJobId] = useState<string | null>(null);
  const [renderStatus, setRenderStatus] = useState<JobStatus | null>(null);
  const [notice, setNotice] = useState('Cargando proyecto...');
  const [dirty, setDirty] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [mediaProvider, setMediaProvider] = useState<'openverse' | 'pixabay'>('openverse');
  const [mediaQuery, setMediaQuery] = useState('');
  const [mediaResults, setMediaResults] = useState<MediaCandidate[]>([]);
  const [transcribeSource, setTranscribeSource] = useState('');
  const [aiProposal, setAiProposal] = useState<AiProposal | null>(null);
  const [aiProvider, setAiProvider] = useState<'ollama'|'freellmapi'>('ollama');
  const [ollamaStatus, setOllamaStatus] = useState<{ok:boolean;model:string;error?:string}|null>(null);
  const [sceneCodeBusy, setSceneCodeBusy] = useState(false);
  const [fullVideoCodeBusy, setFullVideoCodeBusy] = useState(false);
  const aiBaseProject = useRef('');
  const playerRef = useRef<PreviewHandle>(null);

  const dimensions = getDimensions(project.format, project.resolution);
  const totalFrames = getTotalFrames(project);
  const totalSeconds = totalFrames / (project.fps ?? FPS);
  const pendingApproval = project.scenes.filter((scene) => !scene.approved).length;
  const multiAudioSeconds = getNarrationSeconds(project);
  const effectiveAudioDuration = project.narrationMode === 'dialogues' ? multiAudioSeconds : audioDuration;
  const currentScene = project.scenes[Math.min(selected, project.scenes.length - 1)];
  const missingIllustrations = project.scenes.filter((scene) =>
    !scene.imageAsset && !scene.videoAsset && !scene.customScene?.html && !scene.authored?.layers?.length && !(scene.motionGraphics?.length) &&
    !['modern', 'tech', 'energetic', 'playful'].includes(resolveSceneStyle(project, scene))).length;
  const unusedReferences = (project.references ?? []).filter((asset) =>
    !project.scenes.some((scene) => scene.imageAsset === asset)).length;
  const preflightNotes = [
    pendingApproval ? `${pendingApproval} escenas todavía no aprobadas (bloquea exportación).` : '',
    missingIllustrations ? `${missingIllustrations} escenas sin imagen; usarán una composición abstracta.` : '',
    unusedReferences ? `${unusedReferences} imágenes de referencia no están asignadas como imagen de escena. Usa «Distribuir mis imágenes» si quieres verlas en el video.` : '',
    effectiveAudioDuration !== null && effectiveAudioDuration > 0 &&
      Math.abs(effectiveAudioDuration - totalSeconds) > 0.5
      ? `La narración (${effectiveAudioDuration.toFixed(1)} s) no coincide con el video (${totalSeconds.toFixed(1)} s).` : '',
    !project.audioAsset && !(project.voiceClips?.length && project.narrationMode === 'dialogues')
      ? 'No has importado narración. El video puede exportarse sin voz.' : '',
  ].filter(Boolean);

  useEffect(() => {
    api<{project: StudioProject}>('/api/project')
      .then((data) => {setProject(data.project); setNotice('Proyecto listo.');})
      .catch((error) => {setProject({...defaultStudioProject, scenes:[]}); setNotice(`No se pudo cargar: ${error.message}`);});
  }, []);

  useEffect(() => {
    api<IntegrationStatus>('/api/integrations').then(setIntegrationStatus).catch(() => {});
  }, []);

  const checkOllama = async () => {
    setOllamaStatus(null);
    try {
      const status = await api<{ok:boolean;model:string;error?:string}>('/api/ollama/check', {method:'POST'});
      setOllamaStatus(status);
      setNotice(status.ok ? `Ollama disponible: ${status.model}.` : status.error || 'Ollama no está disponible.');
    } catch (error) {
      setOllamaStatus({ok:false, model:integrationStatus?.ollama?.model ?? 'qwen2.5:1.5b', error:(error as Error).message});
    }
  };

  useEffect(() => {
    if (project.narrationMode === 'dialogues' || !project.audioAsset) {
      setAudioDuration(null);
      return;
    }
    const sound = new window.Audio('/' + project.audioAsset);
    sound.preload = 'metadata';
    sound.onloadedmetadata = () => setAudioDuration(sound.duration);
    sound.onerror = () => setAudioDuration(null);
    return () => {
      sound.onloadedmetadata = null;
      sound.onerror = null;
    };
  }, [project.audioAsset, project.narrationMode]);

  useEffect(() => {
    if (!renderJobId) return;
    let alive = true;
    const poll = async () => {
      try {
        const result = await api<JobStatus>(`/api/jobs/${renderJobId}`);
        if (!alive) return;
        setRenderStatus(result);
        if (result.status !== 'renderizando') {
          setRenderJobId(null);
          setNotice(result.status === 'completado'
            ? `Render ${result.engine === 'hyperframes' ? 'HyperFrames' : 'Remotion'} completado. Ya puedes descargar el MP4.`
            : `Falló el render ${result.engine === 'hyperframes' ? 'HyperFrames' : 'Remotion'}; revisa el diagnóstico.`);
        }
      } catch (error) {
        if (alive) setNotice(`Error consultando render: ${(error as Error).message}`);
      }
    };
    void poll();
    const timer = window.setInterval(poll, 1200);
    return () => {alive = false; window.clearInterval(timer);};
  }, [renderJobId]);

  const changeProject = (next: StudioProject) => {
    setProject(next);
    setDirty(true);
  };
  const patchProject = (patch: Partial<StudioProject>) => {
    const requiresReview = Object.keys(patch).some((name) =>
      ['format', 'palette', 'style', 'visualEngine', 'creativeBrief', 'showText', 'characterMode', 'script',
        'references', 'audioAsset', 'musicVolume', 'voiceClips', 'narrationMode'].includes(name));
    changeProject({...project, ...patch,
      scenes: requiresReview ? markForReview(project.scenes) : project.scenes});
  };
  const applyVideoPreset = (preset: 'relato' | 'curiosidades' | 'historia') => {
    const options = {
      relato: {style: 'cinematic' as StyleName, showText: false,
        brief: 'Relato narrado vertical: gancho visual en los primeros segundos, atmósfera cinematográfica, planos de apoyo concretos por frase, alterna escalas y movimientos lentos; sin texto en pantalla salvo subtítulos que la persona agregue.'},
      curiosidades: {style: 'energetic' as StyleName, showText: true,
        brief: 'Video vertical de curiosidades: abre con una pregunta o dato sorprendente, una idea por escena, cambios visuales frecuentes, titulares muy breves, recursos visuales concretos y cierre con revelación. No inventes hechos ni cifras.'},
      historia: {style: 'documentary' as StyleName, showText: true,
        brief: 'Historia/explicación vertical: estructura gancho, contexto, desarrollo y conclusión; visuales editoriales/documentales por escena, fechas solo si están en el guion, titulares cortos y ritmo claro.'},
    }[preset];
    changeProject({...project, style: options.style, showText: options.showText,
      creativeBrief: options.brief, scenes: markForReview(project.scenes)});
    setNotice(`Formato ${preset === 'relato' ? 'Relato narrado' : preset === 'curiosidades' ? 'Curiosidades' : 'Historia / explicación'} preparado. Conservé guion, escenas, audios y recursos.`);
  };

  const patchScene = (patch: Partial<StudioScene>) => {
    const refreshPlan = ['title', 'scriptExcerpt', 'visualQuery', 'visualPlan'].some((key) =>
      Object.prototype.hasOwnProperty.call(patch, key));
    changeProject({...project, scenes: project.scenes.map((scene, index) => {
      if (index !== selected) return scene;
      const updated = {...scene, ...patch};
      const visualActionPlan = patch.visualActionPlan ?? (refreshPlan
        ? createVisualActionPlan(updated, project, index) : scene.visualActionPlan);
      return {...updated, visualActionPlan, approved: patch.approved ?? false};
    })});
  };
  const patchCue = (index: number, patch: Partial<StudioCue>) => {
    if (!currentScene) return;
    patchScene({cues: currentScene.cues.map((cue, i) =>
      i === index ? {...cue, ...patch} : cue)});
  };
  const patchGraphic = (index: number, patch: Partial<MotionGraphic>) => {
    if (!currentScene) return;
    patchScene({motionGraphics: (currentScene.motionGraphics ?? []).map((graphic, i) =>
      index === i ? {...graphic, ...patch} : graphic)});
  };
  const patchCaption = (index: number, patch: Partial<CaptionCue>) => {
    if (!currentScene) return;
    patchScene({captions: (currentScene.captions ?? []).map((caption, i) =>
      index === i ? {...caption, ...patch} : caption)});
  };
  const addCaption = () => {
    if (!currentScene) return;
    const sceneStart = project.scenes.slice(0, selected)
      .reduce((sum, scene) => sum + getSceneFrames(scene, project), 0);
    const frame = playerRef.current?.getCurrentFrame() ?? sceneStart;
    const at = Math.max(0, Math.min(currentScene.duration - 0.2,
      (frame - sceneStart) / (project.fps === 30 ? 30 : FPS)));
    const caption: CaptionCue = {id: crypto.randomUUID(), at: Math.round(at * 100) / 100,
      duration: Math.min(2.5, currentScene.duration - at), text: currentScene.subtitle || 'Escribe una frase breve', emphasis: []};
    patchScene({captions: [...(currentScene.captions ?? []), caption]});
  };
  const suggestCurrentGraphics = () => {
    if (!currentScene) return;
    if ((currentScene.motionGraphics?.length ?? 0) > 0 &&
      !window.confirm('¿Sustituir los gráficos editados de esta escena por nuevas sugerencias?')) return;
    const suggestions = suggestMotionGraphics({
      text: currentScene.scriptExcerpt || currentScene.title,
      script: project.script || project.name, duration: currentScene.duration,
      style: resolveSceneStyle(project, currentScene), showText: project.showText ?? true,
    });
    patchScene({motionGraphics: suggestions,
      layout: suggestions.length ? 'data' : currentScene.layout});
    setNotice(suggestions.length ? `${suggestions.length} gráficos propuestos. Ajusta y aprueba la escena.` :
      'Este fragmento no necesita gráficos automáticos. Puedes añadirlos manualmente.');
  };

  const save = async () => {
    setBusy(true);
    try {
      const value = await api<{project: StudioProject}>('/api/project', {
        method: 'PUT', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(project),
      });
      setProject(value.project);
      setDirty(false);
      setNotice('Proyecto guardado en tu computadora.');
    } catch (error) {
      setNotice(`Error al guardar: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const render = async (engine: 'hyperframes' | 'remotion' = 'hyperframes') => {
    const renderEngine = project.visualEngine === 'canvas' ? 'remotion' : engine;
    if (pendingApproval > 0) {
      setNotice(`Debes revisar y aprobar ${pendingApproval} escenas antes de exportar.`);
      return;
    }
    setBusy(true);
    setRenderStatus(null);
    try {
      const endpoint = renderEngine === 'hyperframes' ? '/api/render/hyperframes' : '/api/render';
      const response = await api<{jobId: string}> (endpoint, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(project),
      });
      setDirty(false);
      setRenderJobId(response.jobId);
      setRenderStatus({engine: renderEngine, status: 'renderizando', progress: 0, error: '', log: '', download: null});
      setNotice(project.visualEngine === 'canvas'
        ? 'Canvas 3D se exporta mediante Remotion, por fotogramas y en CPU.'
        : renderEngine === 'hyperframes'
          ? 'HyperFrames está preparando el navegador y renderizando tu MP4 en local.'
          : 'Remotion está renderizando el MP4 por CPU como alternativa.');
    } catch (error) {
      setNotice(`Error de exportación ${renderEngine === 'hyperframes' ? 'HyperFrames' : 'Remotion'}: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const uploadAssetOnly = async (file: File) => {
    const response = await api<{asset: string}>(`/api/assets?name=${encodeURIComponent(file.name)}`, {
      method: 'PUT', body: file,
    });
    return response.asset;
  };

  const upload = async (file: File | undefined, field: 'audioAsset' | 'musicAsset' | 'imageAsset' | 'videoAsset' | 'fontAsset') => {
    if (!file) return;
    setBusy(true);
    try {
      const asset = await uploadAssetOnly(file);
      if (field === 'imageAsset' || field === 'videoAsset') patchScene({[field]: asset});
      else patchProject({[field]: asset});
      setNotice(`Archivo cargado: ${file.name}`);
    } catch (error) {
      setNotice(`No se pudo importar: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const addReference = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const asset = await uploadAssetOnly(file);
      patchProject({references: [...(project.references ?? []), asset]});
      setNotice('Referencia guardada. Es una referencia, no aparecerá en el video hasta que la asignes a una escena o pulses «Distribuir mis imágenes».');
    } catch (error) {
      setNotice(`No se pudo importar referencia: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const addDialogueClips = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const clips: VoiceClip[] = [];
    try {
      for (const file of Array.from(files)) {
        const duration = await audioFileDuration(file);
        const asset = await uploadAssetOnly(file);
        clips.push({id: crypto.randomUUID(), speaker: file.name.replace(/\.[^.]+$/, '').slice(0, 70),
          asset, duration: Math.round(duration * 1000) / 1000});
      }
      patchProject({narrationMode: 'dialogues', voiceClips: [...(project.voiceClips ?? []), ...clips]});
      setNotice(`${clips.length} audios de diálogo añadidos en orden.`);
    } catch (error) {
      setNotice(`Error al añadir diálogos: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const moveScene = (direction: -1 | 1) => {
    const target = selected + direction;
    if (target < 0 || target >= project.scenes.length) return;
    const scenes = [...project.scenes];
    [scenes[selected], scenes[target]] = [scenes[target], scenes[selected]];
    changeProject({...project, scenes: markForReview(scenes)});
    setSelected(target);
  };
  const removeScene = () => {
    if (project.scenes.length === 1) return;
    const scenes = project.scenes.filter((_, index) => index !== selected);
    changeProject({...project, scenes: markForReview(scenes)});
    setSelected(Math.min(selected, scenes.length - 1));
  };
  const seekToScene = (index: number) => {
    const frame = project.scenes.slice(0, index)
      .reduce((sum, scene) => sum + getSceneFrames(scene, project), 0);
    playerRef.current?.seekTo(frame);
    setSelected(index);
  };
  const inspectFrame = (fraction: number) => {
    if (!currentScene) return;
    const start = project.scenes.slice(0, selected)
      .reduce((sum, scene) => sum + getSceneFrames(scene, project), 0);
    const offset = Math.round(Math.max(0, getSceneFrames(currentScene, project) - 1) * fraction);
    playerRef.current?.seekTo(start + offset);
  };
  const addCue = () => {
    if (!currentScene) return;
    const sceneStart = project.scenes.slice(0, selected)
      .reduce((sum, scene) => sum + getSceneFrames(scene, project), 0);
    const playerFrame = playerRef.current?.getCurrentFrame() ?? sceneStart;
    const at = Math.max(0, Math.min(currentScene.duration - 0.2, (playerFrame - sceneStart) / FPS));
    const cue: StudioCue = {
      id: crypto.randomUUID(), at: Math.round(at * 10) / 10,
      duration: 1.3, shape: 'ring', label: '',
    };
    patchScene({cues: [...currentScene.cues, cue]});
  };
  const copyClaude = async () => {
    try {
      await navigator.clipboard.writeText(ClaudePrompt(project));
      setNotice('Instrucciones copiadas. Pégalas en Claude y luego importa su JSON.');
    } catch {
      setNotice('No se pudo copiar automáticamente. Selecciona las instrucciones manualmente.');
    }
  };

  const searchVisuals = async (queryOverride?: string) => {
    const query = (queryOverride ?? mediaQuery).trim();
    if (query.length < 2) return setNotice('Escribe algo para buscar imágenes.');
    setBusy(true);
    try {
      const {results} = await api<{results: MediaCandidate[]}>(
        `/api/media/search?provider=${mediaProvider}&q=${encodeURIComponent(query)}`);
      setMediaResults(results);
      setNotice(`${results.length} imágenes disponibles. Selecciona una para la escena actual.`);
    } catch (error) { setNotice(`Búsqueda no disponible: ${(error as Error).message}`); }
    finally { setBusy(false); }
  };

  const requestCreativePlan = async () => {
    const snapshot = JSON.stringify(project);
    if (!(project.script || '').trim() && project.scenes.every((s) => !s.scriptExcerpt && !s.title)) {
      setNotice('Primero pega el guion o crea un storyboard.');
      return;
    }
    setBusy(true);
    setAiProposal(null);
    try {
      const answer = await api<AiProposal>('/api/ai/plan', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({project, provider:aiProvider}),
      });
      aiBaseProject.current = snapshot;
      setAiProposal(answer);
      setNotice(`La IA preparó ${answer.plan.scenes.length} escenas usando ${answer.provider}. Revisa antes de aplicar.`);
    } catch (error) {
      setNotice(`El asesor IA no pudo generar una propuesta: ${(error as Error).message} El modo local sigue disponible.`);
    } finally { setBusy(false); }
  };

  const requestSceneCode = async () => {
    if (!currentScene) return;
    setSceneCodeBusy(true);
    try {
      const answer = await api<{customScene: {html: string; css?: string; script?: string}; provider: string; attempts: number}>('/api/ai/scene', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({project, index: selected + 1}),
      });
      patchScene({customScene: answer.customScene});
      setNotice(`Escena ${selected + 1} escrita con código por ${answer.provider} tras ${answer.attempts} intento(s). Revisa Vista previa fiel y aprueba.`);
    } catch (error) { setNotice(`No se pudo escribir la escena: ${(error as Error).message}`); }
    finally { setSceneCodeBusy(false); }
  };

  const requestFullVideoCode = async () => {
    if (!project.scenes.length) return;
    setFullVideoCodeBusy(true);
    try {
      const answer = await api<{scenes: {html: string; css?: string; script?: string}[]; provider: string; attempts: number}>('/api/ai/full-video', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({project}),
      });
      if (answer.scenes.length !== project.scenes.length) throw new Error('La respuesta no contiene todas las escenas.');
      changeProject({...project, scenes: project.scenes.map((scene, index) => ({...scene, customScene: answer.scenes[index], approved: false}))});
      setSelected(0);
      setNotice(`Video completo escrito con código: ${answer.scenes.length} escenas, ${answer.provider}, ${answer.attempts} intento(s). Revisa Vista previa fiel y aprueba cada escena.`);
    } catch (error) { setNotice(`No se pudo escribir el video completo: ${(error as Error).message}`); }
    finally { setFullVideoCodeBusy(false); }
  };

  const applyCreativePlan = () => {
    if (!aiProposal) return;
    if (aiBaseProject.current !== JSON.stringify(project)) {
      setNotice('Modificaste el proyecto después de solicitar la propuesta. Genera un plan nuevo para evitar sobrescribir cambios.');
      return;
    }
    if (aiProposal.plan.scenes.length !== project.scenes.length) {
      setNotice('El número de escenas cambió. Genera otra propuesta de IA.');
      return;
    }
    if (!window.confirm('¿Aplicar el diseño de la IA? Se conservarán audios, imágenes, duración y personajes. Todas las escenas quedarán pendientes de aprobación.')) return;
    const plannedScenes = project.scenes.map((scene, index) => {
      const idea = aiProposal.plan.scenes[index];
      return {...scene, title: idea.title, subtitle: idea.subtitle,
        visualQuery: idea.visualQuery, visualPlan: idea.visualPlan,
        visualActionPlan: undefined, layout: idea.layout,
        style: idea.style, motion: idea.motion,
        motionStrength: idea.motionStrength, transition: idea.transition, // eslint-disable-line @remotion/non-pure-animation
        motionGraphics: idea.motionGraphics, captions: idea.captions ?? scene.captions ?? [], approved: false};
    });
    const planProject = {...project, style: aiProposal.plan.style, creativeBrief: aiProposal.plan.creativeBrief};
    const actionPlans = createVisualActionPlans(plannedScenes, planProject);
    const next: StudioProject = {
      ...planProject,
      scenes: plannedScenes.map((scene, index) => ({...scene, visualActionPlan: actionPlans[index]})),
    };
    changeProject(next);
    setAiProposal(null);
    setSelected(0);
    playerRef.current?.seekTo(0);
    setNotice(`Dirección artística aplicada a ${next.scenes.length} escenas. Edita y aprueba cada escena antes de exportar.`);
  };

  const importStockVisual = async (candidate: MediaCandidate) => {
    setBusy(true);
    try {
      const {asset} = await api<{asset: string}>('/api/media/import', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id: candidate.id}),
      });
      patchScene({imageAsset: asset});
      setNotice(`Imagen importada de ${candidate.creator}. Revisa la licencia: ${candidate.license}. Escena pendiente de aprobación.`);
    } catch (error) { setNotice(`No se pudo importar: ${(error as Error).message}`); }
    finally { setBusy(false); }
  };

  const transcribeFromCloud = async () => {
    const asset = transcribeSource || (project.narrationMode === 'dialogues'
      ? project.voiceClips?.[0]?.asset : project.audioAsset);
    if (!asset) return setNotice('Carga primero una narración o audio de diálogo.');
    if (!window.confirm('La narración se enviará a Groq para transcribirla. ¿Continuar?')) return;
    setBusy(true);
    try {
      const result = await api<{text: string; segments: {at: number; text: string}[]}>('/api/transcribe', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({asset}),
      });
      const clips = project.narrationMode === 'dialogues' ? project.voiceClips ?? [] : [];
      const position = clips.findIndex((clip) => clip.asset === asset);
      const offset = position > 0 ? clips.slice(0, position)
        .reduce((sum, clip) => sum + clip.duration, 0) : 0;
      const transcript = result.segments.length ? result.segments.map((part) => {
        const minutes = Math.floor((part.at + offset) / 60);
        const seconds = Math.floor((part.at + offset) % 60);
        return `(${minutes}:${String(seconds).padStart(2, '0')}) ${part.text}`;
      }).join('\n') : result.text;
      const combine = clips.length > 0 && (project.script ?? '').trim();
      if (!clips.length && (project.script ?? '').trim() &&
        !window.confirm('Ya existe un guion. ¿Reemplazarlo por la transcripción?')) return;
      const nextScript = combine ? `${project.script}\n${transcript}` : transcript;
      let scenes = project.scenes;
      if (result.segments.length) {
        const hasCaptions = project.scenes.some((scene) => (scene.captions?.length ?? 0) > 0);
        if (hasCaptions && !window.confirm('Ya hay subtítulos. ¿Reemplazarlos con los segmentos de esta transcripción?')) return;
        scenes = captionsFromTranscript(project.scenes, result.segments, offset, false);
      }
      if (result.segments.length) changeProject({...project, script: nextScript, scenes: markForReview(scenes)});
      else patchProject({script: nextScript});
      setNotice(result.segments.length
        ? 'Transcripción y subtítulos por frase importados. Los tiempos son aproximados: edítalos y revisa la sincronía.'
        : 'Transcripción importada sin segmentos temporizados; no se generaron subtítulos.');
    } catch (error) { setNotice(`Falló la transcripción: ${(error as Error).message}`); }
    finally { setBusy(false); }
  };

  const downloadHyperframes = async (wholeProject = false) => {
    if (!currentScene) return;
    let gsapSource = '';
    const embeddedAssets:Record<string,string> = {};
    try {
      const response = await fetch('/hyperframes/gsap.min.js');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      gsapSource = await response.text();
      const scenes = wholeProject ? project.scenes : [currentScene];
      const paths = collectProjectAssets(project, {scenes, includeNarration: wholeProject});
      let bytes = 0;
      for (const asset of paths) {
        if (asset.startsWith('/') || asset.includes('..') || asset.includes('://')) {
          throw new Error('Ruta multimedia no permitida.');
        }
        const result = await fetch(`/${asset}`);
        if (!result.ok) throw new Error(`No se pudo leer ${asset} (HTTP ${result.status}).`);
        const blob = await result.blob();
        bytes += blob.size;
        if (bytes > 28 * 1024 * 1024) throw new Error('Los medios incrustados superan 28 MB. Usa el render directo de HyperFrames o exporta por escenas.');
        embeddedAssets[asset] = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('No se pudo preparar el recurso multimedia.'));
          reader.readAsDataURL(blob);
        });
      }
      const source = wholeProject ? exportHyperframesProject(project, undefined, gsapSource, embeddedAssets)
        : exportHyperframesScene(project, currentScene, gsapSource, embeddedAssets);
      const url = URL.createObjectURL(new Blob([source], {type: 'text/html;charset=utf-8'}));
      const link = document.createElement('a');
      link.href = url;
      link.download = wholeProject ? 'index-hyperframes-v7-proyecto.html' : 'index-hyperframes-v7-escena.html';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 3000);
      setNotice('Composición HyperFrames V7 exportada con los medios seleccionados. El HTML incluye imagen, video, narración, diálogos y música si están dentro del límite de 28 MB.');
    } catch (error) {
      setNotice(`No se pudo preparar HyperFrames: ${(error as Error).message}`);
    }
  };
  const downloadProject = () => {
    const file = new Blob([JSON.stringify(project, null, 2)], {type: 'application/json'});
    const href = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = href;
    link.download = `${(project.name || 'motion-studio').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 45)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    setNotice('Proyecto JSON descargado. Conserva también la carpeta public/user-assets.');
  };
  const loadJsonProject = async (incoming: unknown) => {
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      throw new Error('El JSON debe contener un proyecto válido.');
    }
    const source = incoming as Partial<StudioProject>;
    const raw = {...source, scenes: source.scenes?.map((scene) => ({...scene, approved: false}))};
    const result = await api<{project: StudioProject}>('/api/project', {
      method: 'PUT', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(raw),
    });
    setProject(result.project);
    setSelected(0);
    setDirty(false);
  };
  const importJson = async () => {
    try {
      const parsed = JSON.parse(jsonToImport);
      await loadJsonProject(parsed.project ?? parsed);
      setNotice('Proyecto importado. Revisa y aprueba todas sus escenas.');
      setJsonToImport('');
    } catch (error) {
      setNotice(`JSON rechazado: ${(error as Error).message}`);
    }
  };

  return (
    <div className="studio-shell">
      <header className="studio-header">
        <div className="brand"><span className="brand-symbol">M</span>
          <div><strong>Motion Studio 7</strong><small>Director visual · HyperFrames · GSAP · CPU</small></div>
        </div>
        <div className="studio-actions">
          <span className="free-badge">LOCAL · SIN API DE PAGO</span>
          <span className="save-indicator">{dirty ? 'Cambios sin guardar' : 'Guardado'}</span>
          <button className="secondary" onClick={save} disabled={busy}>Guardar</button>
          <button className="secondary" onClick={() => { void save().then(() => window.open('/preview?engine=remotion', '_blank')); }}
            disabled={busy || project.visualEngine === 'canvas'}
            title={project.visualEngine === 'canvas' ? 'Canvas 3D se previsualiza en el monitor Remotion del editor' : 'Guarda y abre la vista previa con el mismo HTML que usa HyperFrames (incluye escenas HTML a medida)'}>
            Vista previa fiel
          </button>
          <button className="primary" onClick={() => void render(project.visualEngine === 'canvas' ? 'remotion' : 'hyperframes')}
            disabled={busy || renderJobId !== null || pendingApproval > 0}
            title={pendingApproval > 0 ? 'Debes aprobar todas las escenas' : project.visualEngine === 'canvas' ? 'Canvas 3D requiere el render Remotion' : 'Renderizar MP4 con HyperFrames'}>
            {renderJobId ? 'Renderizando...' : project.visualEngine === 'canvas' ? 'Exportar MP4 · Canvas 3D / Remotion' : 'Exportar MP4 · HyperFrames'}
          </button>
        </div>
      </header>

      <main className="studio-workspace">
        <aside className="panel left-panel">
          <div className="panel-heading"><h2>Proyecto</h2><span>01</span></div>
          <label>Nombre del proyecto
            <input value={project.name} maxLength={42}
              onChange={(e) => patchProject({name: e.target.value})}/>
          </label>
          <div className="scene-tools">
            <button onClick={downloadProject}>Descargar proyecto</button>
            <button className="danger" disabled={busy || renderJobId !== null} onClick={async () => {
              const confirmed = window.confirm('LIMPIEZA TOTAL: se borrarán proyecto guardado, medios importados, créditos y MP4 exportados de Motion Studio. ¿Quieres continuar?');
              if (!confirmed) return;
              const typed = window.prompt('Escribe BORRAR DATOS LOCALES para confirmar la limpieza.');
              if (typed !== 'BORRAR DATOS LOCALES') { setNotice('Limpieza cancelada: la confirmación no coincide.'); return; }
              setBusy(true);
              try {
                const result = await api<{project: StudioProject}>('/api/reset-local-content', {
                  method:'POST', headers:{'Content-Type':'application/json'},
                  body:JSON.stringify({confirm:typed}),
                });
                setProject(result.project);
                setSelected(0);
                setDirty(false);
                setAiProposal(null);
                setMediaResults([]);
                setNotice('Datos locales borrados. Motion Studio quedó listo para un proyecto nuevo.');
              } catch (error) {
                setNotice(`No se pudo limpiar: ${(error as Error).message}`);
              } finally { setBusy(false); }
            }}>Limpiar todos los datos locales…</button>
            <button onClick={() => {
              if (dirty && !window.confirm('Hay cambios sin guardar. ¿Crear un proyecto nuevo?')) return;
              const emptyProject = {...defaultStudioProject, name: 'Nuevo proyecto',
                scenes: [], references: [], voiceClips: [], script: '', creativeBrief: '',
                audioAsset:'', musicAsset:''};
              setProject(emptyProject);
              setDirty(true);
              setSelected(0);
              setNotice('Nuevo proyecto vacío. Añade escenas o importa un guion; guarda para reemplazar el proyecto actual.');
            }}>Proyecto nuevo</button>
          </div>
          <label>Abrir un proyecto JSON guardado
            <input type="file" accept=".json,application/json" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const parsed = JSON.parse(await file.text());
                await loadJsonProject(parsed.project ?? parsed);
                setNotice('Proyecto cargado. Revisa y aprueba sus escenas.');
              } catch (error) {
                setNotice(`No se pudo abrir el proyecto: ${(error as Error).message}`);
              }
            }}/>
          </label>
          <div className="two-fields">
            <label>Formato
              <select value={project.format}
                onChange={(e) => patchProject({format: e.target.value as FormatName})}>
                <option value="vertical">Vertical 9:16</option>
                <option value="horizontal">Horizontal 16:9</option>
              </select>
            </label>
            <label>Paleta
              <select value={project.palette}
                onChange={(e) => patchProject({palette: e.target.value as PaletteName})}>
                <option value="aurora">Aurora</option>
                <option value="sunset">Atardecer</option>
                <option value="mono">Monocromo</option>
              </select>
            </label>
          </div>
          <div className="two-fields">
            <label>Resolución
              <select value={project.resolution ?? '720p'}
                onChange={(e) => patchProject({resolution: e.target.value as '720p' | '1080p'})}>
                <option value="720p">720p · ligero</option>
                <option value="1080p">1080p · alta calidad</option>
              </select>
            </label>
            <label>Fotogramas por segundo
              <select value={project.fps ?? 24}
                onChange={(e) => patchProject({fps: Number(e.target.value) as 24 | 30})}>
                <option value="24">24 FPS · recomendado para CPU</option>
                <option value="30">30 FPS · movimiento más fluido</option>
              </select>
            </label>
          </div>
          <p className="hint">1080p y 30 FPS requieren más tiempo y memoria; la exportación CPU sigue usando un trabajador.</p>
          <label>Director de arte · estilo del video
            <select value={project.style ?? 'modern'}
              onChange={(e) => {
                const style = e.target.value as StyleName;
                patchProject({style, showText: style === 'modern'});
              }}>
              {Object.entries(styleNames).map(([id, name]) =>
                <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label>Motor visual de las escenas
            <select value={project.visualEngine ?? 'adaptive'}
              onChange={(e) => patchProject({visualEngine: e.target.value as 'adaptive' | 'classic' | 'canvas'})}>
              <option value="adaptive">Visual adaptativo · V7 (incluye tus imágenes)</option>
              <option value="canvas">Canvas 3D experimental · Venecia</option>
              <option value="classic">Clásico · compatible V4.2</option>
            </select>
          </label>
          <p className="hint">V7 integra las imágenes que importes o usa gráficos vectoriales. Canvas 3D
            dibuja geometría de Venecia con perspectiva, fotograma a fotograma, en CPU; se exporta por Remotion.
            Si la escena trata otro tema, conserva el modo V7. El modo clásico conserva los diseños anteriores.
            Al cambiar de modo, revisa otra vez las escenas.</p>
          <label>Dirección artística libre (opcional)
            <textarea rows={3} maxLength={2000} value={project.creativeBrief ?? ''}
              placeholder="Ej.: video educativo con papel recortado y colores pastel; ritmo pausado. Sirve para el diseño con Claude."
              onChange={(e) => patchProject({creativeBrief: e.target.value})}/>
          </label>
          <label>Fuente local (opcional)
            <input type="file" accept=".woff2,.ttf,.otf"
              onChange={(e: ChangeEvent<HTMLInputElement>) => void upload(e.target.files?.[0], 'fontAsset')}/>
          </label>
          <small>{labelForAsset(project.fontAsset ?? '')} · se incrusta en la exportación HyperFrames</small>
          {project.fontAsset && <button className="text-button" onClick={() => patchProject({fontAsset: ''})}>Quitar fuente</button>}
          <p className="hint">Puedes combinar cualquiera de los estilos con escenas individuales.
            Esta descripción se incluye en las instrucciones para Claude; no crea imágenes automáticamente.</p>
          <button className="secondary" onClick={() => {
            const style = suggestedStyle((project.script ?? '') + ' ' + project.name);
            patchProject({style, showText: style === 'modern'});
            setNotice(`Estilo sugerido: ${styleNames[style]}. Revísalo antes de aprobar escenas.`);
          }}>Sugerir estilo desde el guion</button>
          <label className="checkline">
            <input type="checkbox" checked={project.showText ?? true}
              onChange={(e) => patchProject({showText: e.target.checked})}/>
            Mostrar textos en pantalla
          </label>
          <p className="hint">Puedes dejarlo apagado para narraciones sin rótulos o activarlo para publicidad, datos y titulares.</p>

          <div className="panel-heading spaced"><h2>Escenas</h2><button className="tiny-button"
            onClick={() => {
              const scenes = [...project.scenes, makeScene(project)];
              if (scenes.length > 80) return setNotice('Máximo 80 escenas.');
              changeProject({...project, scenes: markForReview(scenes)});
              setSelected(scenes.length - 1);
            }}>+ Añadir</button></div>
          <div className="scene-list">
            {project.scenes.map((scene, index) => (
              <button key={scene.id} className={`scene-item ${selected === index ? 'selected' : ''}`}
                onClick={() => seekToScene(index)}>
                <span className="scene-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="scene-info"><strong>{scene.title || 'Sin título'}</strong>
                  <small>{scene.approved ? '✓ Aprobada' : '● Pendiente'} · {layoutNames[scene.layout]}</small></span>
                <span className="scene-duration">{scene.duration}s</span>
              </button>
            ))}
          </div>
          <div className="panel-heading spaced"><h2>Personajes y referencias</h2></div>
          <label>Para este proyecto
            <select value={project.characterMode ?? 'new'}
              onChange={(e) => patchProject({characterMode: e.target.value as 'new' | 'preserve'})}>
              <option value="preserve">Conservar mis personajes</option>
              <option value="new">Crear personajes nuevos</option>
            </select>
          </label>
          <label>Importar imagen de referencia
            <input type="file" accept=".png,.jpg,.jpeg,.webp"
              disabled={(project.references?.length ?? 0) >= 20}
              onChange={(e) => void addReference(e.target.files?.[0])}/>
          </label>
          {(project.references ?? []).map((asset, index) => (
            <div className="reference-row" key={asset}>
              <div className="reference-preview" role="img"
                aria-label={`Referencia ${index + 1}`}
                style={{
                  // This is a UI thumbnail, not a Remotion composition.
                  // eslint-disable-next-line @remotion/no-background-image
                  backgroundImage: `url('/${asset}')`,
                }} />
              <span>Referencia {index + 1}</span>
              <button className="text-button" onClick={() => patchProject({
                references: (project.references ?? []).filter((item) => item !== asset),
              })}>Quitar</button>
            </div>
          ))}
          {(project.references ?? []).length > 0 && <button className="secondary" onClick={() => {
            const scenes = assignReferenceImages(project.scenes, project.references ?? []);
            const count = scenes.filter((scene, index) => scene !== project.scenes[index]).length;
            if (!count) return setNotice('Todas las escenas ya tienen imagen o clip, o no hay referencias suficientes.');
            if (!window.confirm(`¿Asignar ${count} imágenes de referencia, por orden, a las escenas vacías? Podrás cambiar cada una después.`)) return;
            changeProject({...project, scenes});
            setNotice(`${count} imágenes asignadas. Revísalas en el reproductor y aprueba las escenas modificadas.`);
          }}>Distribuir mis imágenes entre escenas vacías</button>}
          <div className="panel-heading spaced"><h2>Audio</h2><span>MP3 / WAV / M4A</span></div>
          <label>Tipo de narración
            <select value={project.narrationMode ?? 'single'}
              onChange={(e) => patchProject({narrationMode: e.target.value as 'single' | 'dialogues'})}>
              <option value="single">Un MP3 completo</option>
              <option value="dialogues">Varios audios por diálogo</option>
            </select>
          </label>
          {project.narrationMode !== 'dialogues' ? (
          <div className="audio-block">
            <label>Voz o narración
              <input type="file" accept=".mp3,.wav,.m4a"
                onChange={(e: ChangeEvent<HTMLInputElement>) => void upload(e.target.files?.[0], 'audioAsset')}/>
            </label>
            <small>{labelForAsset(project.audioAsset)}</small>
            {project.audioAsset && <button className="text-button"
              onClick={() => patchProject({audioAsset: ''})}>Quitar narración</button>}
          </div>
          ) : (
            <div className="audio-block">
              <label>Agregar audios en orden de diálogo
                <input type="file" accept=".mp3,.wav,.m4a" multiple
                  onChange={(e) => void addDialogueClips(e.target.files)}/>
              </label>
              {(project.voiceClips ?? []).map((clip, index) => (
                <div className="dialogue-card" key={clip.id}>
                  <span>{index + 1}. {labelForAsset(clip.asset)}</span>
                  <label>Hablante
                    <input value={clip.speaker} onChange={(e) => patchProject({
                      voiceClips: (project.voiceClips ?? []).map((item, i) =>
                        i === index ? {...item, speaker: e.target.value} : item),
                    })}/>
                  </label>
                  <label>Duración real (s)
                    <input type="number" min={0.1} max={900} step={0.001}
                      value={clip.duration} onChange={(e) => patchProject({
                        voiceClips: (project.voiceClips ?? []).map((item, i) =>
                          i === index ? {...item, duration: Number(e.target.value)} : item),
                      })}/>
                  </label>
                  <button className="text-button" onClick={() => patchProject({
                    voiceClips: (project.voiceClips ?? []).filter((item) => item.id !== clip.id),
                  })}>Quitar diálogo</button>
                  <button className="text-button" disabled={index === 0} onClick={() => {
                    const clips = [...(project.voiceClips ?? [])];
                    [clips[index - 1], clips[index]] = [clips[index], clips[index - 1]];
                    patchProject({voiceClips: clips});
                  }}>Subir</button>
                </div>
              ))}
            </div>
          )}
          {effectiveAudioDuration !== null && effectiveAudioDuration > 0 && (
            <small>Duración de la narración: {effectiveAudioDuration.toFixed(2)} s</small>
          )}
          {effectiveAudioDuration !== null && effectiveAudioDuration > 0 &&
            Math.abs(effectiveAudioDuration - totalSeconds) > 0.5 && (
              <p className="audio-warning">
                La voz dura {effectiveAudioDuration.toFixed(2)} s y el video {totalSeconds.toFixed(2)} s.
                Ajusta los segundos de las escenas antes de aprobar.
              </p>
            )}
          <div className="audio-block">
            <label>Música de fondo
              <input type="file" accept=".mp3,.wav,.m4a"
                onChange={(e: ChangeEvent<HTMLInputElement>) => void upload(e.target.files?.[0], 'musicAsset')}/>
            </label>
            <small>{labelForAsset(project.musicAsset)} · nivel {Math.round((project.musicVolume ?? 0.18) * 100)} %</small>
            {project.musicAsset && <label>Nivel de música (reduce el volumen si compite con la voz): {Math.round((project.musicVolume ?? 0.18) * 100)} %
              <input type="range" min={0} max={50} step={1} value={Math.round((project.musicVolume ?? 0.18) * 100)}
                onChange={(e) => patchProject({musicVolume: Number(e.target.value) / 100})}/>
            </label>}
            {project.musicAsset && <button className="text-button"
              onClick={() => patchProject({musicAsset: ''})}>Quitar música</button>}
          </div>
        </aside>

        <section className="center-panel">
          {project.scenes.length === 0 ? <div className="empty-project-state">
            <h2>Proyecto limpio, listo para empezar</h2>
            <p>No hay escenas de ejemplo ni contenido de otros trabajos.</p>
            <button className="primary" onClick={() => {
              const scene = makeScene({...project, scenes:[]});
              changeProject({...project, scenes:[scene]});
              setSelected(0);
            }}>Crear primera escena</button>
          </div> : <>
          <div className="preview-toolbar">
            <div><h2>Vista previa del video</h2><p>Revisa aquí las escenas, animaciones y el audio antes de exportar.</p></div>
            <div className="preview-meta">{dimensions.width} × {dimensions.height} · {project.fps ?? 24} FPS</div>
          </div>
          <div className={pendingApproval ? 'review-alert' : 'review-alert ready'}>
            {pendingApproval
              ? `Revisión obligatoria: ${pendingApproval} de ${project.scenes.length} escenas pendientes.`
              : 'Todas las escenas están aprobadas. Ya puedes exportar.'}
            {pendingApproval > 0 && <button className="primary" onClick={() => {
              changeProject({...project, scenes: project.scenes.map(scene => ({...scene, approved: true}))});
              setNotice(`Las ${project.scenes.length} escenas están aprobadas. Ya puedes exportar.`);
            }}>✓ Aprobar todas las escenas</button>}
          </div>
          <div className={preflightNotes.length ? 'review-alert' : 'review-alert ready'}>
            <strong>Revisión técnica antes de exportar</strong>
            {preflightNotes.length === 0
              ? <p>Sin alertas básicas. Revisa visualmente los planos y escucha la narración.</p>
              : <ul>{preflightNotes.map((note) => <li key={note}>{note}</li>)}</ul>}
          </div>
          <div className="preview-frame">
            <div className={`video-stage ${project.format}`}>
              <FaithfulPreview ref={playerRef} project={project}/>
            </div>
          </div>
          <div className="timeline-panel">
            <div className="timeline-heading"><strong>Línea de tiempo</strong>
              <span>{totalSeconds.toFixed(1)} s · {project.scenes.length} escenas</span></div>
            <div className="scene-timeline">
              {project.scenes.map((scene, index) => (
                <button key={scene.id}
                  onClick={() => seekToScene(index)}
                  style={{flex: scene.duration}}
                  className={`timeline-segment ${index === selected ? 'selected' : ''}`}>
                  <span>{index + 1}. {scene.title.slice(0, 16)}</span>
                  <small>{scene.duration}s</small>
                </button>
              ))}
            </div>
            <p className="hint">Selecciona una escena y usa el reproductor para elegir el fotograma donde debe aparecer un elemento.</p>
          </div>
          <div className="export-panel">
            <div className="timeline-heading">
              <strong>Exportación</strong>
              <span>{renderStatus?.engine === 'hyperframes' ? 'HyperFrames' : renderStatus?.engine === 'remotion' ? 'Remotion' : 'Esperando'}</span>
            </div>
            <div className="export-track"><div style={{width: `${renderStatus?.progress ?? 0}%`}}/></div>
            {renderStatus?.download &&
              <a className="download-button" href={renderStatus.download}>Descargar video MP4</a>}
            {renderStatus?.error && <pre className="error-log">{renderStatus.error}{renderStatus.log ? `\n\nDiagnóstico:\n${renderStatus.log}` : ''}</pre>}
          </div>
          </>}
        </section>

        <aside className="panel inspector">
          <div className="panel-heading"><h2>Inspector de escena</h2><span>{String(selected + 1).padStart(2, '0')}</span></div>
          {currentScene && <>
            <div className={currentScene.approved ? 'review-alert ready' : 'review-alert'}>
              <strong>{currentScene.approved ? 'Escena aprobada' : 'Escena pendiente de revisión'}</strong>
              <p>Reproduce esta escena y comprueba la imagen, la duración y la voz.</p>
              <button className={currentScene.approved ? 'secondary' : 'primary'}
                onClick={() => patchScene({approved: !currentScene.approved})}>
                {currentScene.approved ? 'Retirar aprobación' : '✓ Aprobar esta escena'}
              </button>
            </div>
            <div className="scene-tools">
              <button className="secondary" disabled={sceneCodeBusy || !integrationStatus?.freeLLMApi?.configured} onClick={() => void requestSceneCode()}>
                {sceneCodeBusy ? 'Escribiendo escena...' : '✨ Escribir animación con IA'}
              </button>
            </div>
            <div className="scene-tools">
              <button onClick={() => inspectFrame(0.15)}>Ver inicio</button>
              <button onClick={() => inspectFrame(0.5)}>Ver mitad</button>
              <button onClick={() => inspectFrame(0.85)}>Ver final</button>
            </div>
            <div className="scene-tools">
              <button onClick={() => moveScene(-1)} disabled={selected === 0}>← Mover</button>
              <button onClick={() => moveScene(1)} disabled={selected === project.scenes.length - 1}>Mover →</button>
              <button onClick={removeScene} disabled={project.scenes.length === 1}>Eliminar</button>
            </div>
            <label>Título
              <textarea rows={2} maxLength={80} value={currentScene.title}
                onChange={(e) => patchScene({title: e.target.value})}/>
            </label>
            <label>Descripción
              <textarea rows={3} maxLength={160} value={currentScene.subtitle}
                onChange={(e) => patchScene({subtitle: e.target.value})}/>
            </label>
            <label>Fragmento del guion (solo para revisar, no sale en video)
              <textarea rows={3} maxLength={800} value={currentScene.scriptExcerpt ?? ''}
                onChange={(e) => patchScene({scriptExcerpt: e.target.value})}/>
            </label>
            <div className="panel-heading spaced"><h2>Subtítulos de esta escena</h2>
              <button className="tiny-button" disabled={(currentScene.captions?.length ?? 0) >= 80} onClick={addCaption}>+ Frase</button></div>
            <p className="hint">Se muestran solo las frases que añadas aquí. La transcripción propone tiempos aproximados, no sincronía palabra por palabra.</p>
            {(currentScene.captions ?? []).map((caption, index) => <div className="cue-card" key={caption.id}>
              <div className="cue-title"><strong>Frase {index + 1}</strong>
                <button className="text-button" onClick={() => patchScene({captions: (currentScene.captions ?? []).filter((_, i) => i !== index)})}>Quitar</button></div>
              <label>Texto de subtítulo
                <textarea rows={2} maxLength={180} value={caption.text}
                  onChange={(e) => patchCaption(index, {text: e.target.value})}/>
              </label>
              <div className="two-fields">
                <label>Aparece (s)
                  <input type="number" min={0} max={currentScene.duration} step={0.05} value={caption.at}
                    onChange={(e) => patchCaption(index, {at: Math.max(0, Number(e.target.value) || 0)})}/>
                </label>
                <label>Dura (s)
                  <input type="number" min={0.1} max={currentScene.duration} step={0.05} value={caption.duration}
                    onChange={(e) => patchCaption(index, {duration: Math.max(0.1, Number(e.target.value) || 0.1)})}/>
                </label>
              </div>
              <label>Posición
                <select value={caption.position ?? 'bottom'}
                  onChange={(e) => patchCaption(index, {position: e.target.value as 'top' | 'bottom'})}>
                  <option value="top">Arriba (estilo narración)</option>
                  <option value="bottom">Abajo</option>
                </select>
              </label>
            </div>)}
            <label>Recurso visual sugerido (opcional)
              <input maxLength={100} value={currentScene.visualQuery ?? ''}
                placeholder="ej. paisaje de río bajo la luna"
                onChange={(e) => patchScene({visualQuery: e.target.value})}/>
            </label>
            {currentScene.visualActionPlan && <div className="cue-card">
              <div className="cue-title"><strong>Acción visual de este plano</strong>
                <button className="text-button" onClick={() => patchScene({visualActionPlan:
                  createVisualActionPlan(currentScene, project, selected)})}>Recalcular</button></div>
              <p>{currentScene.visualActionPlan.action}</p>
              <small>Base del guion: {currentScene.visualActionPlan.evidence || 'sin fragmento; plan de respaldo'}<br/>
                {currentScene.visualActionPlan.shotScale} · cámara {currentScene.visualActionPlan.camera} · {currentScene.visualActionPlan.beats.length} beats</small>
            </div>}
            {(currentScene.visualQuery ?? '').trim().length >= 2 && <button className="secondary"
              disabled={busy} onClick={() => {
                setMediaQuery(currentScene.visualQuery ?? '');
                void searchVisuals(currentScene.visualQuery);
              }}>Buscar este recurso con {mediaProvider === 'openverse' ? 'Openverse' : 'Pixabay'}</button>}
            <div className="two-fields">
              <label>Animación
                <select value={currentScene.layout}
                  onChange={(e) => patchScene({layout: e.target.value as SceneLayout})}>
                  {Object.entries(layoutNames).map(([id, name]) =>
                    <option value={id} key={id}>{name}</option>)}
                </select>
              </label>
              <label>Duración (s)
                <input type="number" min={0.5} max={60} step={0.01}
                  value={currentScene.duration}
                  onChange={(e) => patchScene({duration: Math.max(0.5, Math.min(60, Number(e.target.value) || 0.5))})}/>
              </label>
            </div>
            <div className="panel-heading spaced"><h2>Dirección de movimiento</h2></div>
            <label>Estilo de esta escena
              <select value={currentScene.style ?? ''}
                onChange={(e) => patchScene({style: e.target.value ? e.target.value as StyleName : undefined})}>
                <option value="">Heredar estilo del proyecto</option>
                {Object.entries(styleNames).map(([id, name]) =>
                  <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
            <div className="two-fields">
              <label>Movimiento de cámara
                <select value={currentScene.motion ?? 'auto'}
                  onChange={(e) => patchScene({motion: e.target.value as MotionPreset})}>
                  {Object.entries(motionNames).map(([id, name]) =>
                    <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
              <label>Entrada / corte
                <select value={currentScene.transition ?? 'cut'}
                  // Editor control, not animation code inside the composition.
                  // eslint-disable-next-line @remotion/non-pure-animation
                  onChange={(e) => patchScene({transition: e.target.value as TransitionPreset})}>
                  {Object.entries(transitionNames).map(([id, name]) =>
                    <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
            </div>
            <label>Intensidad del movimiento: {currentScene.motionStrength ?? 40} %
              <input type="range" min={0} max={100} step={5}
                value={currentScene.motionStrength ?? 40}
                onChange={(e) => patchScene({motionStrength: Number(e.target.value)})}/>
            </label>
            <label>Imagen de la escena (opcional)
              <input type="file" accept=".png,.jpg,.jpeg,.webp"
                onChange={(e: ChangeEvent<HTMLInputElement>) => void upload(e.target.files?.[0], 'imageAsset')}/>
            </label>
            <label>Clip MP4 de la escena (Remotion o HyperFrames)
              <input type="file" accept=".mp4,video/mp4"
                onChange={(e: ChangeEvent<HTMLInputElement>) => void upload(e.target.files?.[0], 'videoAsset')}/>
            </label>
            <div className="file-line">{labelForAsset(currentScene.videoAsset ?? '')}
              {currentScene.videoAsset && <button className="text-button"
                onClick={() => patchScene({videoAsset: ''})}>Quitar clip</button>}
            </div>
            {currentScene.videoAsset && <p className="hint">El clip se muestra en esta escena sin su audio interno.
              Ajusta su duración para que coincida con la narración y vuelve a aprobar la escena.</p>}
            <div className="file-line">{labelForAsset(currentScene.imageAsset)}
              {currentScene.imageAsset && <button className="text-button"
                onClick={() => patchScene({imageAsset: ''})}>Quitar</button>}
            </div>
            {currentScene.imageAsset && <label>Cómo encuadrar mi imagen
              <select value={currentScene.imageFit ?? 'auto'}
                onChange={(e) => patchScene({imageFit: e.target.value as ImageFit})}>
                <option value="auto">Automático según estilo</option>
                <option value="contain">Mostrar imagen completa y fondo integrado</option>
                <option value="cover">Cubrir toda la pantalla (puede recortar bordes)</option>
              </select>
            </label>}
            {currentScene.imageAsset && <div className="two-fields">
              <label>Encuadre horizontal: {currentScene.focusX ?? 50} %
                <input type="range" min={0} max={100} step={5}
                  value={currentScene.focusX ?? 50}
                  onChange={(e) => patchScene({focusX: Number(e.target.value)})}/>
              </label>
              <label>Encuadre vertical: {currentScene.focusY ?? 50} %
                <input type="range" min={0} max={100} step={5}
                  value={currentScene.focusY ?? 50}
                  onChange={(e) => patchScene({focusY: Number(e.target.value)})}/>
              </label>
            </div>}
            {(project.references?.length ?? 0) > 0 && (
              <label>Usar una referencia como imagen de escena
                <select value={currentScene.imageAsset}
                  onChange={(e) => patchScene({imageAsset: e.target.value})}>
                  <option value="">Sin imagen</option>
                  {(project.references ?? []).map((asset, index) =>
                    <option value={asset} key={asset}>Referencia {index + 1}</option>)}
                  {currentScene.imageAsset && !(project.references ?? []).includes(currentScene.imageAsset) && (
                    <option value={currentScene.imageAsset}>Imagen propia de esta escena</option>
                  )}
                </select>
              </label>
            )}
            {!['modern', 'tech', 'energetic', 'playful'].includes(resolveSceneStyle(project, currentScene)) &&
              !currentScene.imageAsset && !currentScene.videoAsset &&
              <p className="audio-warning">Esta escena no tiene imagen. Puedes aprobarla como fondo abstracto,
                pero para un relato cinematográfico conviene importar una imagen.</p>}
            <div className="panel-heading spaced"><h2>Gráficos inteligentes</h2>
              <button className="tiny-button" onClick={suggestCurrentGraphics}>↻ Sugerir</button></div>
            <p className="hint">Contadores, barras, círculos e iconos sugeridos desde el guion.
              Los tiempos son aproximados: revísalos escuchando tu MP3 antes de aprobar.</p>
            {(currentScene.motionGraphics ?? []).length === 0 && <p className="hint">
              Esta escena no tiene gráficos. No se agregan automáticamente a relatos sin datos.</p>}
            {(currentScene.motionGraphics ?? []).map((graphic, index) => (
              <div className="cue-card" key={graphic.id}>
                <div className="cue-title"><strong>Gráfico {index + 1}</strong>
                  <button className="text-button" onClick={() => patchScene({
                    motionGraphics: (currentScene.motionGraphics ?? []).filter((_, i) => i !== index),
                  })}>Quitar</button></div>
                <label>Tipo de gráfico
                  <select value={graphic.kind} onChange={(e) => patchGraphic(index,
                    {kind: e.target.value as GraphicKind})}>
                    {Object.entries(graphicNames).map(([kind, name]) =>
                      <option key={kind} value={kind}>{name}</option>)}
                  </select>
                </label>
                <label>Etiqueta
                  <input maxLength={55} value={graphic.label}
                    onChange={(e) => patchGraphic(index, {label: e.target.value})}/>
                </label>
                {graphic.kind !== 'icon' && graphic.kind !== 'donut' && <div className="two-fields">
                  <label>Valor
                    <input type="number" min={0} max={1e9} step={0.01} value={graphic.value}
                      onChange={(e) => patchGraphic(index, {value: Number(e.target.value) || 0})}/>
                  </label>
                  <label>Unidad
                    <select value={graphic.unit} onChange={(e) => patchGraphic(index,
                      {unit: e.target.value as GraphicUnit})}>
                      {Object.entries(unitNames).map(([unit, name]) =>
                        <option key={unit} value={unit}>{name}</option>)}
                    </select>
                  </label>
                </div>}
                {graphic.kind === 'bar' && <label>Máximo de la barra
                  <input type="number" min={1} max={1e9} step={1} value={graphic.maxValue ?? 100}
                    onChange={(e) => patchGraphic(index, {maxValue: Number(e.target.value) || 100})}/>
                </label>}
                {graphic.kind === 'icon' && <label>Icono
                  <select value={graphic.icon ?? 'wallet'} onChange={(e) => patchGraphic(index,
                    {icon: e.target.value as GraphicIcon})}>
                    {Object.entries(iconNames).map(([icon, name]) =>
                      <option key={icon} value={icon}>{name}</option>)}
                  </select>
                </label>}
                {graphic.kind === 'donut' && <div className="graphic-segments">
                  <strong>Segmentos del círculo</strong>
                  {(graphic.segments ?? []).map((segment, segmentIndex) => (
                    <div className="two-fields" key={segmentIndex}>
                      <label>Nombre {segmentIndex + 1}
                        <input maxLength={30} value={segment.label} onChange={(e) => patchGraphic(index, {
                          segments: (graphic.segments ?? []).map((part, i) => i === segmentIndex
                            ? {...part, label: e.target.value} : part),
                        })}/>
                      </label>
                      <label>Porcentaje
                        <input type="number" min={0} max={100} step={1} value={segment.value}
                          onChange={(e) => patchGraphic(index, {
                            segments: (graphic.segments ?? []).map((part, i) => i === segmentIndex
                              ? {...part, value: Number(e.target.value) || 0} : part),
                          })}/>
                      </label>
                    </div>
                  ))}
                  <div className="scene-tools">
                    <button disabled={(graphic.segments ?? []).length >= 5} onClick={() => patchGraphic(index, {
                      segments: [...(graphic.segments ?? []), {label: 'Otro', value: 0}],
                    })}>+ Segmento</button>
                    <button disabled={(graphic.segments ?? []).length <= 1} onClick={() => patchGraphic(index, {
                      segments: (graphic.segments ?? []).slice(0, -1),
                    })}>Quitar último</button>
                  </div>
                </div>}
                <div className="two-fields">
                  <label>Aparece (s)
                    <input type="number" min={0} max={currentScene.duration} step={0.1}
                      value={graphic.at} onChange={(e) => patchGraphic(index,
                        {at: Number(e.target.value) || 0})}/>
                  </label>
                  <label>Animación (s)
                    <input type="number" min={0.2} max={6} step={0.1}
                      value={graphic.duration} onChange={(e) => patchGraphic(index,
                        {duration: Number(e.target.value) || 0.2})}/>
                  </label>
                </div>
              </div>
            ))}
            <button className="secondary" disabled={(currentScene.motionGraphics ?? []).length >= 8}
              onClick={() => patchScene({motionGraphics: [...(currentScene.motionGraphics ?? []), {
                id: crypto.randomUUID(), kind: 'counter', label: 'NUEVA CIFRA',
                value: 100, unit: 'number', at: 0.4, duration: 1.1, maxValue: 100, icon: 'wallet',
                segments: [{label: 'Parte A', value: 60}, {label: 'Parte B', value: 40}],
              }]})}>+ Añadir gráfico manual</button>
            <div className="panel-heading spaced"><h2>Elementos temporizados</h2>
              <button className="tiny-button" onClick={addCue}
                disabled={currentScene.cues.length >= 16}>+ Elemento</button></div>
            {currentScene.cues.length === 0 &&
              <p className="hint">Añade figuras que aparecerán en momentos exactos de esta escena.</p>}
            {currentScene.cues.map((cue, index) => (
              <div className="cue-card" key={cue.id}>
                <div className="cue-title"><strong>Elemento {index + 1}</strong>
                  <button className="text-button" onClick={() => patchScene({
                    cues: currentScene.cues.filter((_, i) => i !== index),
                  })}>Quitar</button></div>
                <label>Figura
                  <select value={cue.shape} onChange={(e) =>
                    patchCue(index, {shape: e.target.value as CueShape})}>
                    {Object.entries(shapeNames).map(([id, name]) =>
                      <option value={id} key={id}>{name}</option>)}
                  </select>
                </label>
                <div className="two-fields">
                  <label>Aparece (s)
                    <input type="number" min={0} max={currentScene.duration}
                      step={0.1} value={cue.at}
                      onChange={(e) => patchCue(index, {at: Number(e.target.value) || 0})}/>
                  </label>
                  <label>Dura (s)
                    <input type="number" min={0.2} max={30}
                      step={0.1} value={cue.duration}
                      onChange={(e) => patchCue(index, {duration: Number(e.target.value) || 0.2})}/>
                  </label>
                </div>
                <label>Etiqueta opcional
                  <input maxLength={30} value={cue.label}
                    placeholder="Vacío = sin texto"
                    onChange={(e) => patchCue(index, {label: e.target.value})}/>
                </label>
              </div>
            ))}
          </>}
        </aside>
      </main>

      <section className="assistant-area">
        <div className="assistant-box">
          <div className="panel-heading"><h2>Guion y storyboard</h2><span>Basado en tu narración</span></div>
          <p>Elige un formato de trabajo para preparar la dirección artística. Es una guía editable, no genera imágenes ni cambia tus archivos cargados.</p>
          <div className="assistant-buttons">
            <button className="secondary" onClick={() => applyVideoPreset('relato')}>📖 Relato narrado</button>
            <button className="secondary" onClick={() => applyVideoPreset('curiosidades')}>💡 Curiosidades</button>
            <button className="secondary" onClick={() => applyVideoPreset('historia')}>🏛 Historia / explicación</button>
          </div>
          <p>Escribe o pega tu guion. Si tiene tiempos como (0:14), se utilizarán como referencia de escenas.
            Sin tiempos, crearemos un borrador proporcional a la duración del audio que puedes corregir.
            Cuando el contenido incluya datos, propondremos motion graphics editables sin usar APIs.</p>
          <textarea value={project.script ?? ''}
            onChange={(e) => patchProject({script: e.target.value})}
            placeholder="(0:00) La noche que me topé con La Llorona..." rows={6}/>
          <button className="primary" onClick={() => {
            const script = (project.script ?? '').trim();
            if (!script) return setNotice('Pega primero el guion.');
            const duration = effectiveAudioDuration && effectiveAudioDuration > 0
              ? effectiveAudioDuration : Math.max(15, (script.split(/\s+/).length / 140) * 60);
            const next = narrationDraft(script, duration, project,
              effectiveAudioDuration !== null && effectiveAudioDuration > 0);
            changeProject(next);
            setSelected(0);
            playerRef.current?.seekTo(0);
            const count = next.scenes.reduce((n, scene) => n + (scene.motionGraphics?.length ?? 0), 0);
            setNotice(`Storyboard: ${next.scenes.length} escenas y ${count} gráficos sugeridos. Revisa con el audio y aprueba.`);
          }}>Crear storyboard desde narración</button>
          <button className="secondary" onClick={() => {
            if (project.scenes.some((scene) => (scene.motionGraphics?.length ?? 0) > 0) &&
              !window.confirm('¿Regenerar los gráficos? Se reemplazarán los ajustes anteriores.')) return;
            const next = withSuggestedGraphics(project);
            changeProject(next);
            const count = next.scenes.reduce((n, scene) => n + (scene.motionGraphics?.length ?? 0), 0);
            setNotice(`${count} gráficos inteligentes propuestos. Revisa y aprueba las escenas modificadas.`);
          }}>✨ Generar gráficos en las escenas actuales</button>
          <small>Este generador usa reglas locales. Los tiempos son aproximados y las propuestas deben revisarse.
            No modifica ni sustituye tus audios, imágenes o referencias.</small>
        </div>
        <div className="assistant-box ai-panel">
          <div className="panel-heading"><h2>Director creativo con IA</h2><span>Local o remoto · opcional</span></div>
          <p>La IA recomienda una composición distinta para cada parte de tu narración:
            estilos, movimiento, gráficos y búsquedas de imágenes. Puedes revisar
            sus propuestas antes de modificar tu proyecto.</p>
          <p className="hint">Solo se envían el texto del guion, títulos y tiempos. Con Ollama, el texto va al servicio local de tu laptop (127.0.0.1:11434); no sale a Internet por Motion Studio. MP3, imágenes, referencias y claves no se envían.</p>
          <label>Proveedor del planificador
            <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value as 'ollama'|'freellmapi')}>
              <option value="ollama">Ollama local · Qwen2.5</option>
              <option value="freellmapi">FreeLLMAPI · externo opcional</option>
            </select>
          </label>
          {aiProvider === 'ollama' ? <>
            <div className={ollamaStatus?.ok ? 'review-alert ready' : 'review-alert'}>
              {ollamaStatus?.ok ? `Conectado · ${ollamaStatus.model}`
                : ollamaStatus?.error || (integrationStatus?.ollama?.enabled
                  ? `Modelo configurado: ${integrationStatus.ollama.model}. Comprueba que Ollama esté ejecutándose.`
                  : 'Ollama está desactivado en la configuración del servidor.')}
            </div>
            <button className="secondary" disabled={!integrationStatus?.ollama?.enabled || busy}
              onClick={() => void checkOllama()}>Comprobar Ollama y el modelo</button>
          </> : integrationStatus?.freeLLMApi?.configured ? <div className="review-alert ready">
            FreeLLMAPI configurado · modelo: {integrationStatus.freeLLMApi.model}
          </div> : <div className="review-alert">
            IA externa no configurada. Copia <code>.env.example</code> como <code>.env</code>,
            añade FREELLMAPI_API_KEY y abre FreeLLMAPI.
          </div>}
          <button className="primary" disabled={fullVideoCodeBusy || aiProvider !== 'freellmapi' || !integrationStatus?.freeLLMApi?.configured}
            onClick={() => void requestFullVideoCode()}>
            {fullVideoCodeBusy ? 'Escribiendo video completo...' : '🎬 Generar video completo con código · FreeLLMAPI'}
          </button>
          <button className="primary" disabled={busy || (aiProvider === 'ollama'
            ? !integrationStatus?.ollama?.enabled || !ollamaStatus?.ok : !integrationStatus?.freeLLMApi?.configured)}
            onClick={() => void requestCreativePlan()}>
            {busy ? 'Procesando...' : aiProvider === 'ollama'
              ? '✨ Analizar guion localmente con Qwen2.5'
              : '✨ Analizar guion con FreeLLMAPI'}
          </button>
          {aiProposal && <div className="ai-preview">
            <strong>Propuesta pendiente · {aiProposal.plan.scenes.length} escenas</strong>
            <p>Estilo: {styleNames[aiProposal.plan.style]} · {aiProposal.provider}</p>
            {aiProposal.plan.topic && <p><strong>Tema:</strong> {aiProposal.plan.topic}</p>}
            {aiProposal.plan.audience && <p><strong>Audiencia:</strong> {aiProposal.plan.audience}</p>}
            {aiProposal.plan.promise && <p><strong>Promesa:</strong> {aiProposal.plan.promise}</p>}
            {aiProposal.plan.facts?.length ? <p><strong>Hechos:</strong> {aiProposal.plan.facts.join(' · ')}</p> : null}
            <p>{aiProposal.plan.creativeBrief}</p>
            <div className="ai-plan-list">
              {aiProposal.plan.scenes.map((scene) => <div key={scene.index} className="ai-scene">
                <strong>{scene.index.toString().padStart(2, '0')}. {scene.title}</strong>
                <small>{scene.purpose ? `${scene.purpose} · ` : ''}{layoutNames[scene.layout]} · {styleNames[scene.style]} · {scene.motionGraphics.length} gráficos</small>
                {scene.visualPlan && <small>Plan visual: {scene.visualPlan}</small>}
                {scene.visualQuery && <small>Imagen: {scene.visualQuery}</small>}
              </div>)}
            </div>
            <p className="hint">Al aplicar, el audio, los archivos, los tiempos y las referencias se mantienen.
              Todas las escenas quedarán pendientes de aprobación.</p>
            <div className="scene-tools">
              <button className="secondary" disabled={busy}
                onClick={() => setAiProposal(null)}>Descartar</button>
              <button className="primary" disabled={busy} onClick={applyCreativePlan}>Aplicar propuesta</button>
            </div>
          </div>}
          <small>Los modelos gratuitos pueden fallar o tener límites. Para publicar contenido,
            revisa las condiciones del proveedor que haya respondido. Nunca es obligatorio usar la IA.</small>
        </div>
        <div className="assistant-box">
          <div className="panel-heading"><h2>Generador gratuito de borradores</h2><span>Sin IA ni Internet</span></div>
          <textarea value={idea} onChange={(e) => setIdea(e.target.value)}
            placeholder="Describe las escenas de tu video separándolas con puntos. Por ejemplo: Un producto aparece. Sus características brillan. La marca se revela." rows={3}/>
          <button className="secondary" onClick={() => {
            changeProject(localDraft(idea, project)); setSelected(0);
            setNotice('Borrador creado. Ajusta sus escenas en el inspector.');
          }}>Crear escenas desde la descripción</button>
        </div>
        <div className="assistant-box">
          <div className="panel-heading"><h2>Recursos mediante APIs</h2><span>Gratis o con límites</span></div>
          <p>Busca imágenes para la escena seleccionada. Tú eliges cuáles importar;
            se guarda su autor, procedencia y licencia. Ninguna API de pago está activada.</p>
          <div className="two-fields">
            <label>Proveedor
              <select value={mediaProvider} onChange={(e) => setMediaProvider(e.target.value as 'openverse' | 'pixabay')}>
                <option value="openverse">Openverse · gratis</option>
                <option value="pixabay">Pixabay · clave gratuita</option>
              </select>
            </label>
            <label>Qué imagen necesitas
              <input value={mediaQuery} maxLength={100} placeholder="río nocturno, telescopio, edificio..."
                onChange={(e) => setMediaQuery(e.target.value)}/>
            </label>
          </div>
          <button className="secondary" disabled={busy || (mediaProvider === 'pixabay' && !integrationStatus?.pixabay)}
            onClick={() => void searchVisuals()}>Buscar imágenes para mi video</button>
          {mediaProvider === 'pixabay' && !integrationStatus?.pixabay &&
            <p className="hint">Configura PIXABAY_API_KEY en .env para habilitar Pixabay.</p>}
          <div className="asset-results">
            {mediaResults.map((item) => <div className="asset-result" key={item.id}>
              <div className="asset-result-preview" role="img" aria-label={item.title} style={{
                // Remote search thumbnail in the editor UI, not a video composition.
                // eslint-disable-next-line @remotion/no-background-image
                backgroundImage: `url(${JSON.stringify(item.thumbnail)})`,
              }}/>
              <small>{item.creator} · {item.license}</small>
              <div className="scene-tools">
                <button disabled={busy} onClick={() => void importStockVisual(item)}>Usar en escena</button>
                {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Origen / licencia</a>}
              </div>
            </div>)}
          </div>
          <div className="panel-heading spaced"><h2>Transcribir audio en la nube</h2></div>
          <p>Groq/Whisper puede transformar un MP3 en texto con tiempos aproximados.
            El audio se envía únicamente cuando lo confirmas.</p>
          {project.narrationMode === 'dialogues' && <label>Seleccionar audio de diálogo
            <select value={transcribeSource} onChange={(e) => setTranscribeSource(e.target.value)}>
              <option value="">Primer diálogo</option>
              {(project.voiceClips ?? []).map((clip) =>
                <option key={clip.id} value={clip.asset}>{clip.speaker || clip.id}</option>)}
            </select>
          </label>}
          <button className="secondary" disabled={busy || !integrationStatus?.groq}
            onClick={() => void transcribeFromCloud()}>Transcribir y proponer subtítulos con Groq</button>
          {!integrationStatus?.groq && <p className="hint">Para activarlo, configura GROQ_API_KEY en .env.
            El resto del editor sigue funcionando sin esta API.</p>}
        </div>
        <div className="assistant-box">
          <div className="panel-heading"><h2>Motor HyperFrames</h2><span>Renderizado directo V7</span></div>
          <p>HyperFrames genera el MP4 desde este editor: no necesitas descargar el HTML ni volver a importarlo. Conserva tus imágenes y clips, mezcla narración, diálogos y música, y renderiza fotograma a fotograma.</p>
          <div className="scene-tools">
            <button className="primary" disabled={busy || renderJobId !== null || pendingApproval > 0 || project.visualEngine === 'canvas'}
              onClick={() => void render('hyperframes')}>Renderizar MP4 con HyperFrames</button>
            <button className="secondary" disabled={project.visualEngine === 'canvas'}
              onClick={() => void downloadHyperframes(false)}>Exportar escena HTML</button>
            <button className="secondary" disabled={project.visualEngine === 'canvas'}
              onClick={() => void downloadHyperframes(true)}>Exportar proyecto HTML</button>
            <button className="secondary" disabled={busy || renderJobId !== null || pendingApproval > 0}
              onClick={() => void render('remotion')}>{project.visualEngine === 'canvas' ? 'Renderizar Canvas 3D con Remotion' : 'Usar Remotion como alternativa'}</button>
          </div>
          {project.visualEngine === 'canvas' ? <small>Modo experimental Canvas 3D: el monitor del editor y la exportación Remotion dibujan la misma geometría con perspectiva. HyperFrames/HTML no soporta este renderer. CPU, sin dependencias ni GPU.</small> : <small>El primer render instala HyperFrames automáticamente desde npm y prepara Chrome. Requiere conexión a Internet solo para esa instalación inicial, Node.js 22 o superior y FFmpeg. Después el render es local, sin API ni créditos de pago. Se limita a 24 FPS y un trabajador para reducir el consumo de memoria.</small>}
        </div>
        <div className="assistant-box">
          <div className="panel-heading"><h2>Colaborar con Claude</h2><span>Opcional</span></div>
          <p>Claude puede escribir el JSON de las escenas. El editor no hace llamadas de pago ni utiliza tus claves.</p>
          <div className="assistant-buttons">
            <button className="secondary" onClick={() => void copyClaude()}>Copiar instrucciones para Claude</button>
          </div>
          <textarea value={jsonToImport} onChange={(e) => setJsonToImport(e.target.value)}
            placeholder="Pega aquí el JSON generado y pulsa Importar." rows={3}/>
          <button className="secondary" onClick={() => void importJson()} disabled={!jsonToImport.trim()}>
            Importar JSON</button>
        </div>
      </section>
      <footer className="studio-footer">
        <span role="status">{notice}</span>
        <span>Motion Studio v7 · HyperFrames principal · Remotion alternativo · CPU</span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<StudioApp/>);
