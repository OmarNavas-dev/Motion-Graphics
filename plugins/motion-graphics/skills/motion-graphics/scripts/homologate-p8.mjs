#!/usr/bin/env node
// P8 on the installed plugin: verify every complete JSON using the exact Studio contract.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildP8CapabilityFixture} from './compat/src/final-homologation-p8.mjs';
import {validateProject} from './compat/server-utils.mjs';

export async function validateP8PluginCatalog({out}={}){
 const manifest=JSON.parse(await fs.readFile(new URL('./compat/docs/reference-parity.json',import.meta.url),'utf8'));
 if(manifest.capabilities.length!==33||new Set(manifest.capabilities.map(c=>c.id)).size!==33)
  throw Error('P8: el inventario debe tener 33 capacidades únicas.');
 const results=[];
 if(out)await fs.mkdir(out,{recursive:true});
 for(const capability of manifest.capabilities){
  const fixture=buildP8CapabilityFixture(capability),json=validateProject(fixture.project);
  if(JSON.stringify(validateProject(json))!==JSON.stringify(json))throw Error('P8: JSON no es idempotente: '+capability.id);
  if(!Array.isArray(json.scenes)||json.scenes.length===0)throw Error('P8: sin escenas: '+capability.id);
  if(out)await fs.writeFile(path.join(out,capability.id+'.json'),JSON.stringify(json,null,2));
  results.push({id:capability.id,source:capability.source,status:capability.status,
   fixtureKind:fixture.fixtureKind,scenes:json.scenes.length,jsonValidated:true,referenceEquivalence:false});
 }
 return {checked:33,validJson:results.length,sourceParityCertified:false,results};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const args=process.argv.slice(2),index=args.indexOf('--out');
  const report=await validateP8PluginCatalog({out:index<0?undefined:path.resolve(args[index+1])});
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
 }catch(error){console.error(error.message);process.exitCode=1;}
}
