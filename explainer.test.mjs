import { test } from "node:test";
import assert from "node:assert/strict";
import { validateProject } from "./server-utils.mjs";
import {
  parseWordSrt,
  inspectExplainer,
  wordsForScene,
} from "./src/explainer-contract.mjs";
import { wordCaptionGroups } from "./src/word-captions.mjs";
import { renderAuthored } from "./src/authored-renderer.mjs";
import { guardLegacyCaptionHandles } from "./src/caption-compat.mjs";
import { sceneCoderBrief } from "./src/scene-library.mjs";
import {
  exportHyperframesProject,
  exportHyperframesScene,
} from "./src/hyperframes-bridge.mjs";

test("repara tiradores opcionales antiguos al exportar sin mutar el proyecto ni ocultar otros selectores", () => {
  const script = 'tl.set(S+" .dvj-handle",{visibility:"hidden"},T0);tl.set(prev.querySelectorAll(".dvj-handle"),{visibility:"hidden"},T0+a);if(w[2])tl.set(n.querySelectorAll(".dvj-handle"),{visibility:"visible"},T0+a);tl.set(S+" .missing-actor",{x:4},T0);';
  const fixed = guardLegacyCaptionHandles(script);
  assert.equal((fixed.match(/if\(handles.length\)/g) || []).length, 3);
  assert.equal(guardLegacyCaptionHandles(fixed), fixed);
  assert.ok(fixed.includes('tl.set(S+" .missing-actor",{x:4},T0);'));
  const p = validateProject({scenes:[{id:'s',duration:2,customScene:{html:'<div class="dvj-word">Aire</div>',css:'',script}}]});
  const before = JSON.stringify(p);
  const html = exportHyperframesProject(p);
  assert.ok(html.includes(fixed));
  assert.equal(JSON.stringify(p), before);
});

