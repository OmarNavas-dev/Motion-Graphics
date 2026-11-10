import {compileSceneDirection} from './direction-compiler.mjs';
// Advisory, evidence-based checks of the storyboard against executable scene
// code. These findings are not a substitute for watching the rendered video.
const scriptText = scene => String(scene?.customScene?.script ?? '');
const cameraTarget = /(?:cam|camera|viewport|world|stage|viewbox|pan|zoom)/i;
const cameraMotion = /(?:\b(?:tl|gsap)\s*\.\s*(?:to|from|fromTo|set)\s*\(|\bsvgOrigin\b|\btransformOrigin\b)/;

export function auditVisualDirection(project) {
  const findings = [];
  const scenes = project?.scenes ?? [];
  const push = (scene, code, severity, message, evidence) =>
    findings.push({scene: scene.id ?? 'sin-id', code, severity, message, evidence});

  for (const [index, scene] of scenes.entries()) {
    const code = scriptText(scene);
    const shots = scene.direction?.shots ?? [];
    const actions = scene.direction?.actions ?? [];
    const html = String(scene.customScene?.html ?? '');
    const compiled=compileSceneDirection(scene);
    const timelineCamera = code.split(';').some(step => cameraTarget.test(step) && cameraMotion.test(step)) || compiled.cameraGenerated;
    // A declared 2.5D scene needs evidence of layered depth, not merely a zoom.
    const depthRequest = [project?.creativeBrief, project?.visualMode, scene.visualMode,
      scene.direction?.objective, scene.direction?.materials].filter(Boolean).join(' ');
    if (/2[.,]5\s*d|two-and-a-half\s*d/i.test(depthRequest) && html) {
      const depthValues = [...html.matchAll(/data-depth\s*=\s*["']([^"']+)["']/gi)]
        .map(match => match[1]);
      const uniqueDepths = new Set(depthValues);
      if (uniqueDepths.size < 3)
        push(scene, 'DEPTH_PLANES_MISSING', 'warning',
          'Escena declarada 2.5D sin tres planos diferenciados de profundidad.',
          'Planos data-depth distintos: ' + uniqueDepths.size + '; se esperan fondo, centro y frente.');
      const materialEvidence = /<(?:linearGradient|radialGradient|filter)\b|(?:drop-shadow|box-shadow|feGaussianBlur|feDropShadow)\s*\(/i.test(html + ' ' + String(scene.customScene?.css || ''));
      if (!materialEvidence)
        push(scene, 'MATERIAL_DEPTH_WEAK', 'warning',
          'No se detectan materiales o sombras que ayuden a describir el volumen.',
          'Sin gradientes SVG, filtros ni sombras CSS identificables.');
      const parallaxTargets = [...code.matchAll(/S\s*\+\s*["']\s*([.#][\w-]*(?:depth|layer|plane|parallax)[\w-]*)["']/gi)]
        .map(match => match[1]);
      if (new Set(parallaxTargets).size < 2)
        push(scene, 'PARALLAX_NOT_EXECUTED', 'warning',
          'Se declara profundidad 2.5D, pero GSAP no anima al menos dos planos de forma independiente.',
          'Planos animados identificados: ' + new Set(parallaxTargets).size + '; revisar la cámara y las capas.');
    }

    if (shots.length > 1 && !timelineCamera)
      push(scene, 'SHOT_PLAN_NOT_EXECUTED', 'warning',
        'La ficha propone varios encuadres, pero la animación no contiene un movimiento de cámara identificable.',
        `${shots.length} encuadres previstos; sin objetivo de cámara detectado en GSAP.`);
    if (actions.length && !code.trim() && compiled.actionsGenerated===0)
      push(scene, 'ACTIONS_WITHOUT_TIMELINE', 'warning',
        'Hay acciones planificadas, pero la escena no contiene una secuencia GSAP personalizada.',
        `${actions.length} acciones declaradas.`);
    if (html && !scene.direction?.objective)
      push(scene, 'MISSING_VISUAL_OBJECTIVE', 'info',
        'Falta definir qué debe entender el espectador al terminar la escena.',
        'Sin direction.objective.');

    const textLabels = [...html.matchAll(/<text\b[^>]*font-size\s*=\s*["']([\d.]+)["']/gi)]
      .map(match => Number(match[1]));
    if (textLabels.length >= 2 && textLabels.filter(size => size < 15).length / textLabels.length > 0.5)
      push(scene, 'SMALL_LABEL_RISK', 'info',
        'Predominan rótulos SVG pequeños; comprueba su legibilidad en una pantalla móvil.',
        `${textLabels.filter(size => size < 15).length}/${textLabels.length} rótulos menores de 15 unidades SVG.`);

    if (index < scenes.length - 1 && scene.transition === 'cut') {
      const next = scenes[index + 1];
      if (scene.direction?.transition && /raccord|continui|seguimien|mismo|match/i.test(scene.direction.transition))
        push(scene, 'CONTINUITY_ONLY_ON_PAPER', 'warning',
          'La dirección solicita continuidad visual, pero la transición implementada es un corte simple.',
          `Transición ${scene.id} → ${next.id ?? 'siguiente'}: cut.`);
    }
  }
  const duration = scenes.reduce((sum, scene) => sum + Number(scene.duration || 0), 0);
  if (duration > 0 && !project.audioAsset && !project.voiceClips?.length)
    findings.push({scene:'proyecto',code:'AUDIO_SYNC_NOT_TESTABLE',severity:'info',
      message:'No se puede demostrar la sincronización con narración porque el proyecto no contiene audio.',
      evidence:`Duración visual: ${duration.toFixed(2)} s.`});
  return {passed: true, findings, summary: {
    scenes:scenes.length, duration, warnings:findings.filter(f=>f.severity==='warning').length,
    informational:findings.filter(f=>f.severity==='info').length
  }};
}
