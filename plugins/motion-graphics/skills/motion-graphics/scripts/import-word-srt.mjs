import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export function importWordSrt(source,{duration}={}) {
 const stamp=s=>{const m=s.match(/^(\d{2,}):(\d{2}):(\d{2})[,.](\d{3})$/);if(!m)throw Error('Marca SRT invalida: '+s);return +m[1]*3600+ +m[2]*60+ +m[3]+ +m[4]/1000;};
 const blocks=source.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim().split(/\n\s*\n/),words=[];
 for(const [i,block] of blocks.entries()){
  const lines=block.trim().split('\n');if(/^\d+$/.test(lines[0]))lines.shift();
  const m=lines.shift()?.match(/^(\S+)\s+-->\s+(\S+)\s*$/);if(!m)throw Error('Bloque '+(i+1)+': faltan tiempos.');
  const start=stamp(m[1]),end=stamp(m[2]),text=lines.join(' ').replace(/<[^>]+>/g,'').trim();
  if(!text||/\s/.test(text))throw Error('Bloque '+(i+1)+': este SRT es por frase. No repartir frases para inventar tiempos de palabras.');
  if(start<0||end<=start||(words.length&&start<words.at(-1).end-.001))throw Error('Bloque '+(i+1)+': tiempos invalidos o superpuestos.');
  if(text.includes('\uFFFD'))throw Error('Texto con caracteres perdidos: volver a obtener el original UTF-8.');
  words.push({text,start,end});
 }
 if(!words.length)throw Error('SRT vacio.');
 if(duration!==undefined&&(!Number.isFinite(duration)||duration<words.at(-1).end-.001))throw Error('Palabras fuera de la duracion.');
 return {timeBase:'global',...(duration===undefined?{}:{duration}),source:{kind:'supplied-word-srt',sha256:crypto.createHash('sha256').update(source).digest('hex'),alignmentVerified:false},words};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){try{
 const [input,output,...args]=process.argv.slice(2);if(!output)throw Error('Uso: node import-word-srt.mjs palabras.srt palabras.json [--duration segundos]');
 if(fs.existsSync(output))throw Error('Destino existente; elegir otro.');
 const at=args.indexOf('--duration'),duration=at<0?undefined:Number(args[at+1]);
 const result=importWordSrt(fs.readFileSync(input,'utf8'),{duration});fs.writeFileSync(output,JSON.stringify(result,null,2),'utf8');
 console.log(result.words.length+' palabras importadas sin cambiar tiempos. No certifica alineacion contra audio.');
}catch(e){console.error(e.message);process.exitCode=1;}}