const base = () => ({
  actors: [
    {
      id: "block",
      name: "Objeto",
      appearance: "Azul",
      parts: ["body"],
      initialState: "arriba",
    },
  ],
  wordTimings: [
    { text: "Aire", start: 0.1, end: 0.25 },
    { text: "atrapado", start: 0.49, end: 0.8, emphasis: true },
  ],
  scenes: [
    {
      id: "one",
      duration: 0.505,
      captionMode: "global",
      customScene: {
        html: '<div class="block"></div>',
        script: "tl.to(S+' .block',{x:10,duration:.3},T0);",
      },
      direction: {
        objective: "Mostrar el contacto",
        before: { block: "arriba" },
        after: { block: "apoyado" },
        actions: [
          {
            id: "fall",
            actor: "block",
            at: 0,
            duration: 0.4,
            description: "Baja",
            result: "Toca la base",
            selector: ".block",
          },
        ],
        shots: [
          {
            at: 0,
            duration: 0.5,
            scale: "close",
            target: "Contacto",
            purpose: "Mostrar la consecuencia",
          },
        ],
      },
    },
    {
      id: "two",
      duration: 0.5,
      captionMode: "global",
      customScene: { html: '<div class="block"></div>' },
      direction: {
        objective: "Conservar el objeto",
        before: { block: "apoyado" },
        after: { block: "apoyado" },
        holdReason: "Pausa para leer",
      },
    },
  ],
});
test("preserva milisegundos, palabras globales, fichas y actores sin reescalar", () => {
  const input = base(),
    p = validateProject(input);
  assert.equal(p.scenes[0].duration, 0.505);
  assert.equal(p.wordTimings[1].start, 0.49);
  assert.equal(p.actors[0].appearance, "Azul");
  assert.equal(p.scenes[0].direction.actions[0].result, "Toca la base");
  const words = wordsForScene(p, 1);
  assert.ok(Math.abs(words[0].start + 0.015) < 1e-9);
  assert.equal(words[0].text, "atrapado");
  assert.equal(input.wordTimings[1].start, 0.49);
  const brief = sceneCoderBrief(p, p.scenes[1], 1);
  assert.deepEqual(brief.previousState, { block: "apoyado" });
  assert.deepEqual(brief.actors, p.actors);
  assert.equal(brief.wordTimings[0].text, "atrapado");
});
test("rechaza tiempos inventados fuera del clip, duplicados y ciclos", () => {
  const p = base();
  p.scenes[0].direction.actions[0].duration = 8;
  assert.throws(() => validateProject(p), /intervalo/);
  const q = base();
  q.wordTimings[1].end = 4;
  assert.throws(() => validateProject(q), /Palabra/);
  const a = base();
  a.scenes[0].authored = {
    layers: [
      { id: "a", type: "group", parent: "b" },
      { id: "b", type: "group", parent: "a" },
    ],
  };
  assert.throws(() => validateProject(a), /ciclo/);
  const d = base();
  d.scenes[1].id = "one";
  assert.throws(() => validateProject(d), /únicos/);
});
test("importa SRT de palabras y rechaza dividir una frase artificialmente", () => {
  const words = parseWordSrt(
    "1\n00:00:00,100 --> 00:00:00,400\nÁrbol.\n\n2\n00:00:00,700 --> 00:00:00,900\nSí.",
    1,
  );
  assert.equal(words[0].start, 0.1);
  assert.equal(words[0].text, "Árbol.");
  assert.equal(words[1].start, 0.7);
  assert.throws(
    () => parseWordSrt("1\n00:00:00,100 --> 00:00:00,400\nDos palabras", 1),
    /frases/,
  );
});
test("detecta pausas y discontinuidad sin calificarlas como calidad artística", () => {
  const p = validateProject(base());
  p.scenes[1].direction.before.block = "nuevo";
  assert.ok(inspectExplainer(p).some((w) => w.code === "continuity"));
  p.scenes[1].direction.transition = "Al día siguiente, reemplazaron el bloque.";
  assert.ok(!inspectExplainer(p).some((w) => w.code === "continuity"));
  p.scenes[1].duration = 7;
  p.scenes[1].direction.holdReason = "";
  assert.ok(inspectExplainer(p).some((w) => w.code === "long-hold"));
  delete p.scenes[0].direction;
  p.wordTimings = [];
  assert.ok(inspectExplainer(p).some((w) => w.code === "words-missing"));
});
test("la misma autoría conserva grupos, posiciones, cámara y HUD fijo", () => {
  const spec = {
    layers: [
      {
        id: "rig",
        type: "group",
        x: 50,
        y: 60,
        width: 40,
        height: 40,
        keyframes: [{ at: 1, x: 80 }],
      },
      {
        id: "arm",
        parent: "rig",
        type: "shape",
        shape: "circle",
        width: 10,
        height: 10,
        fill: "#f00",
      },
      { id: "caption", type: "text", text: "HUD", fixed: true },
    ],
    camera: { to: { zoom: 1.5 } },
  };
  const a = renderAuthored(spec, { time: 1, duration: 2 });
  assert.match(a, /data-ms-actor="rig"/);
  assert.match(a, /translate\(80px,0px\)/);
  assert.ok(
    a.indexOf('data-ms-actor="rig"') < a.indexOf('data-ms-actor="arm"'),
  );
  assert.equal(a, renderAuthored(spec, { time: 1, duration: 2 }));
  assert.doesNotMatch(renderAuthored(spec, { showText: false }), />HUD</);
  const legacy = renderAuthored({
    layers: [
      {id: 'title', type: 'text', text: 'Carga importante', font: 'serifit', emphasize: [1]},
      {id: 'blob', type: 'shape', shape: 'blob'},
      {id: 'line', type: 'shape', shape: 'line', strokeWidth: 3},
    ],
    grade: {tint: '#123456', tintAmount: .2, grain: .1},
  });
  assert.match(legacy, /MS Playfair/);
  assert.match(legacy, /font-size:1.42em/);
  assert.match(legacy, /60% 40% 55% 45%/);
  assert.match(legacy, /height:3%;top:50%/);
  assert.match(legacy, /mix-blend-mode:soft-light/);
  assert.match(legacy, /feTurbulence/);
});
test("exporta pista global opcional, transiciones y estado authored sin plantillas sustitutas", () => {
  const p = validateProject(base());
  p.scenes[0].transition = "fade";
  const html = exportHyperframesProject(p);
  assert.match(html, /data-word-start="0.1"/);
  assert.match(html, /hf-custom-transition/);
  assert.match(html, /window.__motionStudioErrors/);
  const single = exportHyperframesScene(p, p.scenes[1]);
  assert.match(single, /data-word-start="-0.015/);
  const hidden = exportHyperframesProject({ ...p, showText: false });
  assert.doesNotMatch(hidden, /data-word-start=/);
  const groups = wordCaptionGroups(p.wordTimings, 0.505, 0.5);
  assert.equal(groups[0][0].text, "atrapado");
  const authored = validateProject({
    scenes: [
      {
        id: "a",
        duration: 1,
        authored: {
          layers: [
            { id: "ball", type: "shape", shape: "circle", fill: "#f00" },
          ],
        },
      },
    ],
  });
  assert.match(exportHyperframesProject(authored), /data-ms-actor="ball"/);
  const fontExport = exportHyperframesProject(authored, undefined, '', {'fonts/anton.woff2': 'assets/anton.woff2'});
  assert.match(fontExport, /font-family:'MS Anton';src:url\('assets\/anton.woff2'\)/);
});
