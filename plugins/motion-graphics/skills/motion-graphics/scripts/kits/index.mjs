// Punto unico de importacion de los kits de motion graphics (v1.6).
export * from './scene-kit.mjs';
export * from './materials-kit.mjs';
export * from './fx-kit.mjs';
export * from './camera-kit.mjs';
export * from './callouts-kit.mjs';
export * from './mechanism-kit.mjs';
export * from './character-kit.mjs';
export * from './contact-kit.mjs';
export * from './procedural-kit.mjs';
export * from './puppet-kit.mjs';
export * from './creature-kit.mjs';
export * from './science-kit.mjs';
export * from './illustration-kit.mjs';
export * from './story-kit.mjs';
// Complemento visual de Claude 2.1: preservamos ocean() del story-kit
// y exponemos el océano alternativo con nombre explícito.
export {skyCycle, ocean as sceneryOcean, oceanFront, boat, nave, cellRoom} from './scenery-kit.mjs';
export * from './props-kit.mjs';
export * from './hud-kit.mjs';
export * from './endcard-kit.mjs';
export * from './photo-kit.mjs';


