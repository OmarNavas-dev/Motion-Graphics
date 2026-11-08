# Pipeline visual verificable (Barty-Bart + whaleyxbt + claude-video-2)

Ningún kit visual debe sustituir el diseño. Los repositorios analizados ofrecen
procesos y motores para renderizar MP4 fuera de Motion Studio; aquí se integran
sus **métodos compatibles** de tiempo, dirección y auditoría con el contrato JSON.

## A. Dirección y análisis

Antes de escribir HTML, elegir dirección visual coherente según
`direccion-de-estilos.md` (no una paleta oscura universal). Para cada idea del guion:
1. Palabra/ancla del audio y su tiempo REAL (si hay audio/SRT).
2. Acción visible, actor, objeto, causa, reacción y evidencia.
3. Anclas geométricas, jerarquía de transformaciones, apoyos y oclusión.
4. Estado de entrada y salida, sujeto que persiste o corte justificado.
5. Plano, profundidad, cámara, exposición, escala y continuidad de luz.
6. Tiempo para leer y para comprender; no imponer escenas de cinco segundos.

Un mismo sujeto puede estar compuesto de muchas capas (piel, músculo, cavidades,
líquido, válvulas); usar transforms independientes solo donde el mecanismo lo
requiera. Una contracción no se sustituye por `y:-6` del SVG entero.

## B. Tres contratos comprobables

### Plan de planos

Continuar usando `node scripts/validate-shot-plan.mjs plan.json` para toda la
historia. No dejar `before`, `after` ni enlaces vacíos en las fichas finales.

### Línea temporal compartida

Crear `beats.json` **durante la autoría** (no inyectar claves arbitrarias en
el JSON de Motion Studio):

```json
{
  "duration": 8,
  "beats": [
    {"id":"manija","scene":"uno","at":0.3,"subject":"puerta",
     "visual":"la manija gira","cause":"mano hace fuerza",
     "effect":"pestillo se retira","hold":0.3,"sound":"clic opcional"},
    {"id":"luz","scene":"dos","at":4.1,"subject":"rayo de luz",
     "visual":"la luz cae sobre el libro","cause":"puerta abierta",
     "effect":"versículo iluminado","bridge":"seguir el rayo de la escena anterior"}
  ]
}
```

Validar con `node scripts/validate-beats.mjs beats.json`. Los tiempos deben
salir de narración/voz real o ser tiempos de autoría marcados explícitamente
para piezas mudas. El mismo beat puede alimentar GSAP, efectos optativos y
muestreo de revisión: sonido y imagen comparten un único reloj. **No** generar
MP3 por defecto, no inventar sincronización palabra a palabra ni afirmar soporte
de pistas de SFX en JSON sin verificar el contrato.

### Acciones mecánicas

Crear `mechanics.json` antes del dibujo. Para un movimiento físico, declarar:

```json
{"actions":[{"id":"apertura","kind":"hinge","actor":"puerta",
  "cause":"mano empuja","visibleResult":"la hoja gira",
  "start":0.3,"end":2.1,"startState":"ángulo 0°",
  "endState":"ángulo 80°","anchor":"eje del marco",
  "support":"bisagra fija","contactAt":"mano toma la manija a 0.3s"}]}
```

Validar con `node scripts/validate-mechanics.mjs mechanics.json`. Tipos:
`translate`, `rotate`, `deform`, `flow`, `contact`, `hinge`, `walk`, `light`,
`draw`, `morph`, `hold`. Los modelos y sus SVG se crean **después** de aprobar
las relaciones geométricas. Para `flow` definir recipiente/trayectoria; para
`walk` apoyos; para `hinge` eje; para `contact` dos superficies y el momento.

## C. Revisión y exportación

1. `node scripts/scene-audit.mjs proyecto.json` verifica selectores GSAP y de
   fichas de dirección contra clases reales del SVG (casos `.world`/`.macro-world`),
   y avisa de planes superficialmente uniformes.
2. `node scripts/validate-project.mjs proyecto.json` invoca esa auditoría
   automáticamente y mantiene el resto de comprobaciones de contrato.
3. Con render del usuario/Motion Studio, crear hoja de contactos por beats:
   `node scripts/beat-contact-sheet.mjs video.mp4 beats.json sheet.png`.
   Revisar entrada, mitad de movimiento, contacto, resultado, salida y bordes.
4. Comprobar pausas sospechosas y saltos del MP4 con
   `python3 scripts/check-render-pacing.py video.mp4 --max-gap 1.5`.
   Para loop solicitado añadir `--loop`. Diferencias de píxeles NO equivalen a
   movimiento natural; holds largos y movimientos pequeños dan falsos avisos.
5. Abrir las hojas reales y corregir colisiones, contactos, piernas sueltas,
   derrames, etiquetas, profundidad, foco, color, movimiento sin causa y cortes.
6. Ejecutar una nueva revisión tras cada corrección. Solo afirmar éxito visual
   cuando se hayan inspeccionado los nuevos fotogramas.

## D. Capacidades no incorporadas por compatibilidad

- `SAM2`/segmentación de objetos de Barty-Bart requiere modelo, GPU/CPU y un
  pipeline local de imágenes; no es un primitivo del JSON.
- Remotion, WebGL/Three.js, simulaciones de browser independientes, y captura a
  60 FPS dependen del renderer elegido; no insertarlos como dependencias nuevas
  de Motion Studio a ciegas.
- Blur con cuatro subfotogramas, normalización a LUFS y mezcla WAV final requieren
  un compositor fuera del contrato JSON; preservar la voz original y ofrecer
  dirección/cue sheet para postproducción sin prometer render de audio.
- Higgsfield/API de generación de clips cuesta créditos y requiere consentimiento
  expreso, además del soporte del editor para assets importados.

Mantener la salida única JSON solicitada. Estos archivos de análisis son internos
o diagnósticos opcionales, y no reemplazan el JSON que pidió el usuario.
