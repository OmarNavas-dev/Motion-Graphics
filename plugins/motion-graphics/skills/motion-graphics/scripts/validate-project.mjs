import fs from 'node:fs';
import {checkEditorialOverlays} from './check-editorial-overlays.mjs';
import {checkNarrationBindings} from './compat/src/motion-sequence.mjs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {runtimeFindings} from './runtime-review-utils.mjs';
import {auditProjectScenes} from './scene-audit.mjs';
import {inspectExplainer} from './compat/src/explainer-contract.mjs';
import {checkCaptionStyle} from './check-caption-style.mjs';
import {pathToFileURL} from 'node:url';
import {validateProject as bundledValidate, projectByteLimit} from './compat/server-utils.mjs';

export async function checkProject(raw, {duration, repo, words, runtimeReport, requireNarration=false} = {}) {
  const p = raw.project ?? raw;
  const errors = [...checkCaptionStyle(raw, words), ...checkEditorialOverlays(p), ...checkNarrationBindings(p)];
  if(requireNarration)for(const scene of p.scenes??[])if(scene.direction?.actions?.length&&!scene.direction.actions.some(a=>a.narration))errors.push(scene.id+': falta anclar una accion principal a palabras reales.');
  const warnings = inspectExplainer(p).map(w=>`${w.scene}: ${w.message}`);
  const sceneAudit=auditProjectScenes(p);
  errors.push(...sceneAudit.errors);
  warnings.push(...sceneAudit.warnings);
  if(runtimeReport) {
    const findings=runtimeFindings(runtimeReport);errors.push(...findings.errors);warnings.push(...findings.warnings);
    const hash=crypto.createHash('sha256').update(JSON.stringify(p)).digest('hex');
    if(runtimeReport.projectHash!==hash) errors.push('La revision corresponde a otro JSON; volver a capturar el proyecto final.');
    if(!runtimeReport.runtimePassed || runtimeReport.errors?.length) errors.push('La revision de ejecucion tiene errores.');
    const covered=new Set((runtimeReport.samples??[]).map(s=>s.scene));
    if((p.scenes??[]).some(s=>!covered.has(s.id))) errors.push('La revision de ejecucion no cubre todas las escenas.');
    warnings.push('Informe de ejecucion comprobado; revisar sus imagenes. No certifica calidad artistica ni alineacion de voz.');
  } else warnings.push('Sin informe de ejecucion: no se comprobo la revision en navegador de este JSON.');
  const assert = (ok, message) => { if (!ok) errors.push(message); };
  assert(Array.isArray(p.scenes) && p.scenes.length > 0, 'Debe haber escenas.');
  let validate = bundledValidate;
  if (repo) ({validateProject: validate} = await import(pathToFileURL(path.resolve(repo, 'server-utils.mjs')).href));
  let normalized;
  try { normalized = validate(p); } catch (e) { errors.push(e.message); }
  const scenes = Array.isArray(p.scenes) ? p.scenes : [];
  assert(Buffer.byteLength(JSON.stringify(raw)) <= projectByteLimit(scenes.length), 'Proyecto supera el presupuesto de bytes.');
  const ids = new Set();
  for (const [i, s] of scenes.entries()) {
    const label = `Escena ${i + 1}`;
    assert(typeof s.id === 'string' && /^[a-zA-Z0-9_-]{1,45}$/.test(s.id) && !ids.has(s.id), `${label}: id invalido o repetido.`);
    ids.add(s.id);
    assert(Number.isFinite(s.duration) && s.duration >= .5 && s.duration <= 60, `${label}: duracion fuera de .5-60s.`);
    assert(!!s.customScene?.html?.trim(), `${label}: falta la escena completa customScene.html.`);
    assert((s.scriptExcerpt?.length ?? 0) <= 800, `${label}: guion supera 800 caracteres.`);
    assert((s.captions?.length ?? 0) === 0, `${label}: usar solo los titulos de customScene para evitar duplicados.`);
    if (s.customScene?.script) {
      try { new vm.Script(`(function(tl,S,T0,D,gsap){${s.customScene.script}\n})`); }
      catch (e) { errors.push(`${label}: sintaxis JS: ${e.message}`); }
    }
    if (normalized?.scenes[i]) {
      assert(normalized.scenes[i].duration === s.duration, `${label}: el importador cambiaria la duracion; usar milésimas.`);
      assert(normalized.scenes[i].customScene?.html === s.customScene?.html, `${label}: HTML no conservado por importador.`);
    }
  }
  const total = scenes.reduce((n, s) => n + (Number(s.duration) || 0), 0);
  const fps = p.fps === 30 ? 30 : 24;
  const framesDuration = scenes.reduce((n, s) => n + Math.round((Number(s.duration) || 0) * fps), 0) / fps;
  if (duration !== undefined) {
    assert(Number.isFinite(duration) && duration > 0, 'Duracion de audio invalida.');
    assert(Math.abs(total - duration) <= 1 / fps + .001, `Escenas ${total.toFixed(3)}s != audio ${duration}s.`);
    assert(Math.abs(framesDuration - duration) <= 1 / fps + .001, `Duracion por fotogramas ${framesDuration.toFixed(3)}s != audio ${duration}s.`);
  }
  if (!p.audioAsset) warnings.push('Audio no vinculado: seleccionar el archivo original en Motion Studio.');
  warnings.push('Estructura y sintaxis no verifican calidad visual ni sincronizacion semantica.');
  return {ok: errors.length === 0, scenes: scenes.length, duration: Number(total.toFixed(3)), framesDuration: Number(framesDuration.toFixed(3)), errors, warnings};
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const args = process.argv.slice(2);
    const opt = (flag) => {const i = args.indexOf(flag); return i < 0 ? undefined : args[i + 1];};
    if (!args[0]) throw new Error('Uso: node validate-project.mjs proyecto.json --words palabras.json [--duration segundos] [--repo carpeta]');
    const result = await checkProject(JSON.parse(fs.readFileSync(args[0], 'utf8').replace(/^\uFEFF/, '')), {
      requireNarration: args.includes('--require-narration'), duration: opt('--duration') === undefined ? undefined : Number(opt('--duration')), runtimeReport: opt('--runtime-report') ? JSON.parse(fs.readFileSync(opt('--runtime-report'),'utf8')) : undefined, repo: opt('--repo'), words: opt('--words') ? JSON.parse(fs.readFileSync(opt('--words'),'utf8').replace(/^\uFEFF/,'')) : undefined,
    });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}

