import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {reviewExplainer} from './review-explainer.mjs';
import {captionGlyphCoverage} from './caption-pixels.mjs';
const args=process.argv.slice(2),i=args.indexOf('--out');
if(!args[0]||!args[1]||i<0)throw Error('Uso: node scripts/verify-render-captions.mjs proyecto.json video.mp4 --out carpeta-nueva');
const out=path.resolve(args[i+1]),raw=JSON.parse(await fs.readFile(args[0],'utf8'));
const review=await reviewExplainer(raw.project??raw,{outputDir:out,capture:false,captionEvidence:true});
if(!review.passed)throw Error(review.errors.join('\n'));
const samples=review.captionSamples;
if(!samples.length)throw Error('No hay palabras temporizadas con pista de subtítulos para comparar.');
if(new Set(samples.map(s=>s.frame)).size!==samples.length)throw Error('Dos palabras requieren el mismo fotograma; revisar la cuantización de sus tiempos.');
const region=review.captionRegion,size=region.width*region.height;
function decode(args){
 const r=spawnSync('ffmpeg',['-v','error',...args,'-pix_fmt','gray','-f','rawvideo','-'],{windowsHide:true,maxBuffer:512*1024*1024,timeout:120000});
 if(r.status!==0)throw Error(r.stderr.toString());return r.stdout;
}
const reference=decode(['-framerate',String((raw.project??raw).fps||24),'-i',path.join(out,'caption-%04d.png')]);
// FFmpeg limits expression recursion; a flat sum of hundreds of words exceeds it.
const balancedSum=terms=>terms.length===1?terms[0]:'('+balancedSum(terms.slice(0,Math.ceil(terms.length/2)))+'+'+balancedSum(terms.slice(Math.ceil(terms.length/2)))+')';
const select=balancedSum(samples.map(s=>'eq(n\\,'+s.frame+')'));
const actual=decode(['-i',path.resolve(args[1]),'-vf',`select=${select},crop=${region.width}:${region.height}:${region.x}:${region.y}`,'-fps_mode','vfr']);
if(reference.length!==size*samples.length||actual.length!==reference.length)throw Error('Cantidad o dimensiones de fotogramas distintas de la evidencia.');
const words=samples.map((sample,i)=>{
 return {...sample,...captionGlyphCoverage(reference.subarray(i*size,(i+1)*size),actual.subarray(i*size,(i+1)*size),region.width,region.height)};
});
const report={passed:words.every(w=>w.passed),projectHash:review.projectHash,coveredWords:words.length,method:'Bidirectional highlighted glyph comparison at encoded frame time; adaptive luminance, 2 px raster tolerance, minimum coverage and precision 90%.',region,minimumCoverage:Math.min(...words.map(w=>w.coverage)),minimumPrecision:Math.min(...words.map(w=>w.precision)),mismatches:words.filter(w=>!w.passed),words};
await fs.writeFile(path.join(out,'caption-video-verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,words:undefined}));process.exitCode=report.passed?0:1;
