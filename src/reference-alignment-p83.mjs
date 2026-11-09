// P8.3: evidence-based comparison of a supplied reference video and rendered MP4.
// Metrics describe color, detail and composition; they are NOT style-parity scores.
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {finished} from 'node:stream/promises';
import {promisify} from 'node:util';
const run=promisify(execFile);
const n=v=>+v.toFixed(4);
const check=(ok,message)=>{if(!ok)throw Error('P8.3: '+message);};
const color=(pixels)=>{
 check(pixels?.length>=3&&pixels.length%3===0,'fotograma RGB incompleto.');
 let lum=0,sat=0,left=0,top=0,weight=0;
 const count=pixels.length/3,side=Math.sqrt(count),width=Math.round(side),height=count/width;
 check(Number.isInteger(height),'geometría RGB inválida.');
 for(let i=0;i<count;i++){
  const r=pixels[i*3],g=pixels[i*3+1],b=pixels[i*3+2],l=(.2126*r+.7152*g+.0722*b)/255;
  const contrast=Math.abs(l-.5);lum+=l;sat+=(Math.max(r,g,b)-Math.min(r,g,b))/255;
  const x=i%width,y=Math.floor(i/width);weight+=contrast;
  if(x<width/2)left+=contrast;
  if(y<height/2)top+=contrast;
 }
 return {luminance:n(lum/count),saturation:n(sat/count),leftWeight:n(left/(weight||1)),
  topWeight:n(top/(weight||1)),contrastMass:n(weight/count)};
};
export function compareReferenceFrames(reference,rendered){
 check(reference?.length===rendered?.length&&reference?.length>=3,'fotogramas RGB del mismo tamaño requeridos.');
 const a=color(reference),b=color(rendered),changes={};
 for(const key of Object.keys(a))changes[key]=n(b[key]-a[key]);
 const issue=[];
 if(Math.abs(changes.luminance)>.18)issue.push({code:'BRIGHTNESS_MISMATCH',reference:a.luminance,rendered:b.luminance});
 if(Math.abs(changes.saturation)>.22)issue.push({code:'SATURATION_MISMATCH',reference:a.saturation,rendered:b.saturation});
 if(Math.abs(changes.leftWeight)>.22||Math.abs(changes.topWeight)>.22)
  issue.push({code:'COMPOSITION_WEIGHT_MISMATCH',reference:{left:a.leftWeight,top:a.topWeight},rendered:{left:b.leftWeight,top:b.topWeight}});
 return {reference:a,rendered:b,deltas:changes,issues:issue,
  disclaimer:'Indicadores cromáticos/compositivos, no una puntuación de similitud perceptual ni aprobación artística.'};
}
export function planReferenceReview(project,samples,{referenceHash,renderHash}={}){
 check(Array.isArray(project?.scenes)&&project.scenes.length>0,'proyecto sin escenas.');
 check(Array.isArray(samples)&&samples.length>0,'no hay capturas comparables.');
 check(typeof referenceHash==='string'&&referenceHash.length===64&&typeof renderHash==='string'&&renderHash.length===64,'faltan hashes de videos reales.');
 const duration=project.scenes.reduce((sum,s)=>sum+s.duration,0);let start=0;
 const scenes=project.scenes.map(scene=>{
  const end=start+scene.duration,matching=samples.filter(s=>s.seconds>=start&&s.seconds<end),currentStart=start;
  start=end;
  const issues=matching.flatMap(s=>s.comparison.issues.map(i=>({...i,seconds:s.seconds})));
  return {sceneId:scene.id,start:currentStart,end,samples:matching.length,issues,
   action:issues.length?'Inspeccionar los pares de fotogramas señalados; ajustar composición/color solo con aprobación y volver a renderizar.':'Sin alertas métricas; revisar la escena visualmente.'};
 });
 check(start===duration,'duración inconsistente.');
 return {schema:'motion-studio.reference-comparison/1',referenceHash,renderHash,duration,scenes,
  approval:'PENDING_HUMAN_REVIEW',automaticSceneEdits:[],
  limitation:'La comparación no transfiere ni replica una identidad visual; requiere referencia autorizada, valoración humana y render posterior.'};
}
const image=async(file,seconds)=>{
 const {stdout}=await run('ffmpeg',['-v','error','-ss',String(seconds),'-i',file,'-frames:v','1','-vf','scale=32:32,format=rgb24','-f','rawvideo','-'],
  {encoding:'buffer',maxBuffer:1024*1024,timeout:20000,windowsHide:true});
 check(stdout.length===32*32*3,'FFmpeg no devolvió un fotograma RGB.');return stdout;
};
const probe=async(file)=>{
 const {stdout}=await run('ffprobe',['-v','error','-show_entries','format=duration','-of','json',file],{timeout:10000,windowsHide:true});
 const duration=Number(JSON.parse(stdout).format?.duration);
 check(Number.isFinite(duration)&&duration>0,'video sin duración verificable.');return duration;
};
export async function compareReferenceVideos(project,reference,rendered,{framesPerScene=3}={}){
 check(Number.isInteger(framesPerScene)&&framesPerScene>=1&&framesPerScene<=5,'muestras por escena fuera de rango.');
 const [referenceDuration,renderDuration]=await Promise.all([probe(reference),probe(rendered)]);
 const projectDuration=project.scenes.reduce((sum,s)=>sum+s.duration,0);
 check(Math.abs(projectDuration-renderDuration)<=Math.max(.1,projectDuration*.02),'el video renderizado no coincide con la duración del JSON.');
 let start=0;const samples=[];
 for(const scene of project.scenes){
  for(let i=0;i<framesPerScene;i++){
   const seconds=Math.min(renderDuration-.01,start+scene.duration*(i+.5)/framesPerScene);
   const refSeconds=seconds/projectDuration*referenceDuration;
   const [a,b]=await Promise.all([image(reference,refSeconds),image(rendered,seconds)]);
   samples.push({sceneId:scene.id,seconds:n(seconds),referenceSeconds:n(refSeconds),comparison:compareReferenceFrames(a,b)});
  }
  start+=scene.duration;
 }
 const digest=async file=>{const hash=createHash('sha256'),stream=createReadStream(file);
  stream.on('data',data=>hash.update(data));await finished(stream);return hash.digest('hex');};
 const [referenceHash,renderHash]=await Promise.all([digest(reference),digest(rendered)]);
 return {samples,report:planReferenceReview(project,samples,{referenceHash,renderHash}),
  sources:{referenceDuration,renderDuration,referenceHash,renderHash}};
}
