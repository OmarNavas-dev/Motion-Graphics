// Static production audit for Motion Studio projects. No DOM or network required.
// This deliberately checks only selectors that can be resolved unambiguously.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

function collect(html) {
  const classes = new Set();
  const ids = new Set();
  for (const match of html.matchAll(/\bclass\s*=\s*["']([^"']+)["']/g))
    for (const name of match[1].trim().split(/\s+/)) classes.add(name);
  for (const match of html.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)) ids.add(match[1]);
  return { classes, ids };
}

function present(sel, index) {
  if (/^\.[\w-]+$/.test(sel)) return index.classes.has(sel.slice(1));
  if (/^#[\w-]+$/.test(sel)) return index.ids.has(sel.slice(1));
  return null; // Never guess the result of compound selectors without a DOM.
}

function scriptSelectors(script) {
  const found=[];
  // Direct GSAP target references, e.g. tl.to(S+' .rock',...) and selector lists.
  for (const m of script.matchAll(/\bS\s*\+\s*(["'`])\s+([^"'`]+)\1/g)) {
    for (const part of m[2].split(',')) {
      const target = part.trim();
      if (/^[.#][\w-]+$/.test(target)) found.push(target);
    }
  }
  return found;
}

export function auditProjectScenes(project) {
  const root=project?.project??project;
  const errors=[],warnings=[],sceneStats=[];
  const scenes=Array.isArray(root?.scenes)?root.scenes:[];
  for(const scene of scenes) {
    const html=scene.customScene?.html||'';
    const script=scene.customScene?.script||'';
    const index=collect(html);
    const selectors=new Set(scriptSelectors(script));
    for(const a of scene.direction?.actions??[]) if(a.selector) selectors.add(a.selector);
    for(const selector of selectors) {
      const exists=present(selector,index);
      if(exists===false) errors.push(`${scene.id}: selector ausente ${selector} (script o ficha de acción)`);
      if(exists===null) warnings.push(`${scene.id}: selector complejo ${selector}, requiere DOM`);
    }
    const actions=scene.direction?.actions||[];
    const empty=(v)=>!v||!Object.keys(v).length;
    if(scene.direction && (empty(scene.direction.before)||empty(scene.direction.after)))
      warnings.push(`${scene.id}: dirección sin estados antes/después; comprobar continuidad física`);
    if(scene.direction && actions.length===1 && (scene.direction.shots||[]).length===1)
      warnings.push(`${scene.id}: un único plano y acción; revisar si describe todos los cambios reales`);
    sceneStats.push({id:scene.id,selectors:selectors.size,svgGroups:(html.match(/<g\b/g)||[]).length,
      gsapCalls:(script.match(/\btl\.(?:fromTo|to|from|set)\(/g)||[]).length,
      actions:actions.length,shots:scene.direction?.shots?.length||0});
  }
  if(scenes.length>=4 && scenes.every(s=>Math.abs(s.duration-scenes[0].duration)<1e-6))
    warnings.push('Todas las escenas tienen igual duración; justificar su ritmo según las acciones y la voz');
  if(root?.narrationMode==='single'&&!root?.audioAsset)
    warnings.push('El proyecto declara narración pero no vincula audio: sincronización no verificable');
  return {ok:errors.length===0,errors,warnings,scenes:sceneStats};
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  try {
    const filename=process.argv[2];if(!filename)throw new Error('Uso: node scene-audit.mjs proyecto.json');
    const report=auditProjectScenes(JSON.parse(fs.readFileSync(filename,'utf8')));
    console.log(JSON.stringify(report,null,2));process.exitCode=report.ok?0:1;
  } catch(e){console.error(e.message);process.exitCode=1;}
}
