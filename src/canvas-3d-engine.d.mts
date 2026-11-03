import type {VisualActionPlan} from './visual-action-planner.mjs';
export type VeniceDetail = 'foundation' | 'timber' | 'load' | 'tide' | 'mose' | 'city' | 'lagoon';
export type GeometryFace = {points: [number, number, number][]; color: string; tag: string};
export function buildVeniceGeometry(detail?: VeniceDetail | string, frame?: number,
  plan?: Partial<VisualActionPlan>, progress?: number): GeometryFace[];
export function drawVeniceFrame(ctx: CanvasRenderingContext2D, width: number, height: number,
  frame: number, detail?: VeniceDetail | string, showText?: boolean,
  plan?: Partial<VisualActionPlan>, progress?: number): void;
