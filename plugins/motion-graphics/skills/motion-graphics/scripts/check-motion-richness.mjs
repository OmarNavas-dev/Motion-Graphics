// Resource inventory is diagnostic, never a grade or a minimum effect quota.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export function checkRichness(raw) {
 const project=raw.project??raw,rows=[];
 for(const scene of project.scenes??[]){
  const {html='',script=''}=scene.customScene??{},body=script.split('{const groups=')[0];
  const kits=[...new Set((html.match(/data-dvj-kits="([^"]*)"/)?.[1]??'').split(',').filter(Boolean))].sort();
  const issues=[];
  for(const action of scene.direction?.actions??[])if(!action.selector||!action.result)issues.push('Accion '+action.id+': falta selector o consecuencia verificable.');
  if(scene.direction&&!scene.direction.actions?.length&&!scene.direction.holdReason)issues.push('Falta una accion o una pausa justificada.');
  const recursos={materiales:/feTurbulence|<pattern/.test(html),camara:kits.includes('camera'),efectos:kits.includes('fx'),etiquetas:kits.includes('callouts')};
  rows.push({id:scene.id,kits,tweens:(body.match(/\btl\.(?:to|from|fromTo)\(/g)??[]).length,recursos,issues,
   checkpoints:(scene.direction?.actions??[]).reduce((n,a)=>n+(a.checkpoints?.length??0),0)});
 }
 return {scenes:rows,needsReview:rows.filter(r=>r.issues.length).length,notes:[
  'No se puntua la calidad contando tweens, texturas, efectos, camara o etiquetas. Un plano limpio o fijo puede ser correcto.',
  'Comprobar estados iniciales, accion, contacto y resultado en el navegador, incluida la busqueda hacia atras. Inspeccionar los fotogramas; estos datos no certifican acabado artistico.',
 ]};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 try{
  const args=process.argv.slice(2);if(!args[0])throw Error('Uso: node check-motion-richness.mjs proyecto.json [--strict]');
  const report=checkRichness(JSON.parse(fs.readFileSync(args[0],'utf8').replace(/^\uFEFF/,'')));
  console.log(JSON.stringify(report,null,2));
  if(args.includes('--strict')&&report.needsReview)process.exitCode=1;
 }catch(error){console.error(error.message);process.exitCode=1;}
}

