#!/usr/bin/env node
// Explicit no-premature-release gate: all source capabilities must be verified or intentionally excluded.
import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function referenceParity({rootDir=root}={}){
 const data=JSON.parse(await fs.readFile(path.join(rootDir,'docs/reference-parity.json'),'utf8'));
 const counts={verified:0,partial:0,missing:0,external:0,notApplicable:0};
 const errors=[];
 for(const cap of data.capabilities){
  if(!['verified','partial','missing','external','notApplicable'].includes(cap.status))errors.push('Estado inválido: '+cap.id);
  counts[cap.status]=(counts[cap.status]||0)+1;
  for(const file of cap.evidence||[]){
   try{await fs.access(path.join(rootDir,file));}
   catch{errors.push(cap.id+': falta evidencia '+file);}
  }
  if(cap.status==='verified'&&!(cap.tests?.length))errors.push(cap.id+': no puede marcarse verificado sin pruebas.');
 }
 const ready=errors.length===0&&data.capabilities.every(c=>['verified','notApplicable'].includes(c.status));
 return {readyForUserAcceptance:ready,counts,total:data.capabilities.length,errors,
   unresolved:data.capabilities.filter(c=>!['verified','notApplicable'].includes(c.status)).map(c=>({source:c.source,id:c.id,status:c.status,blocker:c.blocker}))};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const report=await referenceParity();
 console.log(JSON.stringify(report,null,2));
 if(process.argv.includes('--strict')&&!report.readyForUserAcceptance||report.errors.length)process.exitCode=1;
}
