#!/usr/bin/env node
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {validateProject} from './compat/server-utils.mjs';
import {brollAudit} from './broll-timeline.mjs';

export function verifyBrollProject(project) {
  const normalized=validateProject(project);
  return {passed:true,contract:'motion-studio.broll/1',audit:brollAudit(normalized),
    clips:normalized.broll,renderers:['HyperFrames MP4 con composición','Remotion MP4',
      'TransparentBroll ProRes 4444 MOV alfa']};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!process.argv[2]) throw Error('Uso: node validate-broll.mjs proyecto.json');
    const value=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
    const report=verifyBrollProject(value.project ?? value);
    console.log(JSON.stringify(report,null,2));
  } catch(error){console.error('P2: '+error.message);process.exitCode=1;}
}
