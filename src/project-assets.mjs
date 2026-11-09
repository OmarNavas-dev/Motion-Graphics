// Lista compartida por validación, vista previa y exportaciones.
export const BUNDLED_FONT_FACES = [
  ['MS Anton', 'fonts/anton.woff2', 400, 'normal'],
  ['MS Playfair', 'fonts/playfair-800-italic.woff2', 800, 'italic'],
  ['MS Inter', 'fonts/inter-800.woff2', 800, 'normal'],
  ['MS Inter', 'fonts/inter-500.woff2', 500, 'normal'],
  ['MS Caveat', 'fonts/caveat-700.woff2', 700, 'normal'],
];
export function collectProjectAssets(project, {scenes = project.scenes ?? [], includeNarration = true, includeReferences = false} = {}) {
  const assets = new Set();
  const add = (asset) => { if (typeof asset === 'string' && asset) assets.add(asset); };
  add(project.fontAsset);
  if (includeNarration) {
    add(project.audioAsset); add(project.musicAsset);
    for (const clip of project.voiceClips ?? []) add(clip.asset);
  }
  if (includeReferences) for (const asset of project.references ?? []) add(asset);
  const sceneIds = new Set(scenes.map(scene => scene.id));
  if (project.workflow?.id === 'model-showdown' && scenes.length)
    for (const asset of project.workflow.media ?? []) add(asset);
  for (const clip of project.broll ?? []) if (sceneIds.has(clip.sceneId)) for (const obj of clip.objects ?? []) add(obj.asset);
  for (const scene of scenes) {
    add(scene.imageAsset); add(scene.videoAsset);
    for (const cue of scene.audioCues ?? []) add(cue.asset);
    for (const layer of scene.layers ?? []) add(layer.asset);
    for (const layer of scene.authored?.layers ?? []) { add(layer.asset); add(layer.fillAsset); }
  }
  return [...assets];
}
