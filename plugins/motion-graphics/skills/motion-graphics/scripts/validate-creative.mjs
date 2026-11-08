#!/usr/bin/env node
import fs from 'node:fs';
import { validateCreativeDirection, validateExplainerOutline } from './creative-direction.mjs';
import { validateEffectUsage } from './effect-recipes.mjs';
import { auditVisualLayout } from './visual-audit.mjs';

export function validateCreativeBundle(bundle) {
  const failures = validateCreativeDirection(bundle?.direction).map(message=>`direction: ${message}`);
  failures.push(...validateExplainerOutline(bundle?.outline).map(message=>`outline: ${message}`));
  failures.push(...validateEffectUsage(bundle?.effects ?? []).map(message=>`effects: ${message}`));
  for (const [i,layout] of (bundle?.layouts ?? []).entries())
    failures.push(...auditVisualLayout(layout).map(e=>`layout ${i}: ${e.code} (${e.id ?? e.first ?? ''})`));
  return failures;
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  if (!process.argv[2]) { console.error('Uso: node validate-creative.mjs creative-bundle.json'); process.exit(2); }
  try {
    const failures = validateCreativeBundle(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));
    if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
    console.log('Dirección, beats, efectos y fichas visuales coherentes. Falta inspección perceptual de fotogramas reales.');
  } catch(e) { console.error(e.message); process.exit(1); }
}
