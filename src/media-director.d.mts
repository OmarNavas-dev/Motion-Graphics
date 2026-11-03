import type {StudioProject, StudioScene, StyleName} from './studio-schema';
import type {VisualConcept} from './semantic-director.mjs';
export function directMediaScene(scene: StudioScene, project?: StudioProject): {
  style: StyleName;
  fit: 'contain' | 'cover';
  concept: VisualConcept;
  headline: string;
  showText: boolean;
};
export function assignReferenceImages(scenes: StudioScene[], references: string[]): StudioScene[];
