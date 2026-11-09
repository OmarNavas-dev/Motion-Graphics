import {readFileSync,writeFileSync} from 'node:fs';
import {repairCrossSceneIds} from './compat/src/scene-id-repair.mjs';

const [input,output]=process.argv.slice(2);
if(!input||!output||input===output){
 console.error('Uso: node scripts/repair-scene-ids.mjs entrada.json salida-corregida.json (no sobrescribe el original)');
 process.exitCode=2;
}else try {
 const project=JSON.parse(readFileSync(input,'utf8').replace(/^\uFEFF/,''));
 const original=project.project??project;
 const result=repairCrossSceneIds(original);
 const document=project.project?{...project,project:result.project}:result.project;
 writeFileSync(output,JSON.stringify(document,null,2)+'\n','utf8');
 console.log(JSON.stringify({repaired:result.repaired,changes:result.changes,warnings:result.warnings,output},null,2));
 if(result.warnings.length)process.exitCode=1;
}catch(error){console.error(error.message);process.exitCode=2;}
