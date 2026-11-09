# P1 · Corrección visual iterativa con evidencia

El sistema y el complemento comparten el módulo scripts/visual-iteration.mjs dentro del paquete Motion Graphics distribuido con Motion Studio. La estructura de intercambio es motion-studio.visual-iteration/1.

## Entrada obligatoria

Solicitar al usuario el proyecto JSON exacto del render y defects.json descargado de Motion Studio (no inventar análisis ni segundos). El reporte tiene jobId, projectHash, attempt, defects[], coordenadas temporales globales/locales, sceneId, frame cercano, autoFixable y approval:PENDING_VISUAL_REVIEW.

Para verificar que el informe pertenece al mismo proyecto se compara su SHA-256. No aplicar correcciones sobre otro archivo aunque el título coincida. Las capturas reales se abren desde el mismo render en /reviews/ID/index.html mientras Motion Studio esté disponible. Si no están adjuntas o accesibles, distinguir observaciones métricas de defectos visuales confirmados.

## Corregir en Motion Graphics

1. Examinar todos los defectos por sceneId, segundo global, segundo local y captura. Priorizar errores técnicos y legibilidad; decidir si los periodos estáticos, cortes y oscuridad son intencionales. Mantener guion, voz, duración, actores y estética escogidos.
2. Usar **node scripts/repair-from-report.mjs proyecto.json defects.json --out proyecto-corregido.json --manifest cambios-p1.json** para el caso limitado y verificable LOW_TEXT_CONTRAST: fondo sólido hexadecimal y texto con color hexadecimal. El script elige blanco/negro por contraste WCAG y marca la escena approved:false. Si no hay reparaciones seguras, termina sin crear un JSON falso.
3. Para STATIC_INTERVAL, PACING_GAP, FLASH_SUSPECT, ABRUPT_VISUAL_CHANGE, LOOP_DISCONTINUITY, errores de GSAP, anatomía, oclusión y composición: inspeccionar evidencia y **reescribir la escena concreta** con HTML/CSS/GSAP o capas, corrigiendo causa y movimiento. Marcar la escena revisada como approved:false.
4. Si aparece MISSING_AUDIO, FRAME_CAPTURE_FAILED o VISUAL_AUDIT_UNAVAILABLE, corregir recurso o entorno en Motion Studio; un cambio visual del JSON no prueba solución. No marcar aprobado si falta evidencia.
5. Ejecutar validadores de proyecto, selectores, dirección y contrato compartido; entregar JSON completo corregido y lista de defectos corregidos/pendientes. No modificar IDs ni tiempos de voz.
6. Importar el proyecto corregido en Motion Studio, **revisar y aprobar visualmente** las escenas cambiadas, utilizar «Renderizar nuevamente el JSON corregido». La ruta POST /api/iterations/rerender enlaza el render anterior, rechaza un proyecto idéntico y limita la sesión a tres renders.
7. Comparar defects.json anterior y nuevo, hojas de contactos y audio. Menos alertas heurísticas no demuestra mejor calidad; conservar approval:PENDING_VISUAL_REVIEW hasta revisión de imágenes.

## Alcance comprobable

- **Implementado:** informe estructurado por escenas, evidencia temporal, autocorrección de contraste en capas editables con fondo sólido, detección de cambios reales del JSON, re-render manual enlazado y comparación técnica antes/después.
- **No automático:** rediseño de ilustraciones SVG/GSAP arbitrarias, anatomía, contacto corporal, simulaciones, composición artística ni juicio visual perceptual. El complemento puede proponer esos cambios tras estudiar las imágenes; no debe afirmar que un algoritmo de diferencias de píxeles los corrigió.
