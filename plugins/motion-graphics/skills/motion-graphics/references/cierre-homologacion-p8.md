# Cierre operativo de P8

P8 no es una sucesión indefinida de subfases. Esta hoja describe criterios finales y bloqueos de paridad **sin inventar resultados**.

1. Validar el contrato JSON de 33/33 casos entre Motion Graphics y Motion Studio. Un JSON importable de sustitución no prueba ejecución de la capacidad original.
2. Exigir evidencia técnica directa por capacidad (render, imágenes, mezcla, canales alfa, simulación o solicitud externa real según proceda); conservar hashes, fechas, tiempos y prueba de regresión.
3. Si hay referencia visual autorizada, comparar anterior y corregido:

```bash
node scripts/compare-reference-p83.mjs --project proyecto.json \
  --reference referencia.mp4 --before anterior.mp4 --after corregido.mp4 \
  --out revision.json
```

El informe rechaza un candidato si es peor en luminancia, saturación o peso compositivo, o introduce nuevas alertas; **solo produce candidato para revisión**, nunca aprobación artística.

4. En Motion Studio, con el JSON y MP4 de origen exactos, `POST /api/iterations/auto` acepta opcionalmente `referenceAsset: "user-assets/archivo.mp4"`. Valida que sea un MP4 importado localmente y requiere Ollama multimodal instalado. Si existe referencia, un nuevo render se compara contra la misma antes de entregarse como candidato. Un modelo local no instalado no se sustituye por una conexión externa silenciosa.
5. Generar y conservar el informe en `npm run homologation:p8:ci`; ejecutar `npm run homologation:p8:strict` para la paridad original de los 33 casos. El gate estricto debe fallar mientras haya casos no homologados con evidencia específica. La dirección artística real, licencias y servicios pagados requieren evaluación separada.

No promover artificialmente las 32 capacidades pendientes a `verified` a partir de tests unitarios, MP4 de demostración o puntuaciones de píxeles. Documentar el bloqueo final por capacidad y dejar esa etapa cerrada operativamente hasta disponer de insumos externos verificables.
