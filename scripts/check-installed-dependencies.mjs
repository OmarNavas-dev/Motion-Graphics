import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const missing=[];
for(const [name,version] of Object.entries({...manifest.dependencies,...manifest.devDependencies})){
 try{
  const actual=JSON.parse(fs.readFileSync(path.join(root,'node_modules',name,'package.json'),'utf8')).version;
  if(actual!==version)missing.push(name+': '+actual+' (se requiere '+version+')');
 }catch{missing.push(name+': ausente');}
}
if(missing.length){console.log('Dependencias por actualizar:\n'+missing.join('\n'));process.exitCode=1;}
