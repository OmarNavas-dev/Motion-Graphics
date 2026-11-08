import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateProject} from './compat/server-utils.mjs';
import {inspectExplainer} from './compat/src/explainer-contract.mjs';
export function checkExplainer(raw){const project=validateProject(raw.project??raw);return {warnings:inspectExplainer(project),visualApproval:false,audioAlignmentVerified:false};}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){try{const result=checkExplainer(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));console.log(JSON.stringify(result,null,2));if(process.argv.includes('--strict')&&result.warnings.length)process.exitCode=1;}catch(error){console.error(error.message);process.exitCode=1;}}
