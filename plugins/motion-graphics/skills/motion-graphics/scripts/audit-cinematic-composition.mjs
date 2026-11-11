import fs from 'node:fs';
import path from 'node:path';

const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const round = (value, precision = 2) => Number(value.toFixed(precision));
const text = value => typeof value === 'string' ? value.trim() : '';

function cameraSignature(scene) {
  const shots = scene.direction?.shots;
  const duration = number(scene.duration);
  if (!Array.isArray(shots) || shots.length !== 2 || duration <= 0) return null;
  return JSON.stringify(shots.map(shot => [
    text(shot.scale).toLowerCase(),
    round(number(shot.at) / duration),
    round(number(shot.duration) / duration),
    round(number(shot.x)),
    round(number(shot.y)),
  ]));
}

function captionSize(css) {
  const rule = css.match(/\.dvj-caption\s*\{([^}]*)\}/i)?.[1] || '';
  const shorthand = rule.match(/(?:^|;)\s*font\s*:\s*[^;]*?\s([\d.]+)px\s*\//i);
  const explicit = rule.match(/font-size\s*:\s*([\d.]+)px/i);
  const size = Number(explicit?.[1] || shorthand?.[1]);
  return Number.isFinite(size) && size > 0 ? size : null;
}

/**
 * Detects measurable authoring shortcuts, not aesthetic similarity.
 * A valid result still needs a rendered, subtitle-free visual review.
 */
export function auditCinematicComposition(project) {
  const scenes = Array.isArray(project?.scenes) ? project.scenes : [];
  const issues = [];
  const add = (scene, code, severity, message, repair) =>
    issues.push({scene, code, severity, message, repair});
  const signatures = new Map();
  const captionSizes = [];

  for (const scene of scenes) {
    const id = scene.id || '(sin id)';
    const duration = number(scene.duration);
    const actions = Array.isArray(scene.direction?.actions) ? scene.direction.actions : [];
    const formulaic = actions.filter(action =>
      /cambio verificable en|movimiento del elemento|animaci[oó]n de este objeto|se anima el elemento/i.test(text(action.description)));
    if (formulaic.length) {
      add(id, 'PLACEHOLDER_ACTION_DESCRIPTION', 'error',
        String(formulaic.length) + ' acciones usan descripciones intercambiables sin explicar el mecanismo propio.',
        'Redactar e implementar para cada acción causa, contacto, cambio geométrico o espacial y resultado observable.');
    }
    if (duration >= 5 && actions.length) {
      const latestEnd = Math.max(...actions.map(action => number(action.at) + number(action.duration)));
      if (latestEnd < duration * 0.55 && !text(scene.direction?.intentionalHoldReason)) {
        add(id, 'EARLY_ACTION_END', 'warning',
          'Las acciones documentadas terminan al ' + Math.round(latestEnd / duration * 100) + '% de la escena.',
          'Inspeccionar la segunda mitad sin subtítulos; completar la acción o justificar una pausa narrativa deliberada.');
      }
    }
    const sig = cameraSignature(scene);
    if (sig) signatures.set(sig, [...(signatures.get(sig) || []), id]);
    const size = captionSize(scene.customScene?.css || '');
    if (size !== null) captionSizes.push({id, size});
  }

  if (scenes.length >= 5) {
    const dominant = [...signatures.values()].sort((a, b) => b.length - a.length)[0] || [];
    if (dominant.length >= Math.max(4, Math.ceil(scenes.length * 0.60))) {
      const justified = dominant.every(id => {
        const scene = scenes.find(item => item.id === id);
        return text(scene?.direction?.cameraPatternJustification).length >= 32;
      });
      add('proyecto', 'REPEATED_CAMERA_TEMPLATE', justified ? 'warning' : 'error',
        String(dominant.length) + ' de ' + scenes.length + ' escenas repiten el mismo patrón de escalas, tiempos y desplazamientos de cámara.',
        'Diseñar encuadre, duración y recorrido según la acción de cada acontecimiento; si la repetición es expresiva, justificarla por escena y comprobarla en el MP4.');
    }
  }

  const small = captionSizes.filter(item => item.size < 40);
  if (captionSizes.length && small.length >= Math.ceil(captionSizes.length * 0.60)) {
    add('proyecto', 'SMALL_PROGRESSIVE_CAPTIONS', 'warning',
      String(small.length) + ' escenas usan subtítulos de menos de 40 px en el lienzo lógico vertical 720 px.',
      'Comparar legibilidad real con la referencia a tamaño de teléfono; ajustar escala y área segura sin invadir protagonistas.');
  }

  const errors = issues.filter(issue => issue.severity === 'error');
  return {
    schema: 'motion-studio.cinematic-composition-audit/1',
    pass: errors.length === 0,
    scenes: scenes.length,
    summary: {errors: errors.length, warnings: issues.length - errors.length},
    issues,
    limitations: 'Heurísticas de autoría; no detectan por sí solas recortes, anatomía, causalidad visible ni semejanza artística. Exigen fotogramas reales y revisión humana.',
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  try {
    const file = process.argv[2];
    if (!file) throw Error('Uso: node scripts/audit-cinematic-composition.mjs proyecto.json');
    const project = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    const report = auditCinematicComposition(project);
    console.log(JSON.stringify(report, null, 2));
    if (!report.pass) process.exitCode = 2;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
