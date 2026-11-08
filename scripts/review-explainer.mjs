import {inspectContactSamples} from '../src/contact-motion-audit.mjs';
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { ensureBrowser } from "@remotion/renderer";
import {launch} from 'puppeteer-core';
import { validateProject } from "../server-utils.mjs";
import { exportHyperframesProject } from "../src/hyperframes-bridge.mjs";
import { collectProjectAssets, BUNDLED_FONT_FACES } from "../src/project-assets.mjs";
import { inspectExplainer } from "../src/explainer-contract.mjs";
import {closeRenderBrowser,renderBrowserArgs} from './render-browser.mjs';
import {observeMotionCheckpoints} from './observe-motion.mjs';
import {checkNarrationBindings} from '../src/motion-sequence.mjs';

export function selectCaptureTimes(times,duration,budget,actions=[]){
  const candidates=[...times].sort((a,b)=>a-b);
  if(budget<=0)return new Set();
  if(budget===1)return new Set([duration*.5]);
  const selected=new Set([0,Math.max(0,duration-.001)]);
  if(budget>=3)selected.add(duration*.5);
  for(const action of actions){
    if(selected.size>=budget)break;
    const target=Math.min(duration-.001,action.at+action.duration*.5);
    selected.add(candidates.reduce((a,b)=>Math.abs(a-target)<Math.abs(b-target)?a:b));
  }
  while(selected.size<Math.min(budget,candidates.length)){
    const remaining=candidates.filter(t=>!selected.has(t));
    if(!remaining.length)break;
    const distance=t=>Math.min(...[...selected].map(s=>Math.abs(t-s)));
    selected.add(remaining.reduce((a,b)=>distance(a)>distance(b)?a:b));
  }
  return selected;
}

