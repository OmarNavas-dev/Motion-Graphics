import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {validateProject} from '../server-utils.mjs';
import {exportHyperframesProject} from '../src/hyperframes-bridge.mjs';

const root=path.resolve(import.meta.dirname,'..');
const source=path.join(root,'plugins/motion-graphics');
const skill=path.join(source,'skills/motion-graphics');
const shared=['server-utils.mjs','src/external-adapters-p7.mjs','src/audio-simulation-p6.mjs','src/broll-timeline.mjs','src/style-recipes.mjs','src/specialized-workflows.mjs','src/character-motion.mjs','src/explainer-contract.mjs','src/motion-sequence.mjs','src/scene-limits.mjs','src/visual-action-planner.mjs','src/caption-compat.mjs','src/motion-capabilities.mjs','scripts/render-browser.mjs','scripts/observe-motion.mjs'];
const canonical=text=>text.replace(/\r\n/g,'\n').trimEnd();
const hash=value=>createHash('sha256').update(value).digest('hex');

export async function checkMotionEcosystem({out,runtime=false,sync=false}={}) {
 const report={technicalContractPassed:false,runtimePassed:false,visualApproval:false,videoVerified:false,shared:[],cases:[],errors:[]};
 try {
  // The Studio checkout owns compatibility code; the plugin ships verified copies.
  for(const file of shared){
   const original=await fs.readFile(path.join(root,file),'utf8'),destination=path.join(skill,'scripts/compat',file);
   if(sync){await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,original);}
   const bundled=await fs.readFile(destination,'utf8');
   assert.equal(canonical(bundled),canonical(original),'Complemento desincronizado: '+file+'; ejecutar test:ecosystem -- --sync antes de empaquetar.');
   report.shared.push({path:file,sha256:hash(canonical(original))});
  }
  const load=relative=>import(pathToFileURL(path.join(skill,relative)).href);
  const {assembleScenes}=await load('scripts/assemble-scenes.mjs');
  const {validateProject:pluginValidate}=await load('scripts/compat/server-utils.mjs');
  const {addCaptions}=await load('scripts/add-captions.mjs');
  const {default:scenes,projectBase}=await load('examples/elasticidad-explicativa.mjs');
  const {default:inventors,projectBase:inventorsBase}=await load('examples/inventores-sellado.mjs');
  const {project:transversal}=await load('tests/fixtures/movimiento-transversal.mjs');
  const geometry=assembleScenes(projectBase,scenes);
  const words={timeBase:'global',duration:2,words:[{text:'El',start:.1,end:.3},{text:'aire',start:.4,end:.7,box:true},{text:'protege.',start:1.1,end:1.5}]};
  const narration=addCaptions({name:'Contrato de subtítulos',showText:true,fps:30,scenes:[{id:'words',duration:2,customScene:{html:'<svg viewBox="0 0 720 1280"><circle cx="360" cy="700" r="80"/></svg>',css:'',script:''}}]},words);
  const boundary=addCaptions({name:'Palabra cortada con remanente de 10 ms',showText:true,fps:24,scenes:[1,2].map(i=>({id:'boundary-'+i,duration:1,customScene:{html:'<svg viewBox="0 0 720 1280"><rect width="720" height="1280" fill="#173344"/></svg>',css:'',script:''}}))},{duration:2,words:[{text:'caja.',start:.8,end:1.01},{text:'Lo',start:1.01,end:1.6},{text:'que',start:1.6,end:1.8}]});
  boundary.scenes[1].customScene.script=boundary.scenes[1].customScene.script.replace('"hide":0','"hide":-0.01').replaceAll('Math.min(.14,Math.max(0,g.hide-a))','Math.min(.14,g.hide-a)');
  const inputs=[['continuidad-silenciosa',geometry],['palabras-30fps',narration],['personajes-contacto',assembleScenes(inventorsBase,inventors)],['palabra-cortada-legada',boundary],['movimiento-transversal',transversal]];
  const projects=[];
  const gsap=await fs.readFile(path.join(root,'public/hyperframes/gsap.min.js'),'utf8');
  if(out)await fs.mkdir(out,{recursive:true});
  for(const [name,raw]of inputs){
   const imported=validateProject(raw);
   assert.deepEqual(pluginValidate(raw),imported,'Importador y complemento normalizan distinto: '+name);
   const second=validateProject(imported);
   assert.deepEqual(second,imported,'El segundo guardado altera el proyecto: '+name);
   for(const [i,scene]of raw.scenes.entries())for(const key of ['html','css','script'])assert.equal(imported.scenes[i].customScene[key],scene.customScene[key],'Se alteró código de escena: '+name+'/'+key);
   assert.deepEqual(imported.actors??[],raw.actors??[],'Se perdieron actores: '+name);
   assert.deepEqual(imported.wordTimings??[],raw.wordTimings??[],'Se perdieron tiempos: '+name);
   const html=exportHyperframesProject(imported,undefined,gsap);
   assert.ok(html.includes('window.__timelines'));
   assert.ok(html.includes('const tl=gsap.timeline({paused:true})'));
   report.cases.push({name,scenes:imported.scenes.length,fps:imported.fps,duration:imported.scenes.reduce((n,s)=>n+s.duration,0),projectHash:hash(JSON.stringify(imported)),htmlHash:hash(html)});
   projects.push([name,imported]);
   if(out){await fs.writeFile(path.join(out,name+'.json'),JSON.stringify(imported,null,2));await fs.writeFile(path.join(out,name+'.html'),html);}
  }
  report.technicalContractPassed=true;
  if(runtime)for(const [name,imported]of projects){const {reviewExplainer}=await import('./review-explainer.mjs');const review=await reviewExplainer(imported,{root,outputDir:out?path.join(out,name+'-runtime'):undefined});if(!review.passed)throw Error(review.errors.join('\n'));}
  report.runtimePassed=runtime;
 }catch(error){report.errors.push(error.message);}
 if(out)await fs.writeFile(path.join(out,'ecosystem-report.json'),JSON.stringify(report,null,2));
 return report;
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const args=process.argv.slice(2),i=args.indexOf('--out');
 const report=await checkMotionEcosystem({out:i<0?undefined:path.resolve(args[i+1]),runtime:args.includes('--runtime'),sync:args.includes('--sync')});
 console.log(JSON.stringify(report,null,2));
 process.exitCode=report.technicalContractPassed&&(!args.includes('--runtime')||report.runtimePassed)?0:1;
}
