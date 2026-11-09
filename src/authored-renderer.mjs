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
  const cameraKeys = Array.isArray(spec.camera?.keyframes) ? spec.camera.keyframes : [];
  let cameraFrom={...a,at:0},cameraTo={...b,at:duration},cameraT=u;
  if(cameraKeys.length){
    for(const next of cameraKeys){
      cameraTo={...cameraFrom,...next};
      if(time <= cameraTo.at){
        const v=clamp((time-cameraFrom.at)/Math.max(.001,cameraTo.at-cameraFrom.at));
        cameraT=v*v*(3-2*v);
        break;
      }
      cameraFrom=cameraTo;cameraT=1;
    }
  }
  for(const k of ["x", "y", "zoom", "rotate"])
    cam[k] = n(cameraFrom[k], k === "zoom" ? 1 : 0) +
      (n(cameraTo[k], k === "zoom" ? 1 : 0)-n(cameraFrom[k], k === "zoom" ? 1 : 0))*cameraT;
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
    if(l.type==='character' && l.actor?.poses?.length){
      // Deterministic 2D two-bone IK. The same declared wrist/ankle targets are
      // audited before export; no frame-to-frame mutation or browser physics.
      const poses=l.actor.poses;
      let prev=poses[0],next=prev;
      for(let i=1;i<poses.length;i++)if(time<poses[i].at){next=poses[i];break;}else prev=poses[i];
      const progress=prev===next?0:clamp((time-prev.at)/Math.max(.001,next.at-prev.at));
      const mix=progress*progress*(3-2*progress);
      const interpolate=(key)=>n(prev[key])+(n(next[key])-n(prev[key]))*mix;
      const interpolatePoint=(key)=>prev[key].map((v,i)=>v+(next[key][i]-v)*mix);
      const p={rootX:interpolate('rootX'),rootY:interpolate('rootY'),
        headTilt:interpolate('headTilt'),squash:interpolate('squash'),
        expression:prev.expression,grip:prev.grip,contact:prev.contact,
        leftHand:interpolatePoint('leftHand'),rightHand:interpolatePoint('rightHand'),
        leftFoot:interpolatePoint('leftFoot'),rightFoot:interpolatePoint('rightFoot')};
      const limb=(start,end,upper,lower,bend)=>{
        const dx=end[0]-start[0],dy=end[1]-start[1],d=Math.hypot(dx,dy)||.001;
        const a=(upper*upper-lower*lower+d*d)/(2*d),h=Math.sqrt(Math.max(0,upper*upper-a*a))*bend;
        return [start[0]+a*dx/d-h*dy/d,start[1]+a*dy/d+h*dx/d];
      };
      const palette=l.actor.colors||{},skin=color(palette.skin,'#D6A17E'),hair=color(palette.hair,'#283544');
      const shirt=color(palette.shirt,'#4B8BBE'),pants=color(palette.pants,'#283957');
      const accent=color(palette.accent,'#F5CC71');
      const hipY=182+p.squash*35,shoulderY=116+p.squash*16,headY=64+p.squash*25;
      const line=(start,end,stroke,size)=>`<path d="M${start.join(' ')}L${end.join(' ')}" fill="none" stroke="${stroke}" stroke-width="${size}" stroke-linecap="round"/>`;
      let limbs='';
      for(const side of ['left','right']){
        const left=side==='left',hip=[left?104:136,hipY],ankle=p[side+'Foot'];
        const knee=limb(hip,ankle,52,52,left?1:-1);
        const shoulder=[left?88:152,shoulderY],wrist=p[side+'Hand'];
        const elbow=limb(shoulder,wrist,46,48,left?1:-1);
        limbs+=line(hip,knee,pants,20)+line(knee,ankle,pants,17)+
          `<circle data-dvj-joint="${side}-knee" cx="${knee[0]}" cy="${knee[1]}" r="8" fill="${pants}"/>`+
          line(shoulder,elbow,shirt,21)+line(elbow,wrist,skin,13)+
          `<circle data-dvj-joint="${side}-elbow" cx="${elbow[0]}" cy="${elbow[1]}" r="7" fill="${shirt}"/>`+
          `<circle data-dvj-hand="${side}" cx="${wrist[0]}" cy="${wrist[1]}" r="9" fill="${skin}"/>`+
          `<ellipse data-dvj-foot="${side}" data-dvj-contact="${p.contact[side]}" cx="${ankle[0]+(left?-4:4)}" cy="${ankle[1]}" rx="15" ry="6" fill="#111C2A"/>`;
      }
      const eye=p.expression==='blink'?'<path d="M-12 -3L-5 -3M6 -3L13 -3" stroke="#192530" stroke-width="2.6"/>':
        '<ellipse cx="-8" cy="-5" rx="2.8" ry="4" fill="#182530"/><ellipse cx="9" cy="-5" rx="2.8" ry="4" fill="#182530"/>';
      const eyebrows=p.expression==='angry'?'<path d="M-16 -12L-4 -8M5 -8L17 -12" stroke="#28313B" stroke-width="3"/>':
        '<path d="M-16 -13L-5 -14M5 -14L16 -13" stroke="#28313B" stroke-width="2.5"/>';
      const mouth=p.expression==='surprised'?'<ellipse cx="1" cy="17" rx="6" ry="9" fill="#78363D"/>':
        p.expression==='happy'?'<path d="M-12 12Q0 29 13 12" fill="none" stroke="#78363D" stroke-width="3"/>':
        p.expression==='sad'?'<path d="M-11 22Q0 8 12 22" fill="none" stroke="#78363D" stroke-width="3"/>':
        '<path d="M-9 17Q0 19 10 17" fill="none" stroke="#78363D" stroke-width="2.5"/>';
      const head=`<g transform="translate(120 ${headY}) rotate(${p.headTilt})"><ellipse cx="0" cy="0" rx="28" ry="36" fill="${skin}"/>`+
        `<path d="M-28 -7Q-38 -40 -10 -39Q7 -51 26 -29L29 -6Q13 -27 -4 -24Q-16 -13 -28 -7Z" fill="${hair}"/>`+
        eye+eyebrows+mouth+'</g>';
      const held=p.grip?`<g data-dvj-held="right" transform="translate(${p.rightHand[0]+7} ${p.rightHand[1]-8})">`+
        `<rect x="-3" y="-19" width="18" height="25" rx="3" fill="${accent}"/><rect x="0" y="-15" width="12" height="4" fill="#244761"/></g>`:'';
      body=`<svg viewBox="0 0 240 320" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" data-dvj-rig="${esc(l.actor.id)}">`+
        `<g transform="translate(${p.rootX} ${p.rootY})">`+
        `<ellipse cx="120" cy="286" rx="55" ry="5" fill="#000" opacity=".17"/>`+
        `<path d="M89 ${shoulderY-10}Q120 ${shoulderY-28} 151 ${shoulderY-10}L145 ${hipY}Q120 ${hipY+8} 95 ${hipY}Z" fill="${shirt}"/>`+
        limbs+head+held+'</g></svg>';
    }
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
    if(l.type==='simulation'){
      const cfg=l.simulation||{},kind=cfg.kind||'orbit',count=Math.min(32,Math.max(1,n(cfg.count,kind==='orbit'?4:1)));
      const t=Math.max(0,time-n(cfg.start,0)),speed=n(cfg.speed,1),amp=n(cfg.amplitude,.7),damping=n(cfg.damping,.16),radius=n(cfg.radius,.34),phase=n(cfg.phase,0);
      const points=[];
      for(let i=0;i<count;i++){
        const offset=i*2*Math.PI/count+phase,omega=2*Math.PI*speed*t;
        let xx=.5,yy=.5;
        if(kind==='orbit'){
          const theta=omega+offset;xx=.5+radius*Math.cos(theta);yy=.5+radius*.7*Math.sin(theta);
        }else if(kind==='pendulum'){
          const theta=amp*Math.exp(-damping*t)*Math.cos(omega+offset);
          xx=.5+.34*Math.sin(theta);yy=.15+.68*Math.cos(theta);
        }else if(kind==='spring'){
          const value=amp*Math.exp(-damping*t)*Math.cos(omega+offset);
          xx=.5+.37*value;yy=.5+(i-(count-1)/2)*.06;
        }else if(kind==='bounce'){
          const gravity=n(cfg.gravity,9.8),period=Math.max(.15,2*speed);
          const bounce=(t+i*period/count)%period;
          const v=gravity*period/2;
          yy=.82-Math.min(.68,(v*bounce-.5*gravity*bounce*bounce)*.68/(gravity*period*period/8));
          xx=.5+(i-(count-1)/2)*.06;
        }
        points.push([Math.max(.025,Math.min(.975,xx)),Math.max(.025,Math.min(.975,yy))]);
      }
      const dot=color(l.fill,theme.accent),stroke=color(l.stroke,theme.ink||'#FFFFFF');
      const paths=kind==='pendulum'?points.map(([x,y])=>`<line x1="50" y1="15" x2="${x*100}" y2="${y*100}" stroke="${stroke}" stroke-width=".65"/>`).join(''):
        kind==='spring'?points.map(([x,y])=>`<line x1="12" y1="${y*100}" x2="${x*100}" y2="${y*100}" stroke="${stroke}" stroke-width=".65" stroke-dasharray="2 1"/>`).join(''):'';
      body=`<svg data-ms-simulation="${esc(kind)}" viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%">${paths}${points.map(([x,y],i)=>`<circle data-ms-body="${i}" cx="${(x*100).toFixed(4)}" cy="${(y*100).toFixed(4)}" r="${kind==='orbit'?3.2:4.2}" fill="${dot}" stroke="${stroke}" stroke-width=".4"/>`).join('')}</svg>`;
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