export async function reviewExplainer(
  raw,
  {
    root = path.resolve(import.meta.dirname, ".."),
    publicDir = path.join(root, "public"),
    outputDir,
    capture = true,
    captionEvidence = false,
    browserExecutable,
    onProgress,
  } = {},
) {
  const project = validateProject(raw),
    assets = new Set(collectProjectAssets(project)),
    errors = checkNarrationBindings(project),
    warnings = inspectExplainer(project).map((w) => `${w.scene}: ${w.message}`);
  for (const a of assets) await fs.access(path.join(publicDir, a));
  for (const [, file] of BUNDLED_FONT_FACES) {
    try { await fs.access(path.join(publicDir, file)); assets.add(file); }
    catch (error) { if (error.code !== 'ENOENT') throw error; warnings.push(`Fuente opcional ${file} ausente; se usa la fuente de respaldo.`); }
  }
  let html = exportHyperframesProject(
    project,
    undefined,
    await fs.readFile(
      path.join(root, "public/hyperframes/gsap.min.js"),
      "utf8",
    ),
    Object.fromEntries([...assets].map((a) => [a, "/" + a])),
  );
  html = html.replace(
    "<head>",
    '<head><script>window.__reviewErrors=[];const warn=console.warn;console.warn=(...a)=>{if(a.join(" ").includes("not found"))window.__reviewErrors.push(a.join(" "));warn(...a);};</script>',
  );
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname === "/") {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; media-src 'self'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'");
        return res.end(html);
      }
      const asset = decodeURIComponent(url.pathname.slice(1));
      if (!assets.has(asset)) {
        res.writeHead(404);
        return res.end();
      }
      const bytes = await fs.readFile(path.join(publicDir, asset));
      res.setHeader(
        "Content-Type",
        {
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".webp": "image/webp",
          ".mp3": "audio/mpeg",
          ".wav": "audio/wav",
          ".mp4": "video/mp4",
          ".woff2": "font/woff2",
          ".ttf": "font/ttf",
          ".otf": "font/otf",
        }[path.extname(asset)] || "application/octet-stream",
      );
      res.end(bytes);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  let browser;
  try {
    if (!browserExecutable && !process.env.MOTION_STUDIO_BROWSER) {
      try {
        const installed=await ensureBrowser({onBrowserDownload:()=>{throw Error('No se descargan navegadores durante la revisión.');}});
        browserExecutable=installed.path;
      } catch { /* Fall back to an installed desktop browser. */ }
    }
    if (!browserExecutable)
      for (const file of [
        process.env.MOTION_STUDIO_BROWSER,
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "/usr/bin/chromium",
        "/usr/bin/google-chrome",
      ].filter(Boolean)) {
        try {
          await fs.access(file);
          browserExecutable = file;
          break;
        } catch {}
      }
    if (!browserExecutable)
      throw Error(
        "No hay navegador local para revisar las escenas; configura MOTION_STUDIO_BROWSER. No se descargó ninguno.",
      );
    browser = await launch({executablePath:browserExecutable,headless:'shell',args:renderBrowserArgs()});
    const page = await browser.newPage();
    const scale = project.resolution === "1080p" ? 1.5 : 1,
      width = (project.format === "horizontal" ? 1280 : 720) * scale,
      height = (project.format === "horizontal" ? 720 : 1280) * scale;
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.goto("http://127.0.0.1:" + server.address().port,{timeout:30000,waitUntil:'load'});
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        [...document.images].map((i) => i.decode().catch(() => {})),
      );
    });
    const total = project.scenes.reduce((s, c) => s + c.duration, 0),
      duration = await page.evaluate(() =>
        window.__timelines?.["motion-studio-7"]?.duration(),
      );
    if (!Number.isFinite(duration) || Math.abs(duration - total) > 0.002)
      errors.push(`Timeline ${duration} s distinta de ${total} s.`);
    const ids = await page.evaluate(() => {
      const seen = new Set(),
        bad = new Set();
      document.querySelectorAll("[id]").forEach((n) => {
        if (seen.has(n.id)) bad.add(n.id);
        seen.add(n.id);
      });
      return [...bad];
    });
    if (ids.length) errors.push("IDs HTML duplicados: " + ids.join(", "));
    const samples = [],captionSamples=[],motionSamples=[],contactSamples=[];
    const captionRegion={x:0,y:Math.floor(height*.055),width,height:Math.round(height*.13)};
    const wordFrames=(project.wordTimings||[]).map((word,wordIndex)=>{
      const frame=Math.max(0,Math.min(Math.ceil(total*project.fps)-1,Math.round((word.start+word.end)*project.fps/2)));
      return {...word,wordIndex,frame,time:frame/project.fps};
    });
    let captureCount=0;
    let start = 0;
    if (outputDir) await fs.mkdir(outputDir, { recursive: true });
    for (const [index, scene] of project.scenes.entries()) {
      const times = new Set([
        0,
        scene.duration * 0.5,
        Math.max(0, scene.duration - 0.001),
      ]);
      for (const a of scene.direction?.actions || [])
        for (const t of [a.at, a.at + a.duration * 0.5, a.at + a.duration])
          times.add(Math.min(scene.duration - 0.001, t));
      for(const action of scene.direction?.actions??[])for(const point of action.checkpoints??[])
        times.add(Math.min(scene.duration-.000001,action.at+point.at));
      for (const shot of scene.direction?.shots || [])
        times.add(
          Math.min(scene.duration - 0.001, shot.at + shot.duration * 0.5),
        );
      const sceneWords=scene.captionMode==='global'||(scene.captionMode!=='none'&&scene.customScene?.html?.includes('dvj-caption'))
        ?wordFrames.filter(w=>w.time>=start&&w.time<start+scene.duration):[];
      for(const word of sceneWords)times.add(word.time-start);
      const budget=Math.floor(80/project.scenes.length)+(index<80%project.scenes.length?1:0);
      const captureTimes=selectCaptureTimes(times,scene.duration,budget,scene.direction?.actions||[]);
      for (const local of [...times].sort((a, b) => a - b)) {
        onProgress?.({stage:'forward',scene:scene.id,local});
        const expectedWord=sceneWords.find(w=>Math.abs(w.time-(start+local))<1e-8);
        const state = await page.evaluate(
          ({ time, index, actions, local, expectedText }) => {
            const tl = window.__timelines["motion-studio-7"];
            if (!tl)
              return { errors: ["No se inicializó GSAP."], warnings: [] };
            tl.time(time, false);
            document.querySelectorAll(".clip").forEach((c) => {
              const a = +c.dataset.start || 0,
                d = +c.dataset.duration || 0;
              c.style.display = time >= a && time < a + d ? "" : "none";
            });
            const root = document.getElementById("hf-scene-" + index),
              errors = [],
              warnings = [];
            for (const a of actions) {
              if (!a.selector) continue;
              try {
                const nodes = root.querySelectorAll(a.selector);
                if (!nodes.length)
                  errors.push("Selector ausente: " + a.selector);
                else if (local >= a.at && local <= a.at + a.duration)
                  for (const n of nodes) {
                    const r = n.getBoundingClientRect();
                    if (
                      r.width &&
                      r.height &&
                      (r.right < 0 ||
                        r.bottom < 0 ||
                        r.left > innerWidth ||
                        r.top > innerHeight)
                    )
                      warnings.push("Acción fuera del lienzo: " + a.id);
                  }
              } catch {
                errors.push("Selector inválido: " + a.selector);
              }
            }
            for (const n of root?.querySelectorAll(
              ".ms-caption-word,.dvj-word,text[data-callout-label]",
            ) || []) {
              if (
                getComputedStyle(n).display === "none" ||
                getComputedStyle(n.parentElement).visibility === "hidden"
              )
                continue;
              const r = n.getBoundingClientRect();
              if (
                r.left < -0.5 ||
                r.top < -0.5 ||
                r.right > innerWidth + 0.5 ||
                r.bottom > innerHeight + 0.5
              )
                errors.push("Palabra fuera del lienzo: " + n.textContent);
            }
            const activeWords=[...root.querySelectorAll('.dvj-word,.ms-caption-word')].filter(n=>{
              const s=getComputedStyle(n),p=getComputedStyle(n.parentElement);
              return s.display!=='none'&&s.visibility!=='hidden'&&p.visibility!=='hidden'&&Number(p.opacity)>.5&&parseInt(s.fontWeight,10)>=750;
            }).map(n=>n.textContent.trim());
            if(expectedText&&!activeWords.includes(expectedText))errors.push('Palabra sincronizada ausente: '+expectedText+'; visibles: '+activeWords.join(', '));
            errors.push(
              ...(window.__motionStudioErrors || []),
              ...(window.__reviewErrors || []),
            );
            return { errors, warnings };
          },
          {
            time: start + local,
            index,
            actions: scene.direction?.actions || [],
            local,
            expectedText:expectedWord?.text,
          },
        );
        errors.push(
          ...state.errors.map((e) => `${scene.id} @${local.toFixed(3)}: ${e}`),
        );
        warnings.push(...state.warnings);
        const motion=await page.evaluate(observeMotionCheckpoints,{sceneIndex:index,local,actions:scene.direction?.actions??[]});
        errors.push(...motion.errors.map(e=>`${scene.id} @${local.toFixed(4)}: ${e}`));
        if(motion.observations.length)motionSamples.push({scene:scene.id,sceneIndex:index,time:start+local,local,observations:motion.observations});
        const feet=await page.evaluate(index=>{
          const root=document.getElementById('hf-scene-'+index);
          return [...(root?.querySelectorAll('[data-dvj-foot]')||[])].map(n=>{
            const r=n.getBoundingClientRect();
            return {id:n.getAttribute('data-dvj-foot'),x:r.x+r.width/2,y:r.y+r.height/2,
              contact:n.getAttribute('data-dvj-contact')||'unknown'};
          });
        },index);
        if(feet.length)contactSamples.push({scene:scene.id,time:start+local,feet});
        const sample = { scene: scene.id, time: start + local, local };
        if (capture && outputDir && captureTimes.has(local)) {
          const response = await page.screenshot({type:'png'});
          sample.file = `${String(captureCount++).padStart(3, "0")}.png`;
          await fs.writeFile(
            path.join(outputDir, sample.file),
            Buffer.from(response),
          );
        }
        samples.push(sample);
        if(expectedWord){
          const entry={word:expectedWord.text,wordIndex:expectedWord.wordIndex,frame:expectedWord.frame,time:expectedWord.time};
          if(captionEvidence&&outputDir){
            entry.file='caption-'+String(captionSamples.length).padStart(4,'0')+'.png';
            await fs.writeFile(path.join(outputDir,entry.file),Buffer.from(await page.screenshot({type:'png',clip:captionRegion})));
          }
          captionSamples.push(entry);
        }
      }
      start += scene.duration;
    }
    // Revisit every declared state in reverse; an export must not depend on seek history.
    for(const sample of [...motionSamples].reverse()){
      onProgress?.({stage:'backward',scene:sample.scene,local:sample.local});
      await page.evaluate(t=>{window.__timelines['motion-studio-7'].time(t,false);},sample.time);
      const result=await page.evaluate(observeMotionCheckpoints,{sceneIndex:sample.sceneIndex,local:sample.local,actions:project.scenes[sample.sceneIndex].direction?.actions??[]});
      errors.push(...result.errors.map(e=>`${sample.scene} busqueda inversa: ${e}`));
      sample.backwardPassed=!result.errors.length;
    }
    const contactAudit=inspectContactSamples(contactSamples);
    warnings.push(...contactAudit.findings.map(f=>f.scene+' @'+f.time.toFixed(3)+': '+f.code+' '+f.foot+' ('+f.pixels+' px)'));
    const report = {
      projectHash: createHash("sha256")
        .update(JSON.stringify(project))
        .digest("hex"),
      passed: !errors.length,
      errors: [...new Set(errors)],
      warnings: [...new Set(warnings)],
      samples,
      motionSamples,
      contactAudit,
      captionSamples,
      captionRegion,
      expectedDuration: total,
      timelineDuration: duration,
      visualApproval: false,
      audioAlignmentVerified: false,
    };
    if (outputDir)
      await fs.writeFile(
        path.join(outputDir, "report.json"),
        JSON.stringify(report, null, 2),
      );
    return report;
  } finally {
    server.closeAllConnections();
    try{await closeRenderBrowser(browser);}
    finally{await new Promise((resolve) => server.close(resolve));}
  }
}
if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  try {
    const args = process.argv.slice(2),
      out = args[args.indexOf("--out") + 1];
    if (!args[0] || !args.includes("--out"))
      throw Error(
        "Uso: node scripts/review-explainer.mjs proyecto.json --out carpeta",
      );
    const raw = JSON.parse(await fs.readFile(args[0], "utf8"));
    const r = await reviewExplainer(raw.project ?? raw, {
      outputDir: path.resolve(out),
      captionEvidence:args.includes('--captions'),
    });
    console.log(JSON.stringify(r));
    process.exitCode = r.passed ? 0 : 1;
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
