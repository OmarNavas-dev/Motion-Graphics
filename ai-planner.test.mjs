import assert from 'node:assert/strict';
import test from 'node:test';
import {plannerFixture} from './scripts/ai-planner-fixture.mjs';
import {
  aiPlannerConfig, numericEvidence, normalizeAiPlan,
  requestAiPlan, requestSceneCode, requestFullVideoCode, applyAiPlan,
} from './ai-planner.mjs';
import {validateProject, assertApproved} from './server-utils.mjs';

const finance = validateProject(plannerFixture);
const numericProject = {...finance, script:'Presupuesto: $1000 y el 20% para gastos.'};
const basic = () => ({
  style: 'modern', creativeBrief: 'Narración con datos claros y transiciones cuidadas.',
  scenes: finance.scenes.map((scene, index) => ({
    index: index + 1, title: `Escena ${index + 1}`, subtitle: 'Visual nuevo',
    visualQuery: 'un presupuesto sobre una mesa', layout: 'data', style: 'modern',
    motion: 'push', transition: 'fade', motionStrength: 30, motionGraphics: [],
  })),
});

test('completa escenas omitidas por Ollama con valores neutros y conserva las propuestas recibidas', async () => {
  let requestBody;
  const partial = {style:'modern', creativeBrief:'Propuesta parcial válida.', scenes:[{
    index:1, purpose:'hook', visualPlan:'La imagen aparece y avanza hacia cámara.', title:'Escena inicial',
    subtitle:'', visualQuery:'', layout:'hero', style:'modern', motion:'push',
    motionStrength:30, transition:'cut', captions:[], motionGraphics:[],
  }]};
  const answer = await requestAiPlan(finance, {provider:'ollama', env:{}, fetcher:async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({message:{content:JSON.stringify(partial)}}),
      {status:200,headers:{'Content-Type':'application/json'}});
  }});
  assert.equal(requestBody.options.num_predict,1800);
  assert.equal(answer.plan.scenes.length,finance.scenes.length);
  assert.equal(answer.plan.scenes[0].title,'Escena inicial');
  assert.equal(answer.plan.scenes[1].title,finance.scenes[1].title);
  assert.equal(answer.plan.scenes[1].motion,'auto');
});

test('configura Ollama local con Qwen2.5 sin clave y rechaza endpoints remotos', () => {
  const config = aiPlannerConfig({});
  assert.equal(config.ollamaConfigured, true);
  assert.equal(config.ollamaModel, 'qwen2.5:1.5b');
  assert.equal(config.ollamaEndpoint, 'http://127.0.0.1:11434/api/chat');
  assert.equal(aiPlannerConfig({OLLAMA_MODEL:'qwen2.5:3b'}).ollamaModel, 'qwen2.5:3b');
  assert.throws(() => aiPlannerConfig({OLLAMA_BASE_URL:'https://ollama.example.com'}), /HTTP local/);
  assert.throws(() => aiPlannerConfig({OLLAMA_BASE_URL:'http://192.168.1.4:11434'}), /HTTP local/);
  assert.equal(aiPlannerConfig({OLLAMA_ENABLED:'false'}).ollamaConfigured, false);
});

test('configura solamente HTTP local o HTTPS remoto, sin claves en URL', () => {
  assert.equal(aiPlannerConfig({FREELLMAPI_API_KEY: 'token'}).endpoint,
    'http://127.0.0.1:31415/v1/chat/completions');
  assert.equal(aiPlannerConfig({FREELLMAPI_API_KEY: 'token',
    FREELLMAPI_BASE_URL: 'https://ai.example.com/v1'}).endpoint,
  'https://ai.example.com/v1/chat/completions');
  assert.throws(() => aiPlannerConfig({FREELLMAPI_BASE_URL: 'http://example.com'}), /HTTPS/);
  assert.throws(() => aiPlannerConfig({FREELLMAPI_BASE_URL: 'http://localhost.evil.com'}), /HTTPS/);
  assert.throws(() => aiPlannerConfig({FREELLMAPI_BASE_URL: 'http://127.0.0.1:3001/x'}), /HTTPS/);
});

