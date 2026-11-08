# Cambios de la versión 2.1.0

## Añadido
- `scenery-kit.mjs`: `skyCycle`, `ocean`, `oceanFront`, `boat`, `nave` (con proyección `pt`), `cellRoom`.
- `props-kit.mjs`: `candle`, `recumbentFigure`, `closeUp`, `petals`, `parchment`, `waxSeal`, `stamp`, `openBook`, `eye`, `crossMarkup`, `haloMarkup`.
- `hud-kit.mjs`: `chip`, `chapterBadge`, `meterBar`, `heartRate`, `stopwatch`.
- `endcard-kit.mjs`: `endCard` (exige logotipo y nombre del usuario).
- `photo-kit.mjs`: `photo` con zoom lento (no verificada en Motion Studio).
- `camera()` con `safeTop` (defecto 330): el arte no sube hacia título y subtítulo al acercarse.
- `references/escenarios-objetos-hud.md`, `references/recetas-narrativas.md`, `examples/formatos-referencia.mjs`, `assets/formatos-referencia.json`, `tests/scenery-props-hud.test.mjs` (11 pruebas).
- SKILL.md: filas de la tabla, excepción de la tarjeta de cierre del propio canal y aviso sobre `safeTop`.

## Verificación real
- Pruebas: 48 de 48 (37 previas + 11 nuevas), cada archivo por separado con `node --test`.
- `validate-project.mjs` con tiempos de palabra: sin errores en la demo de siete escenas.
- Renderizado con GSAP y Chromium (`preview-frames.py`): siete escenas revisadas fotograma a fotograma; se corrigieron el desplazamiento del pergamino y el espaciado del botón del cierre.

## No verificado
- Reproducción y exportación dentro de Motion Studio.
- `photo()` con una imagen real y su resolución de ruta.
- Los tiempos de subtítulo de `assets/formatos-referencia.json` son SINTÉTICOS (solo prueban el estilo); no son tiempos de un audio real.
- La transcripción (`transcribe.py`) depende de un modelo local que no se pudo probar.
