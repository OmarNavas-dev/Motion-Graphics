// Visible assembly metadata is not part of the narrated illustration.
// This validator reports it; it never deletes explanatory labels or captions.
export function checkEditorialOverlays(raw) {
  const project = raw?.project ?? raw;
  const errors = [];
  for (const scene of project?.scenes ?? []) {
    const html = scene.customScene?.html ?? '';
    const height = Number(html.match(/viewBox=["']\s*[-\d.]+\s+[-\d.]+\s+[\d.]+\s+([\d.]+)["']/i)?.[1] ?? 1280);
    const texts = [...html.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/gi)].map(([, attrs, body]) => ({
      text: body.replace(/<[^>]*>/g, '').trim(),
      y: Number(attrs.match(/\by=["']([\d.]+)["']/i)?.[1] ?? -1),
      size: Number(attrs.match(/\bfont-size=["']([\d.]+)["']/i)?.[1] ?? 100),
    }));
    const footer = texts.filter(t => t.y >= height * .88 && t.size <= 24);
    const sceneCounter = footer.some(t => /^\d{1,3}\s*\/\s*\d{1,3}$/.test(t.text));
    const namedFooter = /ARCHIVO DE UNA INVENCI[ÓO]N/i.test(html);
    const explicitFooter = /(?:class|data-role)=["'][^"']*\b(?:editorial-footer|scene-counter|watermark)\b[^"']*["']/i.test(html);
    if (namedFooter || explicitFooter || (sceneCounter && footer.length >= 2)) {
      errors.push(`${scene.id}: quitar el pie editorial, la firma y la numeracion de escenas del HTML visible.`);
    }
  }
  return errors;
}
