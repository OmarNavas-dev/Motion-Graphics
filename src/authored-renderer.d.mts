import type {AuthoredSpec} from './studio-schema';
export function renderAuthored(spec:AuthoredSpec, options?:{time?:number;duration?:number;width?:number;height?:number;showText?:boolean;assets?:Record<string,string>;theme?:Record<string,string>}):string;
