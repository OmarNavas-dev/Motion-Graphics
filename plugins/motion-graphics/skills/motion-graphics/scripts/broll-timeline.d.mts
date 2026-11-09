export type BrollObject = {id:string;type:'shape'|'image'|'text';x:number;y:number;width:number;height:number;
  color?:string;shape?:'rect'|'circle';asset?:string;text?:string;fontSize?:number};
export type BrollClip = {id:string;sceneId:string;at:number;duration:number;globalAt:number;
  kind:'overlay'|'cutaway';objects:BrollObject[];motion:'static'|'rise'|'zoom'|'slide-left';
  background?:string;narration?:{wordIndex:number;edge:'start'|'end';offset:number;phrase:string}};
export function normalizeBroll(raw:unknown,scenes:{id:string;duration:number}[],
  words?:{text:string;start:number;end:number}[]):BrollClip[];
export function brollAudit(project:{broll?:unknown;scenes:{id:string;duration:number}[];
  wordTimings?:{text:string;start:number;end:number}[]}):{clips:number;seconds:number;anchored:number;alphaSafe:boolean};
