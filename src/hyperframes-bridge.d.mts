import type {StudioProject, StudioScene} from './studio-schema';
export function exportHyperframesProject(project: StudioProject, only?: StudioScene,
  gsapSource?: string, embeddedAssets?: Record<string, string>): string;
export function exportHyperframesScene(project: StudioProject, scene: StudioScene,
  gsapSource?: string, embeddedAssets?: Record<string, string>): string;
