export const SPECIALIZED_FLOW_IDS:readonly string[];
export type SpecializedFlow = {id:string;name:string;style:string;duration:number;beats:string[];guide:string;kind:string;export?:'mp4+gif';sourceGuide:string};
export function getSpecializedFlow(id:string):SpecializedFlow;
export function listSpecializedFlows():SpecializedFlow[];
export function verifySpecializedInputs(id:string,input?:Record<string,unknown>,demo?:boolean):Record<string,unknown>;
export function generateSpecializedProject(options:{workflow:string;data?:Record<string,unknown>;demo?:boolean;
 format?:'vertical'|'horizontal';duration?:number;compact?:boolean;brandProfile?:unknown}):import('./studio-schema').StudioProject;
