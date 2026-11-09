# P8 · 33 JSON completos y matriz de evidencia real

El inventario canónico de `docs/reference-parity.json` contiene **33 capacidades** de los cuatro repositorios y objetivos propios de Motion Studio. El complemento incluye una copia sincronizada en `scripts/compat/docs/reference-parity.json`.

## Comprobar autoría en ChatGPT

Ejecutar `node scripts/homologate-p8.mjs --out casos-p8`. Produce **33 JSON importables**, revalida cada uno con el contrato del complemento y exige que un segundo guardado no los altere. Un JSON de muestra puede ser un `contract-proxy`: sirve para probar que Motion Studio importa el documento, **no prueba que la capacidad original esté implementada**.

## Comprobar ejecución en Motion Studio

En el repositorio: `npm run homologation:p8` valida los 33 JSON. En GitHub Actions, el trabajo `homologation-p8` se ejecuta solo después de las aceptaciones P2, P3, P4, P5 y P6 y descarga sus resultados reales. Ejecuta `npm run homologation:p8:ci` y conserva `out/p8-final/MATRIZ-P8.md`, `report.json` y los 33 JSON.

Las categorías de prueba directa tienen MOV ProRes con alfa y composición MP4, 21 MP4 de estilos, 12 MP4 de flujos, 5 MP4 de personajes y 4 MP4 de simulaciones con AAC. El auditor verifica archivos reales con FFprobe, hashes y resultados de las pruebas de movimiento/mezcla. **Evidencia técnica directa no equivale a igualdad visual ni funcional integral con el repositorio de referencia.**

## Homologación estricta y límites

`npm run homologation:p8:strict` devuelve error mientras no existan 33 casos con estado `verified` y evidencia directa. Conservar `partial`, `external` y sus bloqueos hasta que una prueba específica demuestre equivalencia. No convertir `web-sims` 2D en física interactiva; no certificar SAM 2.1 mediante una API de eliminación de fondo; no declarar Higgsfield ejecutado a partir de un plan. Mantener aprobación artística humana separada de todas las métricas de CI.
