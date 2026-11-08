const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
// Words remain on their supplied clock. Grouping affects layout only.
export function wordCaptionGroups(words, start, duration) {
  const local = words
    .filter((w) => w.end > start && w.start < start + duration)
    .map((w) => ({ ...w, start: w.start - start, end: w.end - start }));
  const groups = [];
  let group = [];
  for (const word of local) {
    const previous = group[group.length - 1];
    if (
      group.length &&
      (group.length >= 5 ||
        group.map((w) => w.text).join(" ").length + word.text.length > 38 ||
        word.start - previous.end > 0.45 ||
        /[.!?;:]$/.test(previous.text))
    ) {
      groups.push(group);
      group = [];
    }
    group.push(word);
  }
  if (group.length) groups.push(group);
  return groups;
}
export function wordCaptionTrack(words, start, duration, key) {
  const groups = wordCaptionGroups(words, start, duration),
    js = [],
    html = [];
  groups.forEach((group, i) => {
    const cid = `${key}-wc-${i}`;
    html.push(
      `<div id="${cid}" class="ms-word-caption">${group.map((w, j) => `<span id="${cid}-${j}" data-word-start="${w.start}" data-word-end="${w.end}" class="ms-caption-word">${esc(w.text)}</span>`).join(" ")}</div>`,
    );
    js.push(`tl.set('#${cid}',{autoAlpha:0},T0);`);
    group.forEach((w, j) => {
      const at = Math.max(0, w.start),
        wid = `#${cid}-${j}`;
      js.push(
        `tl.set('${wid}',{display:'none',color:'#ffffff80',fontWeight:500,borderColor:'transparent'},T0);`,
      );
      if (j === 0) js.push(`tl.set('#${cid}',{autoAlpha:1},T0+${at});`);
      if (j)
        js.push(
          `tl.set('#${cid}-${j - 1}',{color:'#ffffff80',fontWeight:500,borderColor:'transparent'},T0+${at});`,
        );
      js.push(
        `tl.set('${wid}',{display:'inline-block',color:'#fff',fontWeight:800,borderColor:'${w.emphasis ? "#4c8dff" : "transparent"}'},T0+${at});`,
      );
    });
    const next = groups[i + 1]?.[0]?.start ?? duration;
    const hide = Math.min(duration, next, group[group.length - 1].end + 0.18);
    js.push(`tl.set('#${cid}',{autoAlpha:0},T0+${Math.max(0, hide)});`);
  });
  return { html: html.join(""), script: js.join("\n") };
}
export const WORD_CAPTION_CSS = `.ms-word-caption{position:absolute;top:9%;left:8%;width:84%;font:500 34px/1.3 Arial,Helvetica,sans-serif;text-align:center;color:#fff;z-index:900;visibility:hidden;pointer-events:none;text-shadow:0 2px 8px #000c}.ms-caption-word{display:none;border:2px solid transparent;border-radius:2px;padding:0 2px}`;
