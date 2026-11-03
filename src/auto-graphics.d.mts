import type {MotionGraphic} from './studio-schema';
export function suggestMotionGraphics(options: {text?: string; script?: string;
  duration?: number; style?: string; showText?: boolean}): MotionGraphic[];
export function timedStoryboardBlocks(script: string, targetSeconds: number,
  audioMeasured?: boolean): {text: string; duration: number}[] | null;
