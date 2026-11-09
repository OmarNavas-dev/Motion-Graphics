import type {AuthoredSpec, StudioProject} from './studio-schema';
export const STYLE_RECIPE_IDS:readonly string[];
export type ExecutableStyle={id:string;name:string;background:string;ink:string;accent:string;
  secondary:string;family:string;signature:string;motion:string;type:string;noText?:boolean};
export function getExecutableStyle(id:string):ExecutableStyle;
export function listExecutableStyles():ExecutableStyle[];
export function createStyleComposition(id:string,options?:{title?:string;duration?:number;format?:string;
  brandProfile?:StudioProject['brandProfile']}):AuthoredSpec;
