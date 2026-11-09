# P1: circuito de revisión visual y re-render

Implementación integrada con el paquete Motion Graphics 2.9.5 y Motion Studio.
El módulo de contrato y reparación está físicamente en plugins/motion-graphics/skills/motion-graphics/scripts/visual-iteration.mjs, importado directamente por el servidor y el complemento: no hay dos implementaciones divergentes.

## Flujo de trabajo

1. Motion Graphics genera JSON y Motion Studio valida, renderiza y extrae MP4.
2. Motion Studio toma fotogramas al inicio, centro y final de cada escena, mide congelamientos, contraste, cambios bruscos, ritmo, cortes, pista de audio y salto del bucle.
3. La ruta GET /api/jobs/ID expone visualDefects y el índice de inspección; /reviews/ID/defects.json entrega el informe estructurado completo.
   Si HyperFrames falla en revisión GSAP antes del MP4, crea igualmente defects.json con MISSING_GSAP_TARGET, escena e instante reportado; ese fallo también admite re-render tras corregir el proyecto.
4. El informe usa motion-studio.visual-iteration/1: contiene projectHash, jobId, sourceJobId, attempt, defects con sceneId, seconds, localSeconds, frame, code, severity y autoFixable. No contiene una puntuación artística.
5. Motion Graphics recibe el JSON original y defects.json, contrasta su hash, abre los fotogramas reales si están disponibles y corrige las escenas. El CLI realiza exclusivamente el ajuste seguro y medible de contraste en textos de capas editables sobre un fondo hexadecimal uniforme. Los demás casos requieren reautoría explícita.
6. Las escenas alteradas quedan pendientes de aprobación. Al importar y aprobar un JSON diferente, el botón «Renderizar nuevamente el JSON corregido» llama POST /api/iterations/rerender con sourceJobId y project. Se conservan el enlace entre renders y el número de iteración (máximo tres).
7. GET /api/jobs/ID incluye iterationComparison con alertas técnicas antes/después. La aprobación artística sigue pendiente hasta una inspección real de imágenes y audio.

## Seguridad y límites

- La API rechaza enlaces a trabajos desconocidos o sin informe P1, proyectos idénticos, escenas sin aprobar, falta de medios y una cuarta ronda. Las rutas de archivos usan IDs UUID y nombres fijos.
- No se elimina ni se sobreescribe el MP4 previo al repetir render.
- El CLI no sobrescribe archivos; usa escritura exclusiva y falla si no existe una reparación segura. Rechaza informes cuyo projectHash no coincida.
- Los cambios de brillo de una escena, quietud intencional y cortes narrativos solo generan avisos heurísticos. Las métricas no prueban calidad estética, realismo, contacto ni relación semántica con la voz.
- No hay ciclo de mejora artística autónomo multi-paso; requiere volver al complemento con el informe y aprobar las escenas corregidas en el editor.

## Verificaciones

- npm test: contrato P1, asignación temporal por escena, protección de hash, reparación verificable y sin sobrescritura.
- npm run lint; npm run studio:build; npm run plugin:check.
- npm run accept:five:render: genera cinco MP4 reales, fotogramas y defects.json en cada carpeta de aceptación. Las alertas no equivalen a una prueba humana de calidad.
- Para prueba completa en UI: renderizar una escena con texto oscuro sobre fondo oscuro, descargar defects.json y el JSON original, corregir con Motion Graphics, importar el corregido, aprobar la escena, re-renderizar y comparar ambos informes y hojas de contactos.
