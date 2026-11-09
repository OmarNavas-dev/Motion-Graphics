import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {finalHomologation} from './scripts/final-homologation-p8.mjs';
import {validateP8PluginCatalog} from './plugins/motion-graphics/skills/motion-graphics/scripts/homologate-p8.mjs';
import {buildP8CapabilityFixture} from './src/final-homologation-p8.mjs';

test('P8: 33 casos generan JSON completo e importable en ambos sistemas',async()=>{
 const result=await validateP8PluginCatalog();
 assert.equal(result.checked,33);
 assert.equal(result.validJson,33);
 assert.equal(result.sourceParityCertified,false);
 assert.equal(new Set(result.results.map(c=>c.id)).size,33);
 assert.ok(result.results.every(c=>c.jsonValidated&&c.scenes>0));
});
test('P8: 33 informes trazables y sin homologación artística inventada',async()=>{
 const out=await mkdtemp(path.join(tmpdir(),'p8-audit-'));
 try{
  const report=await finalHomologation({out});
  assert.equal(report.summary.cases,33);
  assert.equal(report.summary.jsonValidated,33);
  assert.equal(report.readyForFullSourceParity,false);
  assert.equal(report.summary.directTechnicalVideo,0,'sin artefactos reales no hay video verificado');
  assert.equal(report.summary.strictHomologated,0,'sin artefactos no puede aprobarse ni el caso técnico alfa');
  assert.equal((await readdir(path.join(out,'json'))).filter(f=>f.endsWith('.json')).length,33);
  const disk=JSON.parse(await readFile(path.join(out,'report.json'),'utf8'));
  assert.equal(disk.cases.length,33);
  assert.ok(disk.cases.every(c=>c.json.studioPluginParity===true&&c.evidence.level==='not-direct'));
  await assert.rejects(finalHomologation({out,strict:true}),/homologación estricta incompleta/);
  await assert.rejects(finalHomologation({out,requireVideoArtifacts:true}),/falta evidencia real/);
 }finally{await rm(out,{recursive:true,force:true});}
});
test('P8: proveedor externo no se hace pasar por generador de video verificable',()=>{
 const fixture=buildP8CapabilityFixture({id:'Higgsfield-media'});
 assert.equal(fixture.fixtureKind,'contract-proxy');
 assert.equal(fixture.referenceEquivalence,false);
 assert.ok(fixture.project.scenes.length>0);
});
