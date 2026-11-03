export type VisualConcept = {kind:'immune'|'finance'|'horror'|'technology'|'nature'|'learning'|'venice'|'ideas'; detail:string; label:string};
export type Identity = {background:string; ink:string; accent:string; secondary:string; soft:string; display:string};
export const identities: Record<string, Identity>;
export function chooseConcept(scene:{title?:string; subtitle?:string; scriptExcerpt?:string; visualQuery?:string;style?:string}, project?:{name?:string;script?:string;style?:string}):VisualConcept;
export function visualHeadline(text:string, limit?:number):string;
export function supportingLine(scene:{title?:string;subtitle?:string}):string;
