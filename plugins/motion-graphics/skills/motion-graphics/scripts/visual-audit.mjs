// Geometric and semantic preflight. Browser screenshots remain mandatory to
// confirm appearance; static checks can only report known measurable defects.
const rect = r => r && [r.x,r.y,r.width,r.height].every(Number.isFinite) && r.width > 0 && r.height > 0;
const overlap = (a,b) => Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)) *
                        Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));

export function auditVisualLayout(layout, { width = 720, height = 1280, minTextPx = 24 } = {}) {
  const issues=[];
  if (!Array.isArray(layout?.elements)) return [{code:'MISSING_ELEMENTS',detail:'No hay fichas de capas medibles'}];
  for (const [i,e] of layout.elements.entries()) {
    if (!rect(e.bounds)) { issues.push({code:'INVALID_BOUNDS',index:i}); continue; }
    const b=e.bounds;
    if (b.x < 0 || b.y < 0 || b.x+b.width > width || b.y+b.height > height)
      issues.push({code:'OUT_OF_FRAME',index:i,id:e.id});
    if (e.kind==='text' && (e.fontSize ?? 0) < minTextPx) issues.push({code:'SMALL_TEXT',index:i,id:e.id});
    if (e.kind==='text' && e.readableSeconds != null && e.readableSeconds < Math.max(.65,(e.characters??0)/18))
      issues.push({code:'READING_TIME',index:i,id:e.id});
    if (e.kind==='text' && typeof e.contrastRatio==='number' && e.contrastRatio < 4.5)
      issues.push({code:'LOW_CONTRAST',index:i,id:e.id});
    if (e.purpose === 'decorative' && e.motion?.amplitude > Math.min(width,height)*.2)
      issues.push({code:'DISTRACTING_MOTION',index:i,id:e.id});
  }
  const els=layout.elements;
  for (let i=0;i<els.length;i++) for(let j=i+1;j<els.length;j++){
    const a=els[i],b=els[j];
    if (!rect(a.bounds)||!rect(b.bounds)||a.allowOverlap||b.allowOverlap) continue;
    if (a.kind!=='text'&&b.kind!=='text') continue;
    const area=overlap(a.bounds,b.bounds);
    if(area>0.05*Math.min(a.bounds.width*a.bounds.height,b.bounds.width*b.bounds.height))
      issues.push({code:'TEXT_COLLISION',first:a.id,second:b.id});
  }
  return issues;
}
