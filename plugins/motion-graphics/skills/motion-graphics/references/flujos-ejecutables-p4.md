# P4 · Flujos especializados ejecutables

P4 mantiene los documentos originales en `references/source-guides/` y agrega un contrato funcional para **12 flujos que generan vídeo**. Las recetas se implementan en `scripts/compat/src/specialized-workflows.mjs`; Motion Studio usa exactamente ese código fuente y renderiza `authored.layers` cuadro a cuadro. No sustituir hechos reales por los ejemplos de aceptación.

## Flujos disponibles

| ID | Entradas de producción | Salida comprobable |
| --- | --- | --- |
| `explainer-default` | producto, mensaje y marca | explicativo de interfaz / MP4 + sonido |
| `explainer-engaging` | producto, mensaje, 3–6 estaciones | toma continua, elemento viajero y cámara por keyframes / MP4 |
| `explainer-high-energy` | producto, mensaje y marca | composición rápida y titulares / MP4 + Foley |
| `animated-chart` | etiquetas y cifras exactas; fuente o `illustrative:true` | gráficos con movimiento determinista / MP4 |
| `apple-launch-film` | producto, mensaje y lista `facts` aportada | secuencia de widgets ficticios sin usar logotipos ajenos / MP4 |
| `launch-video` | producto, mensaje, pruebas visuales reales y CTA | escenas de lanzamiento / MP4 |
| `loop-cover` | `coverAsset` autorizado y nombre `element` | portada fija con un único elemento animado / MP4 + GIF de 180 cuadros |
| `milestone-reveal` | cifra literal, etiqueta y fuente | aparición por etapas / MP4, cierre medido |
| `model-showdown` | tres vídeos locales, nombre de cada modelo y mismo brief | 3 fuentes simultáneas / MP4; no altera las fuentes |
| `newsletter-promo` | nombre, enlace, gancho y tres pruebas de la edición | gancho → tres pruebas → cierre / MP4 |
| `title-sequence-3d` | línea de cierre y mundo escogido | proyección local **2.5D**, no motor físico 3D / MP4 |
| `vox-explainer` | pregunta y hechos con fuente individual | encuadres editoriales / MP4 |

`brand-intake`, `motion-brief-writer`, `motion-prompt-writer`, `motion-effects`, `reference-to-motion` y `reel-export` son **flujos auxiliares de autoría, efectos, análisis o exportación**, no seis formatos nuevos de vídeo. `motion-broll` y `sound-effects` disponen de contratos previos. Segmentación SAM, vídeos externos generados por servicios de pago y simulaciones web interactivas siguen fuera del motor P4 y no deben anunciarse como completados.

## Comandos de autoría

```bash
# Ejemplo técnico identificado en pantalla como DEMO
node scripts/generate-specialized-project.mjs --workflow milestone-reveal --demo --output demo-p4.json

# Producción con datos propios: NO se inventan cifras, citas ni pruebas
node scripts/generate-specialized-project.mjs --workflow animated-chart --data datos.json --output grafico.json

# 12 demos cortas para revisar funcionalidad; nunca se interpretan como prueba real
node scripts/generate-specialized-project.mjs --workflow all --demo --duration 2 --output galeria-p4.json
```

Para `animated-chart`, por ejemplo, `datos.json` puede ser:

```json
{"title":"Resultados","values":[{"label":"A","value":12},{"label":"B","value":23}],"illustrative":true}
```

Un dato real requiere `source`. Para `milestone-reveal`, `number` se imprime literalmente, además de `label` y `source`; no se redondea. Una comparativa real exige `models`, `brief` y tres rutas MP4 en `videos` dentro de `user-assets/<uuid>.mp4`. La comparativa no invoca modelos ni sustituye primeras generaciones; el autor debe aportar y documentar sus resultados originales. Los tres clips deben cubrir la duración solicitada. Para newsletter se requieren tres pruebas visuales adjuntas de la edición (cada una con `asset`); para documental, cada hecho requiere fuente. Si faltan, se rechaza el modo de producción y solo queda disponible una DEMO rotulada.

## Calidad y límites

El complemento entrega **JSON**, no MP4. Studio acepta el campo `workflow` y conserva `id`, `sourceGuide`, `demo`, `mode`, `export`, `media` y `source`. Studio permite previsualización, render MP4, cues sonoros y, mediante el trabajo de aceptación P4, GIF de portada. El CI exporta doce MP4 con audio, valida diferencias de cuadros, genera hoja de contactos, mide el cierre GIF y renderiza tres archivos de vídeo verdaderos en una comparativa.

Las composiciones son realizaciones locales de las gramáticas visuales, no reproducciones certificadas píxel a píxel de todos los detalles de terceros. En particular: `title-sequence-3d` es 2.5D, la plantilla Apple es una simulación visual sin captura del sistema, `milestone-reveal` usa partículas acotadas del renderer y el elemento de portada es un overlay animado, no una máscara de píxeles segmentada. La comparación de tres MP4 reales requiere la ruta Remotion; HyperFrames rechaza explícitamente ese caso hasta soportar los paneles de vídeo. Estas limitaciones no se deben esconder ni cambiar el estado de paridad estricta de los repositorios originales.
