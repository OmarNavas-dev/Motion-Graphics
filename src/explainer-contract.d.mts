import type {StudioProject, SceneDirection, ActorDefinition, WordTiming} from './studio-schema';
export function normalizeActors(raw: unknown): ActorDefinition[];
export function normalizeDirection(raw: unknown, duration: number): SceneDirection | undefined;
export function normalizeWordTimings(raw: unknown, total: number): WordTiming[];
export function parseWordSrt(source: string, total: number): WordTiming[];
export function wordsForScene(project: StudioProject, index: number): WordTiming[];
export function inspectExplainer(project: StudioProject): {scene:string;index:number;code:string;message:string}[];
