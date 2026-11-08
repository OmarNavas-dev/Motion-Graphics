// Generates an importable Motion Studio diagnostic project (16 distinct scenes).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {EFFECTS} from '../scripts/effect-recipes.mjs';
import {buildEffectScene} from '../scripts/kits/effects-16-kit.mjs';
import {assembleScenes} from '../scripts/assemble-scenes.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const scenes=EFFECTS.map((e,i)=>{
 const duration=i%3===0?2.7:i%3===1?2.4:2.6;
 const scene=buildEffectScene(e.id,{id:'fx-'+String(i+1).padStart(2,'0')+'-'+e.id,duration,label:['IDEA','CAMBIO','RESULTADO'][i%3]});
 scene.direction={objective:e.mechanism,shots:[{at:0,duration,purpose:e.mechanism,target:'.backplate',scale:'medium'}],
  before:{subject:e.from},after:{subject:e.to},
  actions:[{id:'action-'+i,at:.15,duration:duration*.7,selector:'.backplate',result:e.to}],
  continuity:e.mechanism};
 return scene;
});
const project=assembleScenes({name:'Laboratorio de 16 efectos',format:'vertical',fps:30,showText:false,scenes:[]},scenes);
const dest=process.argv[2]??path.join(here,'../assets/effects-16-validation.json');
fs.writeFileSync(dest,JSON.stringify(project,null,2));
console.log(`Generadas ${scenes.length} escenas, ${scenes.reduce((sum,s)=>sum+s.duration,0)} s: ${dest}`);
