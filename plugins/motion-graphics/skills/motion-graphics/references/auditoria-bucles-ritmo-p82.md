# P8.2 · Auditoría compartida de bucles y ritmo

Motion Studio y Motion Graphics comparten exactamente `src/loop-quality-audit.mjs` y `src/pacing-quality-audit.mjs`.

En el complemento, ejecutar:

```bash
node scripts/audit-video-p82.mjs video.mp4
```

Requiere `ffmpeg` y `ffprobe` accesibles; necesita un archivo de video real, no un JSON supuesto. El informe registra `loop.cycle` con cuatro cuadros en torno al cierre (primero, segundo, penúltimo y último), además de `pacing.holdWindows`, `pacing.flashWindows` y `pacing.correctiveHints` en segundos. No exige duplicar el primer fotograma al final de un ciclo cuando la animación es continua.

Los avisos de pausa o destello son hipótesis objetivas. Una pausa deliberada, un corte creativo o una transición de color podrían ser perfectamente válidos. Inspeccionar los cuadros señalados, consultar la intención narrativa y aprobar con un humano; no autocorregir eliminando escenas ni afirmar equivalencia con referencias sin verlas.
