import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import fs from 'node:fs/promises';
import {plannerFixture} from './scripts/ai-planner-fixture.mjs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1',
  () => resolve(server.address().port)));
const stop = (server) => new Promise((resolve) => server.close(resolve));

test('endpoint Ollama: genera propuesta local sin token y conserva aprobación manual',
  {timeout: 25000}, async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'motion-ollama-route-'));
    const project = structuredClone(plannerFixture);
    project.script = 'El presupuesto total es de 1000 dólares.';
    let ollamaRequests = 0;
    const ollama = http.createServer(async (req, res) => {
      if (req.url === '/api/tags') {
        res.setHeader('Content-Type','application/json');
        res.end(JSON.stringify({models:[{name:'qwen2.5:1.5b',model:'qwen2.5:1.5b'}]}));
        return;
      }
      ollamaRequests++;
      assert.equal(req.url, '/api/chat');
      assert.equal(req.headers.authorization, undefined);
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      assert.equal(body.model, 'qwen2.5:1.5b');
      assert.equal(body.stream, false);
      assert.equal(body.format, 'json');
      assert.ok(body.options.num_predict <= 1800);
      assert.ok(body.options.num_ctx <= 4096);
      const plan = {style:'modern', creativeBrief:'Animación de datos local.',
        scenes:project.scenes.slice(0,2).map((scene,index)=>({index:index+1,title:`Visual ${index+1}`,
          subtitle:'',visualPlan:'Visual específico para el fragmento del guion.',visualQuery:'',
          layout:'data',style:'modern',motion:'push',motionStrength:30,transition:'cut',
          motionGraphics:index===0?[{kind:'counter',label:'TOTAL',value:1000,unit:'currency',at:.5}]:[]}))};
      res.setHeader('Content-Type','application/json');
      res.end(JSON.stringify({model:'qwen2.5:1.5b',message:{role:'assistant',content:JSON.stringify(plan)}}));
    });
    const ollamaPort = await listen(ollama);
    const portServer = http.createServer((_req,res)=>res.end('probe'));
    const appPort = await listen(portServer); await stop(portServer);
    const app = spawn(process.execPath,['server.mjs'],{cwd:root,
      env:{...process.env,MOTION_STUDIO_TEST_ROOT:temp,MOTION_STUDIO_PORT:String(appPort),
        OLLAMA_BASE_URL:`http://127.0.0.1:${ollamaPort}`},stdio:['ignore','pipe','pipe']});
    let log=''; app.stderr.on('data',(chunk)=>{log+=chunk.toString();});
    const address=`http://127.0.0.1:${appPort}`;
    try {
      let ready=false;
      for(let i=0;i<60;i++){try{if((await fetch(address+'/api/health')).ok){ready=true;break;}}catch{await delay(100);}}
      assert.ok(ready,log||'El servidor no respondió');
      const integrations=await(await fetch(address+'/api/integrations')).json();
      assert.equal(integrations.ollama.enabled,true);
      assert.equal(integrations.ollama.model,'qwen2.5:1.5b');
      const health=await fetch(address+'/api/ollama/check',{method:'POST'});
      const ollamaHealth=await health.json();
      assert.equal(ollamaHealth.ok,true);
      assert.equal(ollamaHealth.model,'qwen2.5:1.5b');
      const result=await fetch(address+'/api/ai/plan',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({project,provider:'ollama'})});
      assert.equal(result.status,200);
      const data=await result.json();
      assert.equal(data.provider,'Ollama · qwen2.5:1.5b');
      assert.equal(data.plan.scenes[0].motionGraphics[0].value,1000);
      assert.equal(ollamaRequests,1);
      const stillOriginal=await(await fetch(address+'/api/project')).json();
      assert.deepEqual(stillOriginal.project.scenes,[]);
    } finally {
      app.kill();
      await Promise.race([new Promise((resolve)=>app.once('exit',resolve)),delay(2500)]);
      await stop(ollama);
      await fs.rm(temp,{recursive:true,force:true});
    }
  });

test('endpoint real: propone, no revela claves y conserva el plan para aprobación manual',
  {timeout: 25000}, async () => {
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'motion-ai-route-'));
    const project = structuredClone(plannerFixture);
    project.script = 'El presupuesto total es de 1000 dólares.';
    let providerRequests = 0;
    const llm = http.createServer(async (req, res) => {
      providerRequests++;
      assert.equal(req.url, '/v1/chat/completions');
      assert.equal(req.headers.authorization, 'Bearer test-local-token');
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      assert.equal(body.messages[1].role, 'user');
      assert.equal(JSON.stringify(body).includes('user-assets/'), false);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Routed-Via', 'mock/free');
      res.end(JSON.stringify({choices: [{message: {content: JSON.stringify({
        style: 'modern', creativeBrief: 'Infografías animadas.',
        scenes: project.scenes.map((scene, index) => ({
          index: index + 1, title: `Visual ${index + 1}`, subtitle: '',
          visualQuery: 'presupuesto personal', layout: 'data', style: 'tech',
          motion: 'push', transition: 'fade', motionStrength: 35,
          motionGraphics: index === 0 ? [{kind: 'counter', label: 'TOTAL',
            value: 1000, unit: 'currency', at: 0.5}] : [],
        })),
      })}}]}));
    });
    const llmPort = await listen(llm);
    const portServer = http.createServer((_req, res) => res.end('probe'));
    const appPort = await listen(portServer);
    await stop(portServer);
    const app = spawn(process.execPath, ['server.mjs'], {cwd: root,
      env: {...process.env, MOTION_STUDIO_TEST_ROOT: temp,
        MOTION_STUDIO_PORT: String(appPort),
        FREELLMAPI_BASE_URL: `http://127.0.0.1:${llmPort}`,
        FREELLMAPI_API_KEY: 'test-local-token', FREELLMAPI_MODEL: 'auto'},
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let log = '';
    app.stderr.on('data', (chunk) => {log += chunk.toString();});
    const address = `http://127.0.0.1:${appPort}`;
    try {
      let ready = false;
      for (let i = 0; i < 60; i++) {
        try {
          const response = await fetch(address + '/api/health');
          if (response.ok) {ready = true; break;}
        } catch { await delay(100); }
      }
      assert.ok(ready, log || 'El servidor no respondió');
      const integrations = await (await fetch(address + '/api/integrations')).json();
      assert.equal(integrations.freeLLMApi.configured, true);
      assert.equal(JSON.stringify(integrations).includes('test-local-token'), false);
      const result = await fetch(address + '/api/ai/plan', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(project),
      });
      assert.equal(result.status, 200);
      const data = await result.json();
      assert.equal(data.provider, 'mock/free');
      assert.equal(data.plan.scenes.length, project.scenes.length);
      assert.equal(data.plan.scenes[0].title, 'Visual 1');
      assert.equal(data.plan.scenes[0].motionGraphics[0].value, 1000);
      assert.equal(providerRequests, 1);
      const stillOriginal = await (await fetch(address + '/api/project')).json();
      assert.deepEqual(stillOriginal.project.scenes, [],
        'La propuesta IA no debe guardarse automáticamente como proyecto local');
    } finally {
      app.kill();
      await Promise.race([new Promise((resolve) => app.once('exit', resolve)), delay(2500)]);
      await stop(llm);
      await fs.rm(temp, {recursive: true, force: true});
    }
  });
