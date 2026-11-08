// Fast, DOM-free preflight for unambiguous scene selectors. Do not block complex
// CSS selectors, which must be checked by the browser runtime reviewer.
const capture = (source, attribute) => [...String(source ?? '').matchAll(new RegExp(`\\b${attribute}\\s*=\\s*(["'])(.*?)\\1`, 'g'))].map(m => m[2]);
const validSimple = v => /^[.#][A-Za-z_][\w-]*$/.test(v);

function selectorsFromTimeline(script) {
  const targets = [];
  for (const m of String(script ?? '').matchAll(/\bS\s*\+\s*(["'`])\s+([^"'`]+)\1/g))
    for (const part of m[2].split(',')) {
      const selector = part.trim();
      if (validSimple(selector)) targets.push(selector);
    }
  return targets;
}

export function checkCustomScenePreflight(project) {
  const errors = [], warnings = [], idsGlobal = new Map();
  for (const [index, scene] of (project?.scenes ?? []).entries()) {
    const html = scene.customScene?.html;
    if (!html) continue;
    const label = `Escena ${index + 1} (${scene.id})`;
    const classes = new Set(capture(html, 'class').flatMap(v => v.trim().split(/\s+/)));
    const ids = capture(html, 'id');
    const local = new Set();
    for (const id of ids) {
      if (local.has(id)) errors.push(`${label}: ID HTML duplicado #${id}. Asigna un ID único a cada elemento.`);
      local.add(id);
      if (idsGlobal.has(id) && idsGlobal.get(id) !== scene.id)
        errors.push(`${label}: ID HTML #${id} repetido en ${idsGlobal.get(id)}. Prefija los IDs por escena.`);
      idsGlobal.set(id, scene.id);
    }
    const actions = (scene.direction?.actions ?? []).map(a => a.selector).filter(Boolean);
    const selectors = new Set([...actions, ...selectorsFromTimeline(scene.customScene.script)]);
    for (const selector of selectors) {
      if (!validSimple(selector)) {
        warnings.push(`${label}: selector complejo ${selector}; revisar en navegador.`);
        continue;
      }
      const found = selector[0] === '.' ? classes.has(selector.slice(1)) : local.has(selector.slice(1));
      if (!found) errors.push(`${label}: falta el objetivo ${selector} indicado por GSAP o la ficha de acción. Corrige HTML o selector antes de renderizar.`);
    }
  }
  return {passed: errors.length === 0, errors, warnings};
}
