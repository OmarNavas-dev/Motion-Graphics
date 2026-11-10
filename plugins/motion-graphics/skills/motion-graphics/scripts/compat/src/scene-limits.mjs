// Shared by validation and the scene coder; no Node-only dependencies.
// Bounds allow detailed scenes while retaining caps against excessive payloads.
export const CUSTOM_SCENE_LIMITS = Object.freeze({html: 300000, css: 100000, script: 200000});
