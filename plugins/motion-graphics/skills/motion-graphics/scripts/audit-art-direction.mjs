import {readFileSync} from 'node:fs';
import {auditArtDirection} from './compat/src/art-direction-quality.mjs';

const file=process.argv[2];
if(!file){console.error('Uso: node scripts/audit-art-direction.mjs proyecto.json [--reference-required]');process.exitCode=2;}
else try {
 const project=JSON.parse(readFileSync(file,'utf8').replace(/^\uFEFF/,''));
 const result=auditArtDirection(project,{requiresReferences:process.argv.includes('--reference-required')});
 console.log(JSON.stringify(result,null,2));
 if(!result.readyForVisualReview)process.exitCode=1;
}catch(error){console.error(error.message);process.exitCode=2;}
