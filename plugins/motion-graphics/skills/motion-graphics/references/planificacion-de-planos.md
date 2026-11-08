# Dirección previa obligatoria, para cualquier guion

Esta fase sucede **después de leer guion y tiempos de audio, antes de generar SVG/GSAP**. Nunca escoger un escenario por la última referencia sin analizar el contenido. Cada proyecto tiene su propia identidad gráfica; un video bíblico, científico, financiero o de misterio puede necesitar recursos y lenguaje distintos. No imponer una iglesia, océano, personajes o placas cuando no correspondan.

## Primero: descomposición del guion y reloj

1. Medir audio y reutilizar tiempos reales de palabras y pausas. Señalar lo no sincronizado como pendiente; no repartir segundos proporcionalmente por texto.
2. Segmentar en unidades visuales: una revelación, una acción física, una comparación o una transición de lugar/tiempo. Una frase puede requerir varios planos; una acción continua puede abarcar varios planos. Ni una escena por oración ni un video entero en un único plano por defecto.
3. Describir en cada plano **qué cambia** desde primer hasta último fotograma. El sujeto, el entorno, el objeto y la cámara deben contar esa información, no limitarse a decorar.
4. Definir dirección visual: personajes con siluetas y medidas estables, arquitectura y mapa espacial, paleta, materiales, foco, composición y sistema de profundidad. Evaluar contra referencias observadas sin reproducir marcas ajenas.

## Segundo: construir el plan temporal validable

Crear durante autoría un `plan.json` (artefacto interno) con `duration` y `scenes`. Cada elemento de `scenes` debe contener:

- `id`, `start`, `end`, `narration` (frase real o `silencio deliberado`), `visualGoal`, `location`, `lighting`, `entryFrame`, `exitFrame`.
- `camera`: `shot` (escala/ángulo), `from`, `to`, `movement` (corte, panorámica, travelling, zoom, estática motivada). La cámara debe seguir la acción y evitar ocultar contactos.
- `action`: `anticipation`, `main`, `contact`, `recovery`. Para gráficos sin personajes puede ser preparación/aparición/valor final/estabilización; `no aplica` si corresponde.
- `actors` y `props`: listas de `{id,startState,endState}`. Mantener identidad y estado físico, orientación y posición entre planos. Nunca inventar que un personaje se teletransportó.
- `transition`: `{type,to,continuity}`. `to` es el ID del siguiente plano, o `null` en el último. La continuidad explica cómo se conecta el final con el comienzo siguiente, incluso con una elipsis explícita.

Ejecutar `node scripts/validate-shot-plan.mjs plan.json`. Resolver todos los errores y revisar manualmente ejes espaciales, dirección del movimiento, oclusión y tiempos antes de construir. El validador sólo comprueba cobertura estructural, no calidad artística.

## Tercero: movimiento humano verificable

- Usar `risePoses` para levantarse con pies anclados; alinear asiento y pies del escenario. Usar `walkPoses` para caminata básica, con apoyo en mundo y elevación de pie libre. Usar `puppetPose` con interpolación `continuous` por defecto, `linear` para contacto constante o `smooth` sólo cuando convenga frenar en una pose.
- El anclaje del pie es la suma de desplazamiento de cadera + coordenada local del pie; verificar que no varíe durante apoyo. Un personaje tiene un tamaño adecuado al plano para apreciar la acción.
- Para movimientos más complejos (correr, bailar, cargar objetos, sentarse en objetos de geometría variable), diseñar poses y trayectorias físicas adicionales. No presentar los presets como simulador biomecánico universal.
- Probar una acción representativa a fotogramas densos; revisar el momento del contacto, inicio y final de cada apoyo, eje de la articulación y la relación con el entorno. Sin prueba visual no afirmar naturalidad.

## Cuarto: ensamblaje y control de calidad

Respetar continuidad del plan al crear `customScene`; fijar último cuadro de un plano y primero del siguiente como pareja verificable. No exportar `plan.json` como escena ni añadir propiedades inventadas al esquema Motion Studio. Conservar una lista interna de correspondencia plano↔escena final y los segundos globales. Si un plano se combina o divide, actualizar el plan y validar otra vez.

Calidad mínima antes de entrega: revisión de fotogramas inicial/intermedio/final, movimiento entre ellos, contactos, iluminación y coherencia de cámara. Si no hay motor de reproducción, registrar esa limitación sin aprobar el resultado artístico.
