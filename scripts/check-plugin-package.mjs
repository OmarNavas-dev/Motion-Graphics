#!/usr/bin/env node
// Audit the actual distributable plugin tree. CI cannot query a user's installed release;
// use --compare against a downloaded/extracted release before and after publishing.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {STYLE_PRESET_IDS, SOUND_KINDS} from '../src/motion-capabilities.mjs';
import {STYLE_IDS as AUTHOR_STYLES, SOUND_KINDS as AUTHOR_SOUNDS} from '../plugins/motion-graphics/skills/motion-graphics/scripts/validate-2-9-contract.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const defaultPlugin=path.join(root,'plugins/motion-graphics');
const guides={barty:['explainer-default','explainer-engaging','explainer-high-energy','motion-broll','object-separation','sound-effects'],
 whaley:['motion-design','review-loop','sound-design','web-sims'],
 jack:['claude-video-studio'],
 charlie:['animated-chart','apple-launch-film','brand-intake','launch-video','loop-cover','milestone-reveal',
  'model-showdown','motion-brief-writer','motion-effects','motion-prompt-writer','newsletter-promo','reel-export',
  'reference-to-motion','title-sequence-3d','vox-explainer']};
const guideFiles=Object.entries(guides).flatMap(([source,names])=>names.map(name=>`skills/motion-graphics/references/source-guides/${source}/${name}.md`));
const styleFiles=STYLE_PRESET_IDS.map(id=>`skills/motion-graphics/references/styles/${id}.md`);
const criticalFiles=[
 'plugin.json','.codex-plugin/plugin.json','skills/motion-graphics/SKILL.md',
 'skills/motion-graphics/references/contrato-compartido.md',
 'skills/motion-graphics/references/receta-profesional-v4.md',
 'skills/motion-graphics/references/storyboard-ejecutable-v3.md',
 'skills/motion-graphics/scripts/audit-storyboard-v3.mjs',
 'skills/motion-graphics/scripts/storyboard-art.mjs',
 'skills/motion-graphics/scripts/compile-storyboard.mjs',
 'skills/motion-graphics/scripts/audit-explainer-craft-v4.mjs',
 'skills/motion-graphics/scripts/gate-sequential-quality.mjs',
 'skills/motion-graphics/scripts/sample-pilot-v3.mjs',
 'skills/motion-graphics/scripts/video-evidence.mjs',
 'skills/motion-graphics/references/contrato-studio-2.9.md',
 'skills/motion-graphics/references/guias-originales-4-repos.md',
 'skills/motion-graphics/references/galeria-estilos-21.md',
 'skills/motion-graphics/scripts/validate-project.mjs',
 'skills/motion-graphics/scripts/validate-2-9-contract.mjs',
 'skills/motion-graphics/scripts/compat/src/motion-sequence.mjs',
 ...guideFiles,...styleFiles,
];
const sha=value=>createHash('sha256').update(value).digest('hex');
async function read(rootDir,relative){return fs.readFile(path.join(rootDir,relative));}
async function inventory(dir,prefix=''){
 const entries=await fs.readdir(path.join(dir,prefix),{withFileTypes:true}),out=[];
 for(const entry of entries){
  const rel=path.posix.join(prefix,entry.name);
  if(entry.isSymbolicLink())throw Error('Enlace simbólico no admitido en el paquete: '+rel);
  if(entry.isDirectory())out.push(...await inventory(dir,rel));
  else if(entry.isFile())out.push(rel);
 }
 return out.sort();
}
export async function inspectPluginPackage({pluginRoot=defaultPlugin,compareRoot}={}){
 const errors=[],files=await inventory(pluginRoot),fileSet=new Set(files);
 for(const rel of criticalFiles)if(!fileSet.has(rel))errors.push('Falta archivo esencial: '+rel);
 const parsed=async p=>JSON.parse((await read(pluginRoot,p)).toString('utf8'));
 let manifest,overlay;
 try{
  manifest=await parsed('plugin.json');overlay=await parsed('.codex-plugin/plugin.json');
  if(manifest.name!=='motion-graphics'||overlay.name!==manifest.name)errors.push('Identidad del complemento distinta.');
  if(!/^\d+\.\d+\.\d+$/.test(manifest.version)||manifest.version!==overlay.version)errors.push('Versiones de manifiestos desincronizadas.');
  if(!Array.isArray(manifest.extensions?.['com.openai']?.interface?.defaultPrompt)||
     JSON.stringify(manifest.extensions['com.openai'].interface.defaultPrompt)!==JSON.stringify(overlay.interface?.defaultPrompt))
   errors.push('defaultPrompt diferente entre manifiestos.');
  if(manifest.extensions?.['com.openai']?.interface?.displayName!==overlay.interface?.displayName)
   errors.push('Presentación del complemento diferente.');
 }catch(error){errors.push('Manifiesto inválido: '+error.message);}
 if(JSON.stringify([...AUTHOR_STYLES])!==JSON.stringify([...STYLE_PRESET_IDS]))
  errors.push('Los IDs de los 21 estilos difieren entre autoría y Motion Studio.');
 if(JSON.stringify([...AUTHOR_SOUNDS])!==JSON.stringify([...SOUND_KINDS]))
  errors.push('Los tipos de sonido difieren entre autoría y Motion Studio.');
 for(const rel of [...guideFiles,...styleFiles])if(fileSet.has(rel)){
  const bytes=(await read(pluginRoot,rel)).length;
  if(bytes<1400)errors.push('Referencia recortada o incompleta: '+rel+' ('+bytes+' bytes).');
 }
 for(const rel of ['skills/motion-graphics/SKILL.md','skills/motion-graphics/references/guias-originales-4-repos.md']){
  if(!fileSet.has(rel))continue;
  const md=(await read(pluginRoot,rel)).toString('utf8'),base=path.posix.dirname(rel);
  for(const match of md.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)){
   const dest=match[1];if(!dest.endsWith('.md')||/^[a-z]+:\/\//i.test(dest))continue;
   if(!fileSet.has(path.posix.normalize(path.posix.join(base,dest))))errors.push('Referencia local rota: '+rel+' → '+dest);
  }
 }
 const hashes=new Map();
 for(const rel of files)hashes.set(rel,sha(await read(pluginRoot,rel)));
 const packageHash=sha([...hashes].map(([rel,digest])=>rel+' '+digest).join('\n'));
 let comparison=null;
 if(compareRoot){
  const otherFiles=await inventory(compareRoot),otherSet=new Set(otherFiles),mismatches=[];
  for(const rel of files)if(!otherSet.has(rel))mismatches.push('Falta en instalado: '+rel);
  else if(sha(await read(compareRoot,rel))!==hashes.get(rel))mismatches.push('Contenido diferente: '+rel);
  for(const rel of otherFiles)if(!fileSet.has(rel))mismatches.push('Archivo extra en instalado: '+rel);
  errors.push(...mismatches);comparison={checked:true,mismatches};
 }
 return {passed:errors.length===0,version:manifest?.version??null,files:files.length,
  sourceGuides:guideFiles.length,styles:styleFiles.length,packageHash,comparison,errors};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const args=process.argv.slice(2),i=args.indexOf('--compare');
 const report=await inspectPluginPackage({compareRoot:i>=0?path.resolve(args[i+1]):undefined});
 console.log(JSON.stringify(report,null,2));
 if(!report.passed)process.exitCode=1;
}
