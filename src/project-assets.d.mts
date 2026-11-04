import type {StudioProject, StudioScene} from './studio-schema';
export function collectProjectAssets(project: StudioProject, options?: {scenes?: StudioScene[]; includeNarration?: boolean; includeReferences?: boolean}): string[];
