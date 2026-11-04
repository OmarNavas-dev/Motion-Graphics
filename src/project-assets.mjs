// Lista compartida por validación, vista previa y exportaciones.
export function collectProjectAssets(project, {scenes = project.scenes ?? [], includeNarration = true, includeReferences = false} = {}) {
  const assets = new Set();
  const add = (asset) => { if (typeof asset === 'string' && asset) assets.add(asset); };
  add(project.fontAsset);
  if (includeNarration) {
    add(project.audioAsset); add(project.musicAsset);
    for (const clip of project.voiceClips ?? []) add(clip.asset);
  }
  if (includeReferences) for (const asset of project.references ?? []) add(asset);
  for (const scene of scenes) {
    add(scene.imageAsset); add(scene.videoAsset);
    for (const cue of scene.audioCues ?? []) add(cue.asset);
    for (const layer of scene.layers ?? []) add(layer.asset);
    for (const layer of scene.authored?.layers ?? []) { add(layer.asset); add(layer.fillAsset); }
  }
  return [...assets];
}
