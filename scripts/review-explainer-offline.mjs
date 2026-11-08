// File-based fallback for managed environments that deny loopback sockets.
// Uses an existing browser; no downloads, accounts, or changes to user projects.
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { validateProject } from "../server-utils.mjs";
import { exportHyperframesProject } from "../src/hyperframes-bridge.mjs";
import { collectProjectAssets, BUNDLED_FONT_FACES } from "../src/project-assets.mjs";
import { inspectExplainer } from "../src/explainer-contract.mjs";

export async function reviewOffline(
  raw,
  {
    root = path.resolve(import.meta.dirname, ".."),
    outputDir,
    browserExecutable,
    capture = true,
    times,
  } = {},
) {
  const project = validateProject(raw),
    errors = [],
    warnings = inspectExplainer(project).map((w) => `${w.scene}: ${w.message}`),
    samples = [];
  if (!outputDir) throw Error("Indica un directorio de revisión.");
  await fs.mkdir(outputDir, { recursive: true });
  if (!browserExecutable)
    for (const file of [
      process.env.MOTION_STUDIO_BROWSER,
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
      "/usr/bin/chromium",
    ].filter(Boolean)) {
      try {
        await fs.access(file);
        browserExecutable = file;
        break;
      } catch {}
    }
  if (!browserExecutable) throw Error("No hay navegador local disponible.");
  const assets = {};
  const files = new Set(collectProjectAssets(project));
  for (const [, file] of BUNDLED_FONT_FACES) {
    try { await fs.access(path.join(root, 'public', file)); files.add(file); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  for (const asset of files) {
    const bytes = await fs.readFile(path.join(root, "public", asset));
    assets[asset] =
      `data:${{ ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".mp4": "video/mp4", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf" }[path.extname(asset)] || "application/octet-stream"};base64,${bytes.toString("base64")}`;
  }
  const gsap = await fs.readFile(
    path.join(root, "public/hyperframes/gsap.min.js"),
    "utf8",
  );
  let html = exportHyperframesProject(project, undefined, gsap, assets);
  html = html.replace(
    "<head>",
    '<head><script>window.__offlineErrors=[];const warn=console.warn;console.warn=(...a)=>{if(a.join(" ").includes("not found"))window.__offlineErrors.push(a.join(" "));warn(...a);};</script>',
  );
  const expected = project.scenes.reduce((n, s) => n + s.duration, 0),
    scale = project.resolution === "1080p" ? 1.5 : 1;
  const width = (project.format === "horizontal" ? 1280 : 720) * scale,
    height = (project.format === "horizontal" ? 720 : 1280) * scale;
  let offset = 0;
  const points = [];
  for (const [index, scene] of project.scenes.entries()) {
    const local = new Set([
      0,
      scene.duration * 0.5,
      Math.max(0, scene.duration - 0.001),
    ]);
    for (const a of scene.direction?.actions || [])
      for (const t of [a.at, a.at + a.duration * 0.5, a.at + a.duration])
        local.add(Math.min(scene.duration - 0.001, t));
    for (const t of local)
      points.push({
        scene: scene.id,
        index,
        time: offset + t,
        local: t,
        actions: scene.direction?.actions || [],
      });
    offset += scene.duration;
  }
  const selected = times
    ? times.map((time) => {
        let start = 0;
        for (const [index, scene] of project.scenes.entries()) {
          if (time >= start && time < start + scene.duration)
            return {
              scene: scene.id,
              index,
              time,
              local: time - start,
              actions: scene.direction?.actions || [],
            };
          start += scene.duration;
        }
        throw Error("Tiempo fuera del proyecto: " + time);
      })
    : points;
  for (const [i, sample] of selected.entries()) {
    const file = path.resolve(outputDir, `sample-${i}.html`),
      png = path.resolve(outputDir, `${String(i).padStart(3, "0")}.png`);
    const code = `<script>Promise.all([document.fonts.ready,...[...document.images].map(i=>i.decode().catch(()=>{}))]).then(()=>{
      const tl=window.__timelines?.['motion-studio-7'];const errors=[...(window.__motionStudioErrors||[]),...(window.__offlineErrors||[])],warnings=[];
      if(!tl)errors.push('GSAP no inicializado');else {tl.time(${sample.time},false);if(Math.abs(tl.duration()-${expected})>.002)errors.push('Duración de timeline incorrecta');}
      document.querySelectorAll('.clip').forEach(c=>{const a=+c.dataset.start||0,d=+c.dataset.duration||0;c.style.display=${sample.time}>=a&&${sample.time}<a+d?'':'none';});
      const root=document.getElementById('hf-scene-${sample.index}');
      for(const a of ${JSON.stringify(sample.actions).replaceAll("<", "\\u003c")}){if(!a.selector)continue;try{const nodes=root.querySelectorAll(a.selector);if(!nodes.length)errors.push('Selector ausente: '+a.selector);}catch{errors.push('Selector inválido: '+a.selector);}}
      for(const n of root?.querySelectorAll('.ms-caption-word,.dvj-word')||[]){if(getComputedStyle(n).display==='none'||getComputedStyle(n.parentElement).visibility==='hidden')continue;const r=n.getBoundingClientRect();if(r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5)errors.push('Palabra fuera del lienzo: '+n.textContent);}
      const duplicates=[],ids=new Set();document.querySelectorAll('[id]').forEach(n=>{if(ids.has(n.id))duplicates.push(n.id);ids.add(n.id);});if(duplicates.length)errors.push('IDs duplicados: '+duplicates.join(','));
      errors.push(...(window.__motionStudioErrors||[]));const result=document.createElement('pre');result.id='ms-review-result';result.style.display='none';result.textContent=JSON.stringify({errors,warnings,time:tl?.time(),duration:tl?.duration()});document.body.appendChild(result);
    }).catch(e=>{const p=document.createElement('pre');p.id='ms-review-result';p.textContent=JSON.stringify({errors:[e.message]});document.body.appendChild(p);});</script>`;
    await fs.writeFile(file, html.replace("</body>", code + "</body>"));
    const args = [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-sync",
      "--no-default-browser-check",
      "--run-all-compositor-stages-before-draw",
      `--user-data-dir=${path.resolve(outputDir, "browser-profile")}`,
      `--window-size=${width},${height}`,
      "--force-device-scale-factor=1",
      "--virtual-time-budget=1500",
      "--dump-dom",
    ];
    if (capture) args.push("--screenshot=" + png);
    args.push(pathToFileURL(file).href);
    const run = spawnSync(browserExecutable, args, {
      encoding: "utf8",
      windowsHide: true,
      timeout: 60000,
      maxBuffer: 32 * 1024 * 1024,
    });
    const match = run.stdout?.match(
      /<pre id="ms-review-result"[^>]*>([\s\S]*?)<\/pre>/,
    );
    if (!match) {
      await fs.writeFile(
        path.join(outputDir, "browser-dom.html"),
        run.stdout || "",
      );
      await fs.writeFile(
        path.join(outputDir, "browser-stderr.txt"),
        run.stderr || "",
      );
      throw Error(
        "El navegador no devolvió evidencia de ejecución. " +
          (run.error?.message || run.stderr?.slice(-500) || ""),
      );
    }
    const text = match[1]
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&"),
      result = JSON.parse(text);
    errors.push(
      ...result.errors.map(
        (e) => `${sample.scene} @${sample.local.toFixed(3)}: ${e}`,
      ),
    );
    warnings.push(...(result.warnings || []));
    samples.push({
      scene: sample.scene,
      time: sample.time,
      local: sample.local,
      file: capture ? path.basename(png) : undefined,
      timelineTime: result.time,
    });
    console.log(
      `Revisión ${i + 1}/${selected.length}: ${sample.scene} @${sample.local.toFixed(3)}`,
    );
  }
  const report = {
    projectHash: createHash("sha256")
      .update(JSON.stringify(project))
      .digest("hex"),
    passed: !errors.length,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    samples,
    visualApproval: false,
    audioAlignmentVerified: false,
    transport: "local-file",
  };
  await fs.writeFile(
    path.join(outputDir, "report.json"),
    JSON.stringify(report, null, 2),
  );
  return report;
}
if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  try {
    const a = process.argv.slice(2),
      i = a.indexOf("--out");
    if (i < 0)
      throw Error(
        "Uso: node scripts/review-explainer-offline.mjs proyecto.json --out carpeta [--times 0,1,2]",
      );
    const raw = JSON.parse(await fs.readFile(a[0], "utf8")),
      t = a.indexOf("--times");
    const r = await reviewOffline(raw.project ?? raw, {
      outputDir: path.resolve(a[i + 1]),
      times: t < 0 ? undefined : a[t + 1].split(",").map(Number),
    });
    console.log(
      JSON.stringify({
        passed: r.passed,
        errors: r.errors,
        samples: r.samples.length,
      }),
    );
    process.exitCode = r.passed ? 0 : 1;
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
