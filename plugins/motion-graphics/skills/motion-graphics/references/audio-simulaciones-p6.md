# P6 · Audio sincronizado y simulaciones 2D

## Generación comprobable

`node scripts/generate-audio-simulation-project.mjs --kind all --seconds 4 --output p6.json`

También admite `--kind orbit|pendulum|spring|bounce`, `--format horizontal|vertical`, y una duración de 2 a 30 segundos **por simulación**. Produce `scenes[].authored.layers[]` con `type: "simulation"` y objetos `simulation` declarativos, además de un `soundDesign` con eventos en tiempo global.

## Contrato de autoría

- Los modos físicos 2D son `orbit`, `pendulum`, `spring`, `bounce`. Todos dependen exclusivamente del tiempo del render y responden de forma idéntica al buscar hacia atrás.
- Parámetros permitidos: `kind`, `count` (1–32), `speed` (0.1–8), `amplitude` (0–1), `damping` (0–5), `gravity` (0.1–30), `phase`, `radius`, `seed`, `start`. No inventar parámetros ni representar un motor 3D interactivo.
- `soundDesign.enabled` opt-in estricto, `cues` con `type`, `at`, `duration`, `gain`, y opcionalmente `pan` (-1…1), `fadeIn`, `fadeOut` en segundos; la suma de fades no puede exceder la duración.
- `soundDesign.mix` es opcional: `voicePriority` (por defecto true), `sfxGain` (0…2; por defecto 0.75), `limit` (0.2…1). El render sintetiza WAV PCM con paneo real y FFmpeg mezcla los efectos sobre el audio existente con ducking sidechain. El audio ya presente puede incluir música: el sistema **no** separa voz y música de esa pista.
- No generar audio si el proyecto no lo solicita. Con `soundDesign.enabled:false` no se sintetiza ni mezcla nada.

## Verificación y límites

Ejecutar `node --test audio-simulation-p6.test.mjs` en el repositorio y `npm run accept:audio-simulations:p6` en un entorno con Chrome, FFmpeg y FFprobe. Exigir MP4 real, 4 segmentos con movimiento diferente, presencia de pista AAC, duración correcta y métricas de sonoridad. Guardar informe y hoja de contactos. La simulación 2D es analítica, no un solver de colisiones y fluidos; la mezcla automatizada es técnica y no certifica mastering perceptual.
