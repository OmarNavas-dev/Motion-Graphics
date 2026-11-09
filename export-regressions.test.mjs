import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {collectProjectAssets} from './src/project-assets.mjs';
import {audioCueFrames} from './src/audio-cue-timing.mjs';
import {validateProject, validMediaSignature} from './server-utils.mjs';
import {previewAssetMap, buildPreviewHtml} from './preview-player.mjs';
import {exportHyperframesProject} from './src/hyperframes-bridge.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const asset = (n, ext) => `user-assets/00000000-0000-4000-8000-${String(n).padStart(12, '0')}.${ext}`;
const fixture = () => validateProject({name:'Persistencia', fps:30, fontAsset:asset(1,'otf'),
  audioAsset:asset(2,'wav'), musicAsset:asset(3,'mp3'), references:[asset(4,'png')],
  scenes:[{id:'first',duration:2,title:'Inicio'}, {id:'second',duration:3,title:'Final',
    audioCues:[{id:'effect',at:.5,duration:1,asset:asset(5,'wav'),volume:.3}]}]});

test('cada exportación y vista previa incluyen fuentes y efectos sin duplicados', () => {
  const project = fixture();
  project.scenes[0].imageAsset = asset(6,'png');
  project.scenes[1].imageAsset = asset(6,'png');
  project.scenes[0].layers = [{asset:asset(7,'png')}];
  project.scenes[0].authored = {layers:[{asset:asset(8,'png'),fillAsset:asset(9,'png')}]};
  const paths = collectProjectAssets(project);
  assert.equal(paths.filter((p) => p === asset(6,'png')).length, 1);
  for (const p of [asset(1,'otf'),asset(5,'wav'),asset(7,'png'),asset(8,'png'),asset(9,'png')]) assert.ok(paths.includes(p));
  assert.ok(!paths.includes(asset(4,'png')));
  assert.ok(collectProjectAssets(project,{includeReferences:true}).includes(asset(4,'png')));
  assert.deepEqual(Object.keys(previewAssetMap(project)),paths);
  const scenePaths = collectProjectAssets(project,{scenes:[project.scenes[1]],includeNarration:false});
  assert.ok(scenePaths.includes(project.fontAsset));
  assert.ok(scenePaths.includes(asset(5,'wav')));
  assert.ok(!scenePaths.includes(project.audioAsset));
});

test('HyperFrames temporiza el efecto en la segunda escena y conserva fuente OTF', () => {
  const project = fixture();
  const html = buildPreviewHtml(project,'/* gsap */');
  assert.match(html,/id="hf-scene-1-audio-0" data-start="2\.5(?:0*)"/);
  assert.ok(html.includes(`src="/${asset(5,'wav')}"`));
  assert.ok(html.includes(`src:url('/${asset(1,'otf')}') format('opentype')`));
  const embedded = Object.fromEntries(collectProjectAssets(project).map((p) => [p,`assets/${path.basename(p)}`]));
  const exported = exportHyperframesProject(project,undefined,'/* gsap */',embedded);
  assert.ok(exported.includes(`src="${embedded[asset(5,'wav')]}"`));
  project.scenes[1].customScene = {html:'<div>Escena propia</div>',css:'',script:''};
  assert.match(exportHyperframesProject(project,undefined,'',embedded),/id="hf-scene-1-audio-0"/);
});

test('efectos Remotion: inicio relativo, duración limitada y 24/30 FPS', () => {
  for (const fps of [24,30]) {
    assert.deepEqual(audioCueFrames({at:.5,duration:1},fps,3*fps),{from:fps/2,durationInFrames:fps});
    assert.deepEqual(audioCueFrames({at:2.5,duration:2},fps,3*fps),{from:2.5*fps,durationInFrames:fps/2});
    assert.equal(audioCueFrames({at:3,duration:1},fps,3*fps),null);
  }
});

test('firmas de fuentes: admite WOFF2/TTF/OTF y rechaza formatos falsos', () => {
  for (const [ext,hex] of [['.woff2','774f4632'],['.ttf','00010000'],['.otf','4f54544f']]) {
    assert.equal(validMediaSignature(Buffer.from(hex,'hex'),ext),true);
    assert.equal(validMediaSignature(Buffer.from('MZ fuente falsa'),ext),false);
    assert.equal(validMediaSignature(Buffer.alloc(2),ext),false);
  }
});

