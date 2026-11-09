# P8.3 · Comparación de referencia y resultado

Usar una referencia audiovisual que el usuario esté autorizado a utilizar y un MP4 **realmente renderizado** desde el JSON de Motion Studio. El complemento y el sistema comparten el motor `src/reference-alignment-p83.mjs`.

```bash
node scripts/compare-reference-p83.mjs \
  --project proyecto.json --reference referencia.mp4 \
  --rendered exportado.mp4 --out informe.json
```

Se extraen tres parejas de cuadros por escena (opción de motor: 1–5), alineadas por progreso temporal relativo si los videos tienen diferente duración. Se mide la luminancia, saturación y distribución espacial de masa de contraste a la misma resolución. Cada muestra se vincula a un `sceneId` y segundo exacto; se registran las huellas SHA-256 de ambos archivos.

Interpretar los avisos como indicios para revisión visual, no como similitud semántica o estética. Una diferencia puede corresponder a narración o composición intencionalmente distinta. Proponer correcciones concretas solo después de comparar físicamente los pares de imágenes, validar el JSON y renderizar otra vez. Conservar `PENDING_HUMAN_REVIEW` hasta aprobar la animación, estilo, licencias y contenido; no aplicar cambios automáticos derivados únicamente de métricas de píxeles.
