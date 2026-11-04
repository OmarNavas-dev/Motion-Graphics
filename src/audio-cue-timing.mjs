// Tiempos relativos a la escena; el Sequence padre aporta su inicio global.
export function audioCueFrames(cue, fps, sceneFrames) {
  const from = Math.max(0, Math.round((cue.at ?? 0) * fps));
  const durationInFrames = Math.min(sceneFrames - from, Math.max(1, Math.round((cue.duration ?? 1) * fps)));
  return durationInFrames > 0 ? {from, durationInFrames} : null;
}
