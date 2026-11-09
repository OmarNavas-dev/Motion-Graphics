#!/usr/bin/env node
// P8 evidence ledger: validates all 33 complete JSONs and checks REAL artifact files.
// A playable example proves technical execution, not perceptual equivalence to third-party repos.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {validateProject} from '../server-utils.mjs';
import {validateProject as pluginValidate} from '../plugins/motion-graphics/skills/motion-graphics/scripts/compat/server-utils.mjs';
import {buildP8CapabilityFixture} from '../src/final-homologation-p8.mjs';
import {validateP8PluginCatalog} from '../plugins/motion-graphics/skills/motion-graphics/scripts/homologate-p8.mjs';
const exec=promisify(execFile),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
const suiteNames=['styles','workflows','characters','audio','broll'];
const suiteFile={styles:'report.json',workflows:'report.json',characters:'report.json',audio:'report.json',broll:'report.json'};
const fixtureSuite=(id,kind)=>kind==='specialized-direct'?'workflows':
 kind==='gallery-direct'?'styles':kind==='character-direct'?'characters':
 kind==='audio-simulation-direct'?'audio':kind==='broll-direct'?'broll':null;
const evidenceFiles=(kind,report,id)=>{
 if(kind==='specialized-direct')return [report.checks?.find(x=>x.id===id)?.file];
 if(kind==='gallery-direct')return (report.checks||[]).map(x=>x.file);
 if(kind==='character-direct')return (report.checks||[]).map(x=>x.clip);
 if(kind==='audio-simulation-direct')return (report.motion||[]).map(x=>x.clip);
 if(['motion-broll','transparent-ProRes-4444'].includes(id))return ['broll-alpha.mov','composite.mp4'];
 return [];
};
async function videoMetadata(file){
 const {stdout}=await exec('ffprobe',['-v','error','-show_entries','stream=codec_type,codec_name,width,height:format=duration','-of','json',file],
  {timeout:20000,windowsHide:true});
 const data=JSON.parse(stdout),video=data.streams?.find(s=>s.codec_type==='video');
 if(!video||!Number.isFinite(Number(data.format?.duration))||Number(data.format.duration)<=0)throw Error('P8: medio sin video o duración real: '+path.basename(file));
 return {codec:video.codec_name,duration:Number(data.format.duration),width:video.width,height:video.height,
  audio:data.streams.some(s=>s.codec_type==='audio')};
}
export async function finalHomologation({out=path.join(root,'out','p8-final'),evidenceDir,
  requireVideoArtifacts=false,strict=false}={}){
 const inventory=JSON.parse(await fs.readFile(path.join(root,'docs/reference-parity.json'),'utf8'));
 if(inventory.capabilities.length!==33||new Set(inventory.capabilities.map(c=>c.id)).size!==33)
  throw Error('P8: se esperan exactamente 33 casos únicos.');
 await fs.mkdir(path.join(out,'json'),{recursive:true});
 const plugin=await validateP8PluginCatalog();
 if(plugin.checked!==33)throw Error('P8: inventario del complemento incompleto.');
 const reports={};
 for(const name of suiteNames){
  const file=evidenceDir?path.join(evidenceDir,name,suiteFile[name]):'';
  try{const bytes=await fs.readFile(file);const parsed=JSON.parse(bytes);
   if(parsed.passed!==true)throw Error('No pasa la aceptación');
   reports[name]={path:file,data:parsed,sha256:sha(bytes)};
  }catch(error){if(requireVideoArtifacts)throw Error('P8: falta evidencia real '+name+': '+error.message);}
 }
 const results=[],mediaCache=new Map();
 for(const cap of inventory.capabilities){
  const fixture=buildP8CapabilityFixture(cap),project=validateProject(fixture.project);
  const pluginProject=pluginValidate(fixture.project);
  if(JSON.stringify(pluginProject)!==JSON.stringify(project)||JSON.stringify(validateProject(project))!==JSON.stringify(project))
   throw Error('P8: contratos divergentes: '+cap.id);
  const bytes=Buffer.from(JSON.stringify(project,null,2)+'\n');
  await fs.writeFile(path.join(out,'json',cap.id+'.json'),bytes);
  const suite=fixtureSuite(cap.id,fixture.fixtureKind),report=suite?reports[suite]:null;
  const clipNames=report?evidenceFiles(fixture.fixtureKind,report.data,cap.id):[];
  let media=[];
  if(report){
   if(!clipNames.length||clipNames.some(x=>!x))throw Error('P8: informe sin clips asociados '+cap.id);
   for(const filename of clipNames){
    if(!/^[a-zA-Z0-9_.-]+\.(?:mp4|mov)$/.test(filename))throw Error('P8: archivo de evidencia no permitido.');
    const file=path.join(evidenceDir,suite,filename);
    let meta=mediaCache.get(file);
    if(!meta){const stat=await fs.stat(file);if(stat.size<2000)throw Error('P8: archivo audiovisual vacío '+filename);
     meta={file:filename,bytes:stat.size,sha256:sha(await fs.readFile(file)),...await videoMetadata(file)};
     mediaCache.set(file,meta);}
    media.push(meta);
   }
  }
  const direct=media.length>0,strictHomologated=cap.status==='verified'&&direct;
  results.push({id:cap.id,source:cap.source,inventoryStatus:cap.status,fixtureKind:fixture.fixtureKind,
   json:{file:'json/'+cap.id+'.json',sha256:sha(bytes),scenes:project.scenes.length,valid:true,studioPluginParity:true},
   evidence:{level:direct?'direct-technical':'not-direct',suite:suite||null,
    reportSha256:report?.sha256??null,files:media},
   strictHomologated,blocker:strictHomologated?null:cap.blocker||'Falta prueba de equivalencia original.'});
 }
 const summary={cases:results.length,jsonValidated:results.filter(x=>x.json.valid).length,
  directTechnicalVideo:results.filter(x=>x.evidence.level==='direct-technical').length,
  strictHomologated:results.filter(x=>x.strictHomologated).length,
  unresolved:results.filter(x=>!x.strictHomologated).length,
  technicalEvidenceFiles:mediaCache.size};
 const ready=summary.cases===33&&summary.strictHomologated===33;
 const record={schemaVersion:1,project:'Motion Studio + Motion Graphics',commit:process.env.GITHUB_SHA||null,
  githubRunId:process.env.GITHUB_RUN_ID||null,readyForFullSourceParity:ready,visualApproval:false,
  summary,notes:['Los 33 JSON se validan y son importables, pero los proyectos de sustitución son pruebas de contrato, no implementación de cada capacidad original.',
   'Los archivos multimedia reales solo certifican ejecución técnica en las categorías que tienen un ejemplo directo.',
   'Las integraciones pagadas, los modelos externos y la equivalencia artística requieren evaluación adicional.'],cases:results};
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(record,null,2)+'\n');
 const rows=results.map(x=>`| ${x.id} | ${x.inventoryStatus} | ${x.json.valid?'JSON válido':'ERROR'} | ${x.evidence.level} | ${x.strictHomologated?'Sí':'No'} |`);
 await fs.writeFile(path.join(out,'MATRIZ-P8.md'),
  '# P8 · 33 capacidades y evidencia objetiva\n\n'+
  `**JSON validados:** ${summary.jsonValidated}/33. **Video técnico directo:** ${summary.directTechnicalVideo}/33. **Equivalencia estricta:** ${summary.strictHomologated}/33.\n\n`+
  '| Caso | Inventario | JSON | Video | Homologado |\n|---|---|---|---|---|\n'+rows.join('\n')+'\n\n'+
  'La matriz no sustituye revisión perceptual ni servicios externos pendientes.\n');
 if(strict&&!ready)throw Error(`P8: homologación estricta incompleta (${summary.strictHomologated}/33). Informe: ${out}`);
 return record;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),flag=k=>{const i=args.indexOf('--'+k);return i<0?undefined:args[i+1];};
 try{const report=await finalHomologation({out:flag('out')?path.resolve(flag('out')):undefined,
  evidenceDir:flag('evidence')?path.resolve(flag('evidence')):undefined,
  requireVideoArtifacts:args.includes('--require-video-artifacts'),strict:args.includes('--strict')});
  console.log(JSON.stringify({ready:report.readyForFullSourceParity,...report.summary},null,2));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
