import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {exportHyperframesProject} from '../src/hyperframes-bridge.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspace = path.join(root, '.hyperframes', 'smoke-workspace');
const project = {
  name:'Prueba técnica Motion Studio', format:'vertical', resolution:'720p', fps:24,
  palette:'aurora', audioAsset:'', musicAsset:'', script:'', creativeBrief:'',
  style:'modern', visualEngine:'adaptive', showText:true, characterMode:'new',
  references:[], narrationMode:'single', voiceClips:[],
  scenes:[{id:'smoke', layout:'hero', duration:3, title:'PRUEBA TÉCNICA',
    subtitle:'Render local verificado', imageAsset:'', cues:[], approved:true}],
};
const gsap = await fs.readFile(path.join(root, 'public', 'hyperframes', 'gsap.min.js'), 'utf8');
await fs.mkdir(workspace, {recursive:true});
await fs.writeFile(path.join(workspace, 'index.html'), exportHyperframesProject(project, undefined, gsap, {}), 'utf8');
