#!/usr/bin/env node
// P7: produces a reviewable provider request without sending data or charging credits.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {planExternalRequest} from './compat/src/external-adapters-p7.mjs';
export function generateExternalRequest(raw){return planExternalRequest(raw);}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2),index=args.indexOf('--input');
  if(index<0||!args[index+1])throw Error('Uso: node scripts/plan-external-request.mjs --input request.json [--output plan.json]');
  const plan=generateExternalRequest(JSON.parse(fs.readFileSync(args[index+1],'utf8')));
  const out=args.indexOf('--output'),json=JSON.stringify(plan,null,2)+'\n';
  if(out>=0&&args[out+1]){fs.writeFileSync(args[out+1],json);console.log('P7: plan revisable · '+args[out+1]);}
  else process.stdout.write(json);
 }catch(error){console.error(error.message);process.exitCode=1;}
}
