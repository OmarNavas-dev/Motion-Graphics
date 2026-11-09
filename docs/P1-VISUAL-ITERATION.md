# P1: circuito de revisión visual y re-render

Implementación integrada con el paquete Motion Graphics 2.10.0 y Motion Studio.
El módulo de contrato y reparación está físicamente en plugins/motion-graphics/skills/motion-graphics/scripts/visual-iteration.mjs, importado directamente por el servidor y el complemento: no hay dos implementaciones divergentes.

## Flujo de trabajo

1. Motion Graphics genera JSON y Motion Studio valida, renderiza y extrae MP4.
2. Motion Studio toma fotogramas al inicio, centro y final de cada escena, mide congelamientos, contraste, cambios bruscos, ritmo, cortes, pista de audio y salto del bucle.
3. La ruta GET /api/jobs/ID expone visualDefects y el índice de inspección; /reviews/ID/defects.json entrega el informe estructurado completo.
   Si HyperFrames falla en revisión GSAP antes del MP4, crea igualmente defects.json con MISSING_GSAP_TARGET, escena e instante reportado; ese fallo también admite re-render tras corregir el proyecto.
4. El informe usa motion-studio.visual-iteration/1: contiene projectHash, jobId, sourceJobId, attempt, defects con sceneId, seconds, localSeconds, frame, code, severity y autoFixable. No contiene una puntuación artística.
5. Motion Graphics recibe el JSON original y defects.json, contrasta su hash y abre los fotogramas reales. Además del CLI determinista, puede crear un plan `motion-studio.visual-revision/1` con evidencia, confianza y correcciones por escena. `scripts/apply-vision-plan.mjs` valida y aplica cambios en capas, movimiento o HTML/CSS/GSAP existente, sin modificar narración ni IDs.
6. Las escenas alteradas quedan pendientes de aprobación. Al importar y aprobar un JSON diferente, el botón «Renderizar nuevamente el JSON corregido» llama POST /api/iterations/rerender con sourceJobId y project. Se conservan el enlace entre renders y el número de iteración (máximo tres).
7. GET /api/jobs/ID incluye iterationComparison con alertas técnicas antes/después. La aprobación artística sigue pendiente hasta una inspección real de imágenes y audio.

## P1 avanzado: corrección visual automática local y reversible

- Configurar `OLLAMA_VISION_MODEL` con un modelo visual de Ollama ya instalado, ejecutándose **localmente**. `GET /api/integrations` indica si se configuró. Se comprueba con la API local `/api/tags`, sin descargar modelos ni transferir imágenes a proveedores externos.
- `POST /api/iterations/auto` con `{sourceJobId,project}` exige un render MP4 completo, JSON exacto, medios locales y ausencia de otro render. Responde `{sessionId}`; `GET /api/iterations/auto/ID` devuelve estado, progreso, diagnósticos y candidato.
- Se capturan 3 fotogramas reales PNG (640 px) de hasta 3 escenas priorizadas. Un modelo multimodal local recibe imágenes y defectos; puede proponer solo `customScene` existente, propiedades acotadas de capas `authored`, o movimientos declarativos. Se validan los cambios (y selectores GSAP) con un segundo intento si el código es inválido.
- Un render de prueba interno no altera `data/studio-project.json`, no sobreescribe el MP4 original y conserva `approved:false`. Otro análisis visual local compara pares ANTES/DESPUÉS en los mismos segundos; exige confianza al menos 0.75, que no aumenten los errores técnicos y que existan imágenes de evidencia. El resultado queda en `/reviews/ID/vision-iteration.json`.
- Hasta tres renders vinculados incluyendo el inicial. Una revisión sin mejora comprobable o un fallo deja intacto el original. El usuario debe inspeccionar e importar manualmente el candidato; no existe aprobación artística automática.

El modelo visual puede equivocarse: estos controles no prueban que el resultado iguale una referencia ni reemplazan una prueba perceptual realizada por personas.

## Seguridad y límites

- La API rechaza enlaces a trabajos desconocidos o sin informe P1, proyectos idénticos, escenas sin aprobar, falta de medios y una cuarta ronda. Las rutas de archivos usan IDs UUID y nombres fijos.
- No se elimina ni se sobreescribe el MP4 previo al repetir render.
- El CLI no sobrescribe archivos; usa escritura exclusiva y falla si no existe una reparación segura. Rechaza informes cuyo projectHash no coincida.
- Los cambios de brillo de una escena, quietud intencional y cortes narrativos solo generan avisos heurísticos. Las métricas no prueban calidad estética, realismo, contacto ni relación semántica con la voz.
- Sin modelo visual instalado, el flujo continúa siendo manual o limitado a correcciones deterministas. El sistema no instala ni selecciona modelos por cuenta propia; la configuración es explícita.
- El ciclo asistido por modelo no autoriza aprobar imágenes automáticamente. Todo candidato requiere inspección humana, y los pasos de corrección de código se validan antes de renderizar.

## Verificaciones

- npm test: contrato P1, asignación temporal por escena, protección de hash, reparación verificable y sin sobrescritura.
- npm run lint; npm run studio:build; npm run plugin:check.
- npm run accept:five:render: genera cinco MP4 reales, fotogramas y defects.json en cada carpeta de aceptación. Las alertas no equivalen a una prueba humana de calidad.
- node --test visual-autonomous.test.mjs: cubre modelo visual simulado con imágenes, planes permitidos y prohibidos, retención del proyecto original, comparación antes/después y bloqueo de falsos éxitos. La aceptación CI no contiene un modelo visual instalado, por tanto no certifica su criterio artístico.
- Para prueba completa en UI: renderizar una escena con texto oscuro sobre fondo oscuro, descargar defects.json y el JSON original, corregir con Motion Graphics, importar el corregido, aprobar la escena, re-renderizar y comparar ambos informes y hojas de contactos.