test('servidor real: GSAP, fuentes, reinicio con proyecto y arranque limpio con respaldo', {timeout:30000}, async () => {
  // Copia aislada: ejercita el arranque normal sin tocar data/ del usuario.
  const temp = await fs.mkdtemp(path.join(root,'.regression-'));
  assert.ok(path.resolve(temp).startsWith(path.resolve(root)+path.sep));
  let child;
  let address;
  const start = async (clean) => {
    const probe = http.createServer();
    await new Promise((resolve) => probe.listen(0,'127.0.0.1',resolve));
    const port = probe.address().port;
    await new Promise((resolve) => probe.close(resolve));
    const env = {...process.env,MOTION_STUDIO_PORT:String(port)};
    delete env.MOTION_STUDIO_TEST_ROOT;
    delete env.MOTION_STUDIO_START_CLEAN;
    if (clean) env.MOTION_STUDIO_START_CLEAN = 'true';
    child = spawn(process.execPath,['server.mjs'],{cwd:temp,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
    let logs='';
    child.stdout.on('data',(v) => {logs+=v;}); child.stderr.on('data',(v) => {logs+=v;});
    address = `http://127.0.0.1:${port}`;
    for (let i=0;i<100;i++) {
      try { if ((await fetch(address+'/api/health')).ok) return; } catch {}
      if (child.exitCode !== null) throw new Error(logs);
      await new Promise((resolve) => setTimeout(resolve,50));
    }
    throw new Error('No arrancó: '+logs);
  };
  const stop = async () => {
    if (!child || child.exitCode !== null) return;
    const exited = once(child,'exit'); child.kill(); await exited;
  };
  const json = async (route,method,body) => {
    const response = await fetch(address+route,{method,headers:{'Content-Type':'application/json'},body:body && JSON.stringify(body)});
    return {status:response.status,body:await response.json()};
  };
  try {
    for (const file of ['server.mjs','server-utils.mjs','preview-player.mjs','cloud-integrations.mjs','ai-planner.mjs','package.json','src','scripts','public']) {
      await fs.cp(path.join(root,file),path.join(temp,file),{recursive:true});
    }
    // The P1 source is deliberately shared with the bundled authoring plugin.
    const p1='plugins/motion-graphics/skills/motion-graphics/scripts/visual-iteration.mjs';
    await fs.mkdir(path.dirname(path.join(temp,p1)),{recursive:true});
    await fs.cp(path.join(root,p1),path.join(temp,p1));
    await start();
    const integrations=await json('/api/integrations','GET');
    assert.equal(integrations.status,200);
    assert.equal(integrations.body.paidApisEnabled,false);
    assert.equal(integrations.body.ollamaVision,undefined);
    const gsap = await fetch(address+'/hyperframes/gsap.min.js');
    assert.equal(gsap.status,200);
    assert.match(gsap.headers.get('content-type'),/javascript/);
    assert.equal(await gsap.text(),await fs.readFile(path.join(root,'public/hyperframes/gsap.min.js'),'utf8'));
    for (const name of ['anton.woff2','inter-500.woff2','inter-800.woff2','playfair-800-italic.woff2','caveat-700.woff2']) {
      const font=await fetch(address+'/fonts/'+name);
      assert.equal(font.status,200,name);
      assert.match(font.headers.get('content-type'),/font\/woff2/);
      assert.deepEqual(Buffer.from(await font.arrayBuffer()),await fs.readFile(path.join(root,'public/fonts',name)));
    }
    for (const [ext,header,mime] of [['woff2','774f4632','font/woff2'],['ttf','00010000','font/ttf'],['otf','4f54544f','font/otf']]) {
      const response = await fetch(address+`/api/assets?name=font.${ext}`,{method:'PUT',body:Buffer.from(header+'00'.repeat(20),'hex')});
      assert.equal(response.status,201);
      const {asset:uploaded} = await response.json();
      const file = await fetch(address+'/'+uploaded);
      assert.equal(file.headers.get('content-type'),mime);
    }
    const invalid = await fetch(address+'/api/assets?name=fake.ttf',{method:'PUT',body:Buffer.from('MZ')});
    assert.equal(invalid.status,400);
    const project = fixture();
    const autoWithoutVideo=await json('/api/iterations/auto','POST',{sourceJobId:'missing',project});
    assert.equal(autoWithoutVideo.status,404);
    const saved = await json('/api/project','PUT',project);
    assert.equal(saved.status,200);
    await stop(); await start();
    assert.deepEqual((await json('/api/project','GET')).body.project,saved.body.project);
    const approved = structuredClone(saved.body.project);
    approved.scenes.forEach((scene) => {scene.approved=true;});
    // Un recurso ausente debe bloquear antes de lanzar cualquier render.
    for (const p of collectProjectAssets(approved,{includeReferences:true})) {
      await fs.writeFile(path.join(temp,'public',p),'fixture');
    }
    await fs.unlink(path.join(temp,'public',asset(5,'wav')));
    const missingCue = await json('/api/render/hyperframes','POST',approved);
    assert.equal(missingCue.status,400);
    assert.match(missingCue.body.error,/000000000005\.wav/);
    await stop(); await start(true);
    assert.deepEqual((await json('/api/project','GET')).body.project.scenes,[]);
    const backups = (await fs.readdir(path.join(temp,'data'))).filter((p) => p.startsWith('studio-project-backup-'));
    assert.equal(backups.length,1);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(temp,'data',backups[0]),'utf8')),saved.body.project);
    assert.ok((await fs.readdir(path.join(temp,'public/user-assets'))).length >= 3);
  } finally {
    await stop();
    await fs.rm(temp,{recursive:true,force:true});
  }
});
