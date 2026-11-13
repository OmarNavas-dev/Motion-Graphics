import fs from "node:fs/promises";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {validateProject as bundledValidate} from './compat/server-utils.mjs';
import {assembleScenes} from './assemble-scenes.mjs';
import {auditStoryboardV3} from './audit-storyboard-v3.mjs';
import {compileSceneArt} from './storyboard-art.mjs';

const ms=n=>Math.round(n*1000)/1000;
const audit=(storyboard,project)=>{
 const result=auditStoryboardV3(storyboard,project);
 if(!result.pass)throw Error(result.issues.filter(x=>x.severity==='error').map(x=>x.scene+': '+x.message).join('\n'));
};

export function compileStoryboard(storyboard,script,{words=[],fps=30,format='vertical',resolution='720p',validate=bundledValidate}={}){
 if(typeof script!=='string'||!script.trim())throw Error('Pega el guion antes de importar el storyboard.');
 if(!Array.isArray(words))throw Error('La transcripción debe contener una lista de palabras con tiempos globales.');
 if(![24,30].includes(fps))throw Error('El animatic admite 24 o 30 fps.');
 audit(storyboard);
 let cursor=0;
 const records=storyboard.scenes.map(scene=>{
  const start=ms(scene.start),end=ms(scene.end);
  if(start!==cursor||end<=start)throw Error(scene.id+': el animatic requiere escenas consecutivas con límites comunes al milisegundo.');
  cursor=end;
  const shots=storyboard.shots.filter(s=>s.sceneId===scene.id);
  const draft=scene.draft;
  const duration=ms(end-start);
  if(scene.art!==undefined && draft?.html?.trim())throw Error(scene.id+': elige art o draft para esta escena.');
  const authored=scene.art===undefined ? undefined : compileSceneArt(scene,duration);
  if(!authored && !draft?.html?.trim())throw Error(scene.id+': falta arte por piezas o el boceto SVG/HTML en draft.');
  const phases=shots.flatMap(s=>s.phases);
  if(authored && phases.some(phase=>phase.selector && !/^\.ms-part-[A-Za-z][\w-]*$/.test(phase.selector)))
   throw Error(scene.id+': las fases con arte por piezas deben apuntar a .ms-part-ID.');
  const actions=phases.filter(p=>p.selector&&p.kind!=='hold').map((p,i)=>({
   id:'accion-'+(i+1),at:ms(p.start-scene.start),duration:ms(p.end-p.start),
   selector:p.selector,description:p.change,result:p.change
  }));
  return {id:scene.id,duration,title:scene.title??scene.id,
   scriptExcerpt:shots.map(s=>s.narration??'').filter(Boolean).join(' '),transition:scene.transition??'cut',
   captionMode:words.length?'global':'none',...(authored ? {authored} : {customScene:draft}),
   direction:{objective:shots[0].visualPurpose,
    visualMode:scene.visualMode,actions,shots:shots.map(shot=>({
     at:ms(shot.start-scene.start),duration:ms(shot.end-shot.start),scale:shot.framing,
     target:shot.camera.target,purpose:shot.visualPurpose
    }))}};
 });
 if(cursor!==ms(storyboard.duration))throw Error('La última escena debe terminar en la duración declarada.');
 const project=assembleScenes({name:storyboard.title??'Animatic',script,format,resolution,fps,
  showText:words.length>0,audioAsset:'',references:[],wordTimings:words},records,{validate});
 audit(storyboard,project);
 return project;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
 try {
  const [storyboardPath, scriptPath, outPath, wordsPath]=process.argv.slice(2);
  if (!outPath) throw Error('Uso: node compile-storyboard.mjs storyboard.json guion.txt proyecto.json [palabras.json]');
  const read=async file=>(await fs.readFile(file,'utf8')).replace(/^\uFEFF/,'');
  const storyboard=JSON.parse(await read(storyboardPath));
  const wordFile=wordsPath ? JSON.parse(await read(wordsPath)) : [];
  const project=compileStoryboard(storyboard,await read(scriptPath),{
   words:wordFile.words??wordFile,fps:storyboard.fps??30,
  });
  await fs.writeFile(outPath,JSON.stringify(project,null,2)+'\n',{flag:'wx'});
 } catch (error) {
  console.error(error.message);
  process.exitCode=1;
 }
}
