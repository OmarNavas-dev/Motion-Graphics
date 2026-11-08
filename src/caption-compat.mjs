// Repair only the three optional-handle calls emitted by add-captions <= 1.7.
// Missing words, captions and other animation targets must still be reported.
export function guardLegacyCaptionHandles(script) {
  const targets = [
    'S+" .dvj-handle"',
    'prev.querySelectorAll(".dvj-handle")',
    'n.querySelectorAll(".dvj-handle")',
  ];
  let result = String(script || '');
  for (const target of targets) {
    const nodes = target.startsWith('S+') ? `document.querySelectorAll(${target})` : target;
    // Canonical generated statements only; this does not rewrite arbitrary JS.
    for (const [visibility, at] of [['hidden', 'T0'], ['hidden', 'T0+a'], ['visible', 'T0+a']]) {
      const call = `tl.set(${target},{visibility:"${visibility}"},${at});`;
      const guarded = `{const handles=${nodes};if(handles.length)tl.set(handles,{visibility:"${visibility}"},${at});}`;
      result = result.replaceAll(call, guarded);
    }
  }
  return result;
}

// Older caption blocks could schedule a carried word before scene time zero.
// Normalize only the known generator block; never evaluate arbitrary source.
export function repairLegacyCaptionTiming(script) {
  const block=/\{const groups=(\[[^;\n]*\]);tl\.set\(S\+" \.dvj-caption",\{autoAlpha:0\},T0\);[\s\S]*?\}\);tl\.set\(e,\{autoAlpha:0\},T0\+g\.hide\);\}\);\}/g;
  return String(script||'').replace(block,(text,json)=>{
    let groups;
    try{groups=JSON.parse(json);}catch{return text;}
    if(!Array.isArray(groups)||!groups.every(g=>Number.isFinite(g.hide)&&g.hide>=-.020001&&Array.isArray(g.w)&&g.w.every(w=>Array.isArray(w)&&Number.isFinite(w[0])&&w[0]>=0&&Number.isFinite(w[1])&&w[1]>=w[0]&&typeof w[2]==='boolean')))return text;
    return text.replace(json,JSON.stringify(groups.map(g=>({...g,hide:Math.max(0,g.hide)})))).replaceAll('Math.min(.14,g.hide-a)','Math.min(.14,Math.max(0,g.hide-a))');
  });
}
export const repairLegacyCaptionScript=script=>repairLegacyCaptionTiming(guardLegacyCaptionHandles(script));
