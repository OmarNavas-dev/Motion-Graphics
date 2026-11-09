# P8.1: autoría determinista de marca, brief y prompt

Usar el mismo motor `src/authoring-workflows-p81.mjs` en Motion Studio y en el complemento.

## Entrevista de marca (`brand-intake`)

Recibir `name`, `description`, `audience`, `offer`, `feeling`, `font`, `colors` (`background`, `ink`, `accent` en HEX), `avoid` (lista) y de 3 a 5 `references` con `source`, `observation`, `confidence` (`observed`, `inferred`, `unknown`). `logo` y `motionRules` son opcionales. Si faltan datos devolver `ready:false` con preguntas específicas. Si está completo generar `brand.md`, `MOTION.md` y `CLAUDE.md`, marcando reglas de animación aún desconocidas como `ASK ME`. No fingir inspección visual.

## Brief cuantitativo (`motion-brief-writer`)

Recibir `{brand,idea}`. `idea` necesita `hero`, `before`, `after`, `exactText` (textos literales), `size` (1080x960, 1080x1350, 1080x1920 o 1920x1080), `duration` (3–30 s), `numbers` con `label`, `value` y `kind` (`measured`, `target`, `illustrative`). Dividir la duración en cuatro estados temporizados y exigir retorno a inicio. No confundir objetivos con resultados medidos. Es un plan, aún no un video comprobado.

## Prompt de movimiento (`motion-prompt-writer`)

Recibir el mismo objeto `{brand,idea}`. Entregar las ocho secciones: The bar, Format, The one rule, Look, Motion, Never, Before you finish, The scene, seguidas de un recordatorio de originalidad. Mantener exactamente textos y cifras, sin logos ni datos fabricados.

## Ejecución

```bash
node scripts/generate-authoring-p81.mjs --kind brand-intake --input marca.json --out resultado
node scripts/generate-authoring-p81.mjs --kind motion-brief-writer --input brief.json --out resultado
node scripts/generate-authoring-p81.mjs --kind motion-prompt-writer --input brief.json --out resultado
```

Motion Studio acepta los mismos datos con `POST /api/authoring/p81`, campo `kind` incluido. Responde HTTP 422 con preguntas si falta información. El inventario de 33 capacidades permanece en `partial` para estos tres flujos hasta comprobar el resultado en una producción real.
