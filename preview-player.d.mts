import type {StudioProject} from './src/studio-schema';
export function buildPreviewHtml(project: StudioProject, gsapSource: string): string;
export function previewAssetMap(project: StudioProject): Record<string, string>;
