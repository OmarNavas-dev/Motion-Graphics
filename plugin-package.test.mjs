import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {inspectPluginPackage} from './scripts/check-plugin-package.mjs';

test('el paquete y los contratos de autoría cubren las 26 guías y 21 estilos sin recortes',async()=>{
 const result=await inspectPluginPackage();
 assert.deepEqual(result.errors,[]);
 assert.equal(result.passed,true);
 assert.equal(result.version,'4.0.1');
 assert.equal(result.sourceGuides,26);
 assert.equal(result.styles,21);
});
test('una publicación con un archivo modificado se rechaza aunque mantenga la versión',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'motion-package-'));
 try{
  const source=path.resolve('plugins/motion-graphics'),dest=path.join(temp,'motion-graphics');
  await fs.cp(source,dest,{recursive:true});
  const same=await inspectPluginPackage({compareRoot:dest});
  assert.equal(same.passed,true);
  await fs.appendFile(path.join(dest,'skills/motion-graphics/SKILL.md'),'\nCambio accidental\n');
  const drift=await inspectPluginPackage({compareRoot:dest});
  assert.equal(drift.passed,false);
  assert.ok(drift.errors.some(x=>x.includes('Contenido diferente: skills/motion-graphics/SKILL.md')));
 }finally{await fs.rm(temp,{recursive:true,force:true});}
});
