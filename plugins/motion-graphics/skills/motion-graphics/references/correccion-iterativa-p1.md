# P1 · Corrección visual iterativa con evidencia

El sistema y el complemento comparten el módulo scripts/visual-iteration.mjs dentro del paquete Motion Graphics distribuido con Motion Studio. La estructura de intercambio es motion-studio.visual-iteration/1.

## Entrada obligatoria

Solicitar al usuario el proyecto JSON exacto del render y defects.json descargado de Motion Studio (no inventar análisis ni segundos). El reporte tiene jobId, projectHash, attempt, defects[], coordenadas temporales globales/locales, sceneId, frame cercano, autoFixable y approval:PENDING_VISUAL_REVIEW.

Para verificar que el informe pertenece al mismo proyecto se compara su SHA-256. No aplicar correcciones sobre otro archivo aunque el título coincida. Las capturas reales se abren desde el mismo render en /reviews/ID/index.html mientras Motion Studio esté disponible. Si no están adjuntas o accesibles, distinguir observaciones métricas de defectos visuales confirmados.

## Corregir en Motion Graphics

1. Examinar todos los defectos por sceneId, segundo global, segundo local y captura. Priorizar errores técnicos y legibilidad; decidir si los periodos estáticos, cortes y oscuridad son intencionales. Mantener guion, voz, duración, actores y estética escogidos.
2. Usar **node scripts/repair-from-report.mjs proyecto.json defects.json --out proyecto-corregido.json --manifest cambios-p1.json** para el caso limitado y verificable LOW_TEXT_CONTRAST: fondo sólido hexadecimal y texto con color hexadecimal. El script elige blanco/negro por contraste WCAG y marca la escena approved:false. Si no hay reparaciones seguras, termina sin crear un JSON falso.
3. Para STATIC_INTERVAL, PACING_GAP, FLASH_SUSPECT, ABRUPT_VISUAL_CHANGE, LOOP_DISCONTINUITY, errores de GSAP, anatomía, oclusión y composición: inspeccionar evidencia y **reescribir la escena concreta** con HTML/CSS/GSAP o capas, corrigiendo causa y movimiento. Marcar la escena revisada como approved:false. Si se dispone de modelo visual local, Motion Studio puede intentar un plan y un render de prueba, no aprobarlo automáticamente.
4. Si aparece MISSING_AUDIO, FRAME_CAPTURE_FAILED o VISUAL_AUDIT_UNAVAILABLE, corregir recurso o entorno en Motion Studio; un cambio visual del JSON no prueba solución. No marcar aprobado si falta evidencia.
5. Ejecutar validadores de proyecto, selectores, dirección y contrato compartido; entregar JSON completo corregido y lista de defectos corregidos/pendientes. No modificar IDs ni tiempos de voz.
6. Importar el proyecto corregido en Motion Studio, **revisar y aprobar visualmente** las escenas cambiadas, utilizar «Renderizar nuevamente el JSON corregido». La ruta POST /api/iterations/rerender enlaza el render anterior, rechaza un proyecto idéntico y limita la sesión a tres renders.
7. Comparar defects.json anterior y nuevo, hojas de contactos y audio. Menos alertas heurísticas no demuestra mejor calidad; conservar approval:PENDING_VISUAL_REVIEW hasta revisión de imágenes.

## Plan artístico verificable: contrato P1 visual-revision/1

Si ChatGPT ve fotogramas reales y se identifica un defecto corregible, generar un JSON separado:

```json
{
  "schema": "motion-studio.visual-revision/1",
  "sourceJobId": "ID_EXACTO_DEL_INFORME",
  "projectHash": "SHA256_DEL_JSON_ORIGINAL",
  "scenes": [{
    "sceneId": "ID_EXISTENTE",
    "confidence": 0.9,
    "localSeconds": 1.25,
    "observation": "Hallazgo observable en el fotograma (no una suposición)",
    "type": "authoredLayers",
    "layerEdits": [{"layerId":"texto-existente","color":"#ffffff"}]
  }]
}
```

Opciones por escena: `authoredLayers` (editar solo posición, tamaño, opacidad, rotación o color de texto de IDs existentes), `customScene` (solo una escena que ya es HTML/CSS/GSAP; entregar los tres campos completos) y `motion` (presets compatibles cuando no hay código). El plan no puede modificar IDs, guion, duración, voz, medios, elenco ni número de escenas. Requiere confianza >=0.7, evidencia temporal y máximo tres escenas por plan. No basta con elevar la confianza sin ver imágenes.

Aplicar `node scripts/apply-vision-plan.mjs proyecto.json defects.json vision-plan.json --out proyecto-corregido.json --manifest revision.json`. Se validan código, selectores GSAP, contrato y hash. Las salidas se escriben sin sobrescribir. Si falla, corregir el plan, nunca suprimir validaciones. El proyecto resultante permanece sin aprobar.

## Ciclo autónomo local opcional en Motion Studio

1. Instalar y activar un modelo visual multimodal compatible con Ollama; configurar `OLLAMA_VISION_MODEL` en el archivo `.env` del sistema con el nombre exacto del modelo instalado. No descargarlo automáticamente ni enviar imágenes a FreeLLMAPI.
2. Renderizar primero el proyecto original. En su informe P1 seleccionar **Intentar corrección visual automática**. Se verifican MP4, hash, modelo local y medios.
3. El modelo recibe hasta tres capturas PNG de alta resolución por escena, y devuelve exclusivamente propuestas por escena. Motion Studio comprueba las modificaciones, valida HTML/CSS/GSAP y reintenta una vez si la propuesta es inválida.
4. Se produce otro MP4 de prueba sin sobrescribir el original ni guardar su JSON. El evaluador local compara pares de imágenes antes/después, exige confianza >=0.75, no admite nuevos errores técnicos y exige evidencias capturadas.
5. Una mejora aceptada queda como **candidato pendiente de revisión**. Si el resultado empeora, falta evidencia, falla el render o se agotan los intentos (máximo tres incluyendo el inicial), se conserva el último candidato aceptado o el original. Guardar el manifiesto `vision-iteration.json` del render.
6. Revisar de verdad el candidato y el audio, importar JSON y aprobar manualmente escenas si procede.

Esta automatización es **condicional**, no se puede probar con un modelo no instalado y no demuestra anatomía perfecta ni transferencia de estilo de referencias. La medida de calidad es evidencia humana y visual, además del análisis heurístico, y los modelos pueden juzgar mal.

## Alcance comprobable

- **Implementado:** informe por escenas, evidencia temporal, contraste determinista, contrato de planes de revisión para Motion Graphics, re-render manual y flujo automático optativo con revisor de imágenes Ollama local, validación, comparación antes/después y retención de evidencia.
- **Pendiente de homologación artística:** no existe garantía de que el modelo repare correctamente cualquier anatomía, simulación, contacto corporal, composición o estilo. Si falta un modelo visual local o no confirma mejora, el ciclo se detiene sin autoaprobar.
