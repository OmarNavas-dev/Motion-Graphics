import {readFileSync} from 'node:fs';
import {auditArtDirection} from './compat/src/art-direction-quality.mjs';
import {auditCinematicComposition} from './audit-cinematic-composition.mjs';
import {auditProjectPlanningSurface} from './audit-production-planning-2.31.mjs';
import {auditStoryboardV3} from './audit-storyboard-v3.mjs';

const file=process.argv[2];
if(!file){console.error('Uso: node scripts/audit-art-direction.mjs proyecto.json --storyboard storyboard.json [--reference-required]');process.exitCode=2;}
else try {
 const project=JSON.parse(readFileSync(file,'utf8').replace(/^\uFEFF/,''));
 const result=auditArtDirection(project,{requiresReferences:process.argv.includes('--reference-required')});
 const cinematic=auditCinematicComposition(project);
 const pos=process.argv.indexOf('--storyboard');
 const legacy=process.argv.includes('--legacy-2-31');
 const storyboard=pos>=0&&process.argv[pos+1]
   ?JSON.parse(readFileSync(process.argv[pos+1],'utf8').replace(/^\uFEFF/,'')):null;
 const planning=legacy?{pass:true,issues:auditProjectPlanningSurface(project).issues,schema:'legacy-2.31'}:auditStoryboardV3(storyboard,project);
 result.findings=[...(result.findings||[]),...cinematic.issues,...planning.issues];
 result.readyForVisualReview=Boolean(result.readyForVisualReview&&cinematic.pass&&planning.pass);
 result.summary={
   scenes:project.scenes?.length||0,
   errors:result.findings.filter(f=>f.severity==='error').length,
   warnings:result.findings.filter(f=>f.severity==='warning').length,
 };
 result.cinematicAudit=cinematic.schema;
 result.planningAudit=planning.schema;
 result.visualApproved=false;
 console.log(JSON.stringify(result,null,2));
 if(!result.readyForVisualReview)process.exitCode=1;
}catch(error){console.error(error.message);process.exitCode=2;}
