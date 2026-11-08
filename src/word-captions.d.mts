import type {WordTiming} from './studio-schema';
export function wordCaptionGroups(words:WordTiming[],start:number,duration:number):WordTiming[][];
export function wordCaptionTrack(words:WordTiming[],start:number,duration:number,key:string):{html:string;script:string};
export const WORD_CAPTION_CSS:string;
