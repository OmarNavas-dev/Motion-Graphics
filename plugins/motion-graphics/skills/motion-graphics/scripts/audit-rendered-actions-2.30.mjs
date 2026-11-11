import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const self = fileURLToPath(import.meta.url);
const cameraNames = new Set(['L-bg', 'L-mid', 'L-fg', 'camera', 'world', 'parallax', 'shake']);
const isText = sel => /^(dvj-|caption|subtit|text|title|heading|word)/i.test(sel);
const isCamera = sel => cameraNames.has(sel) || /^(cam-|camera-)/i.test(sel);
const isDecor = sel => /^(tag|lb\d|dm\d|badge|hud|overlay|glow|particle)/i.test(sel);

function selectorsInAnimations(script) {
  const targets = [];
  const regex = /\btl\.(fromTo|to)\s*\(\s*(?:S\s*\+\s*)?(['"])\s*([^'"]+)\2/g;
  for (const match of script.matchAll(regex)) {
    const whole = match[3];
    const cls = [...whole.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)].map(m => m[1]);
    const ids = [...whole.matchAll(/#([A-Za-z_][A-Za-z0-9_-]*)/g)].map(m => m[1]);
    targets.push(...cls, ...ids);
  }
  return targets;
}

const unique = xs => [...new Set(xs)];

/**
 * A structural clue, never visual approval: detects whether GSAP addresses
 * distinct concrete elements beyond typography and camera motion.
 */
export function auditRenderedActions(project) {
  const scenes = Array.isArray(project?.scenes) ? project.scenes : [];
  const issues = [];
  const entries = scenes.map((scene, idx) => {
    const html = String(scene.customScene?.html || '');
    const script = String(scene.customScene?.script || '');
    const animated = unique(selectorsInAnimations(script));
    const camera = animated.filter(isCamera);
    const text = animated.filter(isText);
    const nonCamera = animated.filter(s => !isCamera(s) && !isText(s));
    const subjectCandidates = nonCamera.filter(s => !isDecor(s));
    const light = (html.match(/<(?:linearGradient|radialGradient|filter|pattern)\b/g) || []).length;
    const svgPaths = (html.match(/<(?:path|polygon|ellipse|rect|circle)\b/g) || []).length;
    const visualMode = scene.direction?.visualMode || scene.visualMode || 'undetermined';
    const mechanismExpected = ['mechanism', 'narrative', 'documentary'].includes(visualMode)
      || scene.direction?.mechanismRequired === true;

    if (Number(scene.duration) >= 2.5 && !script.trim()) {
      issues.push({scene:scene.id || idx,code:'NO_CUSTOM_ANIMATION',severity:'warning',
        detail:'No hay script de animación; confirmar si la pausa visual es intencional.'});
    } else if (Number(scene.duration) >= 2.5 && !subjectCandidates.length) {
      issues.push({scene:scene.id || idx,code:'CAMERA_TEXT_ONLY',severity:mechanismExpected?'error':'warning',
        detail:'No se detectan selectores animados de sujetos u objetos fuera de cámara y texto. Comprobar el mecanismo en fotogramas; GSAP dinámico no detectado puede ser válido.'});
    } else if (mechanismExpected && subjectCandidates.length === 1) {
      issues.push({scene:scene.id || idx,code:'SINGLE_OBJECT_MOTION',severity:'warning',
        detail:'Solo un elemento físico distinto aparece en GSAP; comprobar contacto, reacción y estado final.'});
    }
    if (camera.length && !subjectCandidates.length) {
      issues.push({scene:scene.id || idx,code:'ZOOM_IS_NOT_ACTION',severity:'warning',
        detail:'Cámara animada sin evidencia programática de una acción del sujeto.'});
    }
    return {
      id:scene.id || String(idx),title:scene.title || '',duration:scene.duration,
      visualMode,subjectCandidates,animatedCamera:camera,animatedText:text,
      physicalSelectors:nonCamera,svgPrimitives:svgPaths,materialEffects:light,
      hasParallaxLayers:['L-bg','L-mid','L-fg'].every(x => camera.includes(x)),
      note:'Conteos orientativos; revisar MP4 al inicio, contacto y reacción sin subtítulos.',
    };
  });
  const referencePromisesDepth = /fondos?[^.]{0,70}estratific|parallax|capas[^.]{0,50}profundidad|2\.5D|profundidad/i
    .test(String(project.creativeBrief || ''));
  const depthEligible = entries.filter(s => s.duration >= 4 &&
    ['narrative', 'documentary', 'mechanism'].includes(s.visualMode));
  const underLayered = depthEligible.filter(s => s.animatedCamera.length < 2);
  if (referencePromisesDepth && depthEligible.length >= 4 &&
      underLayered.length / depthEligible.length >= .7) {
    issues.push({scene:'(proyecto)',code:'REFERENCE_DEPTH_MISMATCH',severity:'error',
      detail:'El brief promete fondos estratificados/profundidad, pero '+underLayered.length+
      ' de '+depthEligible.length+' escenas narrativas o mecánicas no animan más de una capa de cámara. Verificar si se construyeron capas reales; no sustituir con un zoom único.'});
  }
  return {version:'motion-studio.action-evidence/2.30',scenes:entries,issues,
    pass:!issues.some(x=>x.severity==='error'),visualApproved:false};
}

const invokedAsCli = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(self);
if (invokedAsCli) {
  const input = process.argv[2];
  if (!input) {
    console.error('Uso: node scripts/audit-rendered-actions-2.30.mjs proyecto.json [--strict]');
    process.exit(2);
  }
  const result = auditRenderedActions(JSON.parse(fs.readFileSync(input,'utf8')));
  if (process.argv.includes('--strict')) {
    for(const issue of result.issues) {
      if(issue.code==='CAMERA_TEXT_ONLY') issue.severity='error';
    }
    result.pass=!result.issues.some(x=>x.severity==='error');
  }
  console.log(JSON.stringify(result,null,2));
  process.exitCode=result.pass?0:1;
}