test('detecta números del guion y elimina marcas de tiempo', () => {
  const evidence = numericEvidence('(0:14) Quinientos dólares, $1,000, trescientos y 20%.');
  assert.equal(evidence.has(500), true);
  assert.equal(evidence.has(1000), true);
  assert.equal(evidence.has(300), true);
  assert.equal(evidence.has(20), true);
  assert.equal(evidence.has(14), false);
});

test('no admite datos monetarios inventados ni pasteles con sumas falsas', () => {
  const raw = basic();
  raw.scenes[0].motionGraphics = [
    {kind: 'counter', label: 'INVENTADO', value: 987654, unit: 'currency', at: 0.5},
    {kind: 'counter', label: 'PRESUPUESTO', value: 1000, unit: 'currency', at: 0.5},
    {kind: 'donut', label: 'PASTEL FALSO', value: 100, unit: 'percent', at: 0.5,
      segments: [{label: 'A', value: 50}, {label: 'B', value: 20}]},
  ];
  const plan = normalizeAiPlan(raw, numericProject);
  assert.equal(plan.scenes[0].motionGraphics.length, 1);
  assert.equal(plan.scenes[0].motionGraphics[0].value, 1000);
});

test('rechaza escenas reordenadas y con recuento incorrecto', () => {
  const raw = basic();
  raw.scenes[0].index = 2;
  assert.throws(() => normalizeAiPlan(raw, finance), /orden/);
  raw.scenes = [];
  assert.throws(() => normalizeAiPlan(raw, finance), /exactamente una propuesta/);
});

test('aplicar la propuesta conserva duración, medios, personajes, audios y desbloqueo manual', () => {
  const project = structuredClone(finance);
  project.scenes[0].approved = true;
  project.scenes[0].imageAsset = 'user-assets/00000000-0000-4000-8000-000000000000.png';
  project.references = ['user-assets/00000000-0000-4000-8000-000000000000.png'];
  const proposal = basic();
  proposal.scenes[0].visualPlan = 'Un recibo se abre y los gastos se desplazan en tres capas.';
  const plan = normalizeAiPlan(proposal, project);
  const changed = applyAiPlan(project, plan);
  assert.deepEqual(changed.scenes.map((s) => s.duration), project.scenes.map((s) => s.duration));
  assert.deepEqual(changed.references, project.references);
  assert.equal(changed.scenes[0].imageAsset, project.scenes[0].imageAsset);
  assert.equal(changed.scenes[0].approved, false);
  assert.throws(() => assertApproved(changed), /aprueba/);
  assert.equal(changed.scenes[0].visualQuery, 'un presupuesto sobre una mesa');
  assert.equal(changed.scenes[0].visualPlan, proposal.scenes[0].visualPlan);
  assert.notEqual(changed.scenes[0].visualActionPlan.action, proposal.scenes[0].visualPlan);
  assert.match(changed.scenes[0].visualActionPlan.action, /presupuesto|gastos/i);
  assert.doesNotMatch(changed.scenes[0].visualActionPlan.action, /astronauta|Marte/);
});

test('no envía audios, referencias ni rutas de archivos y normaliza respuesta de FreeLLMAPI', async () => {
  const project = structuredClone(finance);
  project.audioAsset = 'user-assets/00000000-0000-4000-8000-000000000000.mp3';
  project.references = ['user-assets/00000000-0000-4000-8000-000000000000.png'];
  let called = 0;
  const fetcher = async (url, request) => {
    called++;
    assert.equal(url, 'http://127.0.0.1:31415/v1/chat/completions');
    assert.equal(request.headers.Authorization, 'Bearer private-test-token');
    const requestBody = JSON.parse(request.body);
    const shared = JSON.stringify(requestBody);
    assert.equal(shared.includes('user-assets/'), false);
    assert.equal(shared.includes('private-test-token'), false);
    assert.equal(requestBody.messages[1].role, 'user');
    return {
      ok: true, status: 200,
      headers: {get: (key) => key === 'x-routed-via' ? 'groq/mock' : null},
      text: async () => JSON.stringify({choices: [{message: {content: JSON.stringify(basic())}}]}),
    };
  };
  const result = await requestAiPlan(project,
    {env: {FREELLMAPI_API_KEY: 'private-test-token'}, fetcher});
  assert.equal(called, 1);
  assert.equal(result.provider, 'groq/mock');
  assert.equal(result.plan.scenes.length, finance.scenes.length);
  assert.equal(result.plan.scenes[0].layout, 'data');
});

