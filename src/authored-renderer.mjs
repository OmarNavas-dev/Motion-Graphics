// One pure renderer shared by Remotion and the exported browser timeline.
// Self-contained so the HTML export can embed its source without dependencies.
export function renderAuthored(spec, options = {}) {
  const {
    time = 0,
    duration = 1,
    width = 720,
    height = 1280,
    showText = true,
    assets = {},
    theme = {},
  } = options;
  const esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const n = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d),
    clamp = (v) => Math.max(0, Math.min(1, v));
  const color = (v, f = "#fff") =>
    esc(
      v?.startsWith?.("@")
        ? theme[v.slice(1) === "bg" ? "background" : v.slice(1)] || f
        : v || f,
    );
  const font = (v) => esc(({
    impact: '"MS Anton", Impact, "Arial Black", sans-serif',
    serifit: '"MS Playfair", Georgia, serif',
    sansbold: '"MS Inter", Arial, Helvetica, sans-serif',
    hand: '"MS Caveat", "Comic Sans MS", cursive',
    serif: 'Georgia, serif', mono: '"Courier New", monospace',
  })[v] || v || theme.display || 'Arial');
  const children = new Map();
  for (const l of spec.layers || [])
    children.set(l.parent || "", [...(children.get(l.parent || "") || []), l]);
  const p = clamp(time / Math.max(0.001, duration)),
    u = p * p * (3 - 2 * p),
    a = { x: 0, y: 0, zoom: 1, rotate: 0, ...spec.camera?.from },
    b = { ...a, ...spec.camera?.to },
    cam = {};
  for (const k of ["x", "y", "zoom", "rotate"])
    cam[k] =
      n(a[k], k === "zoom" ? 1 : 0) +
      (n(b[k], k === "zoom" ? 1 : 0) - n(a[k], k === "zoom" ? 1 : 0)) * u;
  const node = (l, bw, bh, root = false) => {
    const age = time - n(l.enter?.at);
    if (age < 0 || (!showText && ["text", "caption"].includes(l.type)))
      return "";
    const w =
        (n(l.width, ["text", "caption"].includes(l.type) ? 80 : 10) / 100) * bw,
      h = (n(l.height, l.width ?? 10) / 100) * bw;
    let x = 0,
      y = 0,
      r = n(l.rotate),
      s = 1,
      o = n(l.opacity, 1),
      blur = n(l.blur),
      reveal = 1;
    const q = clamp(age / 0.45),
      enter = l.enter?.preset || "none";
    let e = 1 - (1 - q) ** 3;
    if (l.enter?.spring) {
      const springs = {
          smooth: [60, 18, 1],
          soft: [80, 14, 1],
          snappy: [220, 26, 1],
          bouncy: [170, 10, 1],
          heavy: [120, 22, 2],
        },
        [k, c, m] = springs[l.enter.spring] || springs.soft,
        w0 = Math.sqrt(k / m),
        z = c / (2 * Math.sqrt(k * m));
      e =
        z < 1
          ? 1 -
            Math.exp(-z * w0 * age) *
              (Math.cos(w0 * Math.sqrt(1 - z * z) * age) +
                (z / Math.sqrt(1 - z * z)) *
                  Math.sin(w0 * Math.sqrt(1 - z * z) * age))
          : 1 - Math.exp(-w0 * age) * (1 + w0 * age);
    }
    if (enter !== "none") o *= clamp(age / 0.22);
    if (enter === "rise") y = (1 - e) * height * 0.07;
    if (enter === "drop") y = -(1 - e) * height * 0.12;
    if (enter === "slide-left") x = -(1 - e) * width * 0.6;
    if (enter === "slide-right") x = (1 - e) * width * 0.6;
    if (enter === "pop") s = 0.15 + 0.85 * e;
    if (enter === "zoom") s = 1.7 - 0.7 * e;
    if (enter === "wipe") reveal = e;
    if (enter === "blur") blur += (1 - e) * 18;
    const idle = l.idle || {},
      wave = Math.sin(
        2 * Math.PI * (n(idle.speed, 0.35) * time + n(idle.phase)),
      );
    if (time >= n(idle.from) && time <= n(idle.to, Infinity)) {
      if (idle.kind === "float")
        y += ((wave * n(idle.amount, 1.2)) / 100) * height;
      if (idle.kind === "sway") r += wave * n(idle.amount, 4);
      if (idle.kind === "breathe") s *= 1 + (wave * n(idle.amount, 2.5)) / 100;
      if (idle.kind === "pulse")
        s *= 1 + ((0.5 + 0.5 * wave) * n(idle.amount, 6)) / 100;
      if (idle.kind === "spin") r += time * n(idle.speed, 0.35) * 360;
      if (idle.kind === "blink") o *= Math.abs(wave) > 0.96 ? 0.12 : 1;
    }
    let from = { at: 0, x: 0, y: 0, rotate: r, scale: 1, opacity: 1 },
      pose = from;
    for (const key of l.keyframes || []) {
      const to = { ...from, ...key };
      if (time <= to.at) {
        const v = clamp((time - from.at) / Math.max(0.001, to.at - from.at)),
          z = v * v * (3 - 2 * v);
        pose = {};
        for (const k of ["x", "y", "rotate", "scale", "opacity"])
          pose[k] = from[k] + (to[k] - from[k]) * z;
        break;
      }
      from = to;
      pose = to;
    }
    x += n(pose.x);
    y += n(pose.y);
    r = n(pose.rotate, r);
    s *= n(pose.scale, 1);
    o *= n(pose.opacity, 1);
    if (l.leave && l.leave.preset !== "none" && time >= l.leave.at) {
      const v = clamp((time - l.leave.at) / Math.max(0.001, l.leave.duration));
      o *= 1 - v;
      if (l.leave.preset === "drop") y += v * height * 0.1;
      if (l.leave.preset === "shrink") s *= 1 - v;
    }
    let body = "";
    if (l.type === "text") {
      const text = l.upper ? String(l.text || "").toUpperCase() : String(l.text || "");
      const words = text.split(/\s+/).filter(Boolean).map((word, i) =>
        `<span${l.emphasize?.includes(i) ? ` style="color:${color(l.fill, theme.accent)};font-family:${font('impact')};font-size:1.42em"` : ''}>${esc(word.replace(/\*/g, ''))}</span>`).join(' ');
      body = `<div style="font-family:${font(l.font)};font-size:${(n(l.size, 7) / 100) * width}px;font-weight:${n(l.weight, 800)};line-height:1.1;text-align:${esc(l.align || "center")};color:${color(l.color, theme.ink)};${l.shadow ? 'text-shadow:0 4px 18px #0007;' : ''}">${words}</div>`;
    }
    if (l.type === "caption") {
      const words = l.words || [],
        active = words.findIndex(
          (w, i) =>
            time >= w.s &&
            time < Math.min(words[i + 1]?.s ?? Infinity, w.e + 0.18),
        );
      if (active >= 0)
        body = `<div style="font:500 ${(n(l.size, 4.4) / 100) * width}px/1.3 Arial;text-align:center;color:${color(l.fill, "#ffffff80")}">${words
          .filter((w) => w.s <= time)
          .map(
            (w, i) =>
              `<span style="display:inline-block;color:${i === active ? color(l.color) : "inherit"};font-weight:${i === active ? 800 : 500};border:2px solid ${i === active && w.box ? color(l.stroke, "#4c8dff") : "transparent"}">${esc(w.w)}</span>`,
          )
          .join(" ")}</div>`;
    }
    if (l.type === "image" && assets[l.asset])
      body = `<img src="${esc(assets[l.asset])}" style="width:100%;height:100%;object-fit:contain" alt=""/>`;
    if (["shape", "gradient", "glow"].includes(l.type)) {
      const bg = l.fill2
        ? `linear-gradient(${n(l.angle, 180)}deg,${color(l.fill, theme.accent)},${color(l.fill2)})`
        : color(l.fill, theme.accent);
      const radius = l.shape === 'blob' ? '60% 40% 55% 45% / 50% 60% 40% 50%' : ["circle", "ellipse", "ring"].includes(l.shape) || l.type === "glow" ? "50%" : `${n(l.radius) / 100 * width}px`;
      body = `<div style="position:absolute;inset:0;background:${l.shape === "ring" ? "transparent" : bg};border:${n(l.strokeWidth, l.shape === "ring" ? 1 : 0) / 100 * width}px solid ${color(l.shape === "ring" ? l.fill : l.stroke, "transparent")};border-radius:${radius};${l.shape === 'line' ? `height:${n(l.strokeWidth, 2)}%;top:50%;border:0;` : ''}${l.shape === "triangle" ? "clip-path:polygon(50% 0,100% 100%,0 100%);" : ""}${l.type === "glow" ? "filter:blur(20px);" : ""}"></div>`;
    }
    if (["path", "arrow", "wave"].includes(l.type)) {
      const d = l.path || "",
        points = (l.points || []).map((p) => `${n(p.x)},${n(p.y)}`).join(" ");
      body = `<svg viewBox="0 0 100 100" width="100%" height="100%" style="overflow:visible" preserveAspectRatio="none"><${d ? "path" : "polyline"} ${d ? 'd="' + esc(d) + '"' : 'points="' + points + '"'} fill="${color(l.fill, "none")}" stroke="${color(l.stroke, theme.accent || "#fff")}" stroke-width="${n(l.strokeWidth, 2)}" stroke-dasharray="${n(l.dash)}" stroke-dashoffset="${n(l.dash) * (1 - e)}"/>${l.type === "arrow" ? `<path d="M78 40L98 50L78 60" fill="none" stroke="${color(l.stroke)}" stroke-width="${n(l.strokeWidth, 2)}"/>` : ""}</svg>`;
    }
    if (l.type === "svg")
      body = `<svg viewBox="${esc(l.viewBox || "0 0 100 100")}" width="100%" height="100%">${l.svg || ""}</svg>`;
    if (l.type === "particles") {
      let seed = n(l.particles?.seed, 7) >>> 0;
      const rnd = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      body = Array.from(
        { length: Math.min(80, n(l.particles?.count, 24)) },
        () => {
          const xx = rnd(),
            yy =
              (rnd() +
                time * (0.6 + rnd() * 0.9) * n(l.particles?.speed, 1) * 0.08) %
              1;
          return `<i style="position:absolute;left:${xx * 100}%;top:${yy * 100}%;width:${(n(l.particles?.size, 0.6) / 100) * width}px;height:${(n(l.particles?.size, 0.6) / 100) * width}px;border-radius:50%;background:${color(l.fill, theme.accent)};opacity:${Math.sin(yy * Math.PI) * 0.7}"></i>`;
        },
      ).join("");
    }
    body += (children.get(l.id) || []).map((k) => node(k, w, h)).join("");
    const factor = 0.4 + 1.2 * clamp(n(l.depth, 0.5)),
      camera =
        root && !l.fixed && l.type !== "caption"
          ? `translate(${(-cam.x / 100) * width * factor}px,${(-cam.y / 100) * height * factor}px) scale(${1 + (cam.zoom - 1) * factor}) rotate(${cam.rotate}deg)`
          : "none";
    const html = `<div data-ms-actor="${esc(l.id)}" style="position:absolute;left:${(n(l.x, 50) / 100) * bw}px;top:${(n(l.y, 50) / 100) * bh}px;width:${w}px;height:${h}px;opacity:${o};transform-origin:${n(l.ax, 50)}% ${n(l.ay, 50)}%;transform:translate(-50%,-50%) translate(${x}px,${y}px) rotate(${r}deg) scale(${s * (l.flip ? -1 : 1)},${s});filter:blur(${blur}px);${reveal < 1 ? `clip-path:inset(0 ${(1 - reveal) * 100}% 0 0);` : ""}mix-blend-mode:${esc(l.blend || "normal")}">${body}</div>`;
    return root
      ? `<div style="position:absolute;inset:0;transform:${camera};transform-origin:50% 50%">${html}</div>`
      : html;
  };
  const bg = spec.background || {};
  const grade = spec.grade || {};
  const grain = 'url("data:image/svg+xml,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>") + '")';
  const overlays = (grade.tint ? `<div style="position:absolute;inset:0;pointer-events:none;background:${color(grade.tint)};opacity:${clamp(n(grade.tintAmount))};mix-blend-mode:soft-light"></div>` : '') +
    (n(grade.vignette) > 0 ? `<div style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse,transparent 35%,rgba(0,0,0,${clamp(n(grade.vignette)) * 0.85}))"></div>` : '') +
    (n(grade.grain) > 0 ? `<div style="position:absolute;inset:0;pointer-events:none;background-image:${esc(grain)};opacity:${clamp(n(grade.grain)) * .5};mix-blend-mode:overlay"></div>` : '');
  return `<div class="ms-authored-stage" style="position:absolute;inset:0;overflow:hidden;background:${bg.color2 ? `linear-gradient(${n(bg.angle, 180)}deg,${color(bg.color, theme.background)},${color(bg.color2)})` : color(bg.color, theme.background)}">${(children.get("") || []).map((l) => node(l, width, height, true)).join("")}${overlays}</div>`;
}
