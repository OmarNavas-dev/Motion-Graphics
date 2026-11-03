# Prueba de aceptación Motion Studio 7.1

Esta prueba demuestra qué funciona y qué debe fallar.

## Preparación

En una consola dentro de la carpeta del proyecto:

```powershell
npm ci
npm run check:system
npm run test:acceptance-v71
```

Se necesita Node.js 22+, FFmpeg y FFprobe. La prueba genera un proyecto temporal, arranca el servidor local, crea un MP4 real y elimina sus archivos temporales al terminar.

## Resultados que deben aparecer

Correcto:

- servidor local disponible;
- guarda resolución 1080p y 30 FPS;
- acepta un PNG válido;
- rechaza un `.exe`;
- bloquea un render con una escena no aprobada;
- produce un MP4 H.264 de 1080×1920 a 30 FPS.

La última línea esperada es:

```text
PRUEBA DE ACEPTACIÓN V7.1 SUPERADA
```

## Qué demuestra

El flujo de servidor, validación, aprobación, render CPU y metadatos finales del MP4. No demuestra calidad artística ni que una escena `customScene` sea visualmente idéntica a una referencia; eso requiere revisión humana y la vista previa fiel.

## Qué debe fallar correctamente

La prueba también comprueba fallos intencionales:

1. Archivo peligroso (`fuente.exe`) → HTTP 400.
2. Escena no aprobada → render HTTP 400.
3. Si el MP4 no es H.264, no mide 1080×1920 o no es 30 FPS → la prueba termina con error.

## Prueba manual en el editor

1. Ejecuta `abrir-motion-studio.cmd`.
2. En el inspector selecciona `1080p` y `30 FPS`.
3. Importa una fuente `.woff2`, `.ttf` u `.otf`.
4. Carga una imagen y crea una escena.
5. Aprueba la escena.
6. Pulsa **Vista previa fiel** y revisa el HTML real de HyperFrames.
7. Pulsa **Exportar MP4 · HyperFrames**.
8. Ejecuta `node scripts/verify-render.mjs out/<archivo>.mp4` para validar el archivo final.

La prueba automática es la evidencia técnica; la revisión manual es la evidencia visual.