test('el scene coder devuelve código validado y reintenta si falla', async () => {
  let calls = 0;
  const result = await requestSceneCode({project: finance, index: 1}, {env: {FREELLMAPI_API_KEY: 'x'}, fetcher: async () => ({ok: true, headers: new Headers(), text: async () => JSON.stringify({choices: [{message: {content: JSON.stringify({html:'<div class=\"hero\">Hola</div>', css:'__SCENE__ .hero{opacity:1}', script:"tl.from(S+' .hero',{opacity:0,duration:.4},T0);"})}}]})})});
  assert.equal(result.scene, 1);
  assert.match(result.customScene.html, /hero/);
});

test('el generador completo devuelve código para todas las escenas', async () => {
  const result = await requestFullVideoCode({project: finance}, {env: {FREELLMAPI_API_KEY: 'x'}, fetcher: async () => ({ok: true, headers: new Headers(), text: async () => JSON.stringify({choices: [{message: {content: JSON.stringify({scenes: finance.scenes.map((_, index) => ({index: index + 1, html: '<div class=\"hero\">Escena</div>', css: '__SCENE__ .hero{opacity:1}', script: "tl.from(S+' .hero',{opacity:0,duration:.4},T0);"}))})}}]})})});
  assert.equal(result.count, finance.scenes.length);
  assert.equal(result.scenes.length, finance.scenes.length);
});

test('el generador conserva respuestas de escenas elaboradas superiores a 512 KB', async () => {
  const project = {...finance, scenes: Array.from({length: 4}, (_, index) =>
    ({...finance.scenes[0], id: `large-${index}`}))};
  const html = '<div>' + 'á'.repeat(140000) + '</div>';
  const response = JSON.stringify({choices: [{message: {content: JSON.stringify({
    scenes: project.scenes.map((_, index) => ({index: index + 1, html, css: '', script: ''})),
  })}}]});
  assert.ok(Buffer.byteLength(response) > 512000);
  const result = await requestFullVideoCode({project}, {env: {FREELLMAPI_API_KEY: 'x'},
    fetcher: async () => ({ok: true, headers: new Headers({'content-length': String(Buffer.byteLength(response))}), text: async () => response})});
  assert.equal(result.scenes.length, 4);
  assert.ok(result.scenes.every((scene) => scene.html === html));
});

test('si el proveedor falla, no se modifica el proyecto y se muestra el límite', async () => {
  const snapshot = structuredClone(finance);
  await assert.rejects(() => requestAiPlan(finance, {env: {FREELLMAPI_API_KEY: 'x'},
    fetcher: async () => ({ok: false, status: 429})}), /Límite gratuito/);
  assert.deepEqual(finance, snapshot);
  await assert.rejects(() => requestAiPlan(finance, {env: {},
    fetcher: async () => {throw new Error('No debe llegar aquí');}}), /Configura FREELLMAPI_API_KEY/);
});

test('los videos sin texto no reciben gráficos que puedan contener rótulos', () => {
  const project = {...finance, showText: false};
  const raw = basic();
  raw.scenes[0].motionGraphics = [{kind: 'bar', label: 'Ahorro', value: 500,
    unit: 'currency', at: 0.5}];
  assert.deepEqual(normalizeAiPlan(raw, project).scenes[0].motionGraphics, []);
});
