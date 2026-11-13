# Storyboard ejecutable v3 — referencia única

La preproducción no es una lista de oraciones ni un prompt estético. Es un mapa **verificable** de qué vemos, qué lo provoca y qué pieza del código demostrará el cambio. Este archivo sustituye para nuevos proyectos a `plan.json`, `beats.json`, `mechanics.json`, `composition-plan.json` y `continuity-plan.json` como documentos separados. Los validadores anteriores siguen disponibles solo para proyectos heredados.

## Formato de storyboard.json

Guardar UTF-8 con esta estructura. Los tiempos son **globales** en segundos y deben provenir del SRT/audio real.

```json
{
  "schema": "motion-studio.storyboard/v3",
  "duration": 8,
  "source": {
    "narration": "SRT aportado; no repartir tiempos",
    "audioDuration": 8,
    "referencesReviewed": ["referencia.mp4: observado material translúcido y cámara de detalle"]
  },
  "styleBible": {
    "materials": "polímero translúcido con grosor, highlights y oclusión",
    "lighting": "luz lateral consistente",
    "cameraGrammar": "acercamiento solo cuando se necesita comprender contacto",
    "identity": "reutilizar máquina y láminas canónicas en todas sus apariciones"
  },
  "scenes": [
    {
      "id": "sellado",
      "start": 0,
      "end": 8,
      "visualMode": "mechanism",
      "actors": ["rodillo superior y rodillo inferior"],
      "props": ["lámina A", "lámina B", "costura"],
      "incoming": "las dos láminas entran separadas",
      "outgoing": "las láminas quedan selladas"
    }
  ],
  "shots": [
    {
      "id": "sellado-detalle",
      "sceneId": "sellado",
      "start": 0,
      "end": 8,
      "visualPurpose": "mostrar dónde dos láminas se juntan y cómo aparece la costura",
      "framing": "detalle oblicuo de las bocas de los rodillos",
      "camera": {
        "target": ".camera",
        "motion": "dolly de aproximación durante contacto",
        "reason": "mostrar presión y sellado; no sustituir acción"
      },
      "speechAnchor": {"text": "sellaron", "at": 3.25},
      "phases": [
        {"kind": "setup", "start": 0.2, "end": 1.3, "selector": ".film-a", "change": "x: -90 a 0"},
        {"kind": "cause", "start": 1.3, "end": 2.6, "selector": ".roller-top", "change": "rotación mientras empuja film-a"},
        {"kind": "contact", "start": 2.6, "end": 3.35, "selector": ".film-b", "change": "se encuentra con film-a bajo los rodillos"},
        {"kind": "result", "start": 3.35, "end": 5.7, "selector": ".seam", "change": "strokeDashoffset de 170 a 0"},
        {"kind": "hold", "start": 5.7, "end": 8, "selector": ".seam", "change": "costura visible, continuidad"}
      ],
      "raccord": "el borde sellado guía la siguiente toma"
    }
  ]
}
```

El ejemplo solo explica el **contrato**, no es plantilla narrativa: elegir libremente escenarios, objetos, planos y acciones según cada guion. Para una abstracción matemática, un gráfico sin contacto físico puede ser adecuado; para un gesto humano o mecanismo, no.

## Validación antes de dibujar

```bash
node scripts/audit-storyboard-v3.mjs --storyboard storyboard.json
```

No superar etapa 1 hasta comprobar:

- Duración de escenas continua y coincidente con duración global, sin huecos ni solapamientos injustificados.
- Cada escena tiene al menos un plano, actores/objetos que realmente aparecen, continuidad de entrada/salida y propósito visual específico.
- Cada plano tiene tiempos propios, encuadre, cámara con motivo, evento ejecutable y consecuencia, no solo «mostrar información».
- Para `mechanism` y `narrative` que describan contacto físico: fases `cause`, `contact` y `result` con **mínimo dos selectores físicos**; los elementos inmateriales no requieren un falso contacto.
- Cada plano se vincula a una palabra real de la narración si hay SRT; si no se dispone de SRT, indicar que la sincronización no se ha validado.
- Evitar construir 13 escenas idénticas con el mismo plano, propósito y movimiento de cámara. Un plano largo o cámara estática son legítimos si ayudan a explicar.

## Vincular con la implementación

Tras crear el piloto `proyecto.json`, ejecutar:

```bash
node scripts/audit-storyboard-v3.mjs --project proyecto.json --storyboard storyboard.json
```

El auditor comprueba:

1. IDs, límites temporales y número de planos entre storyboard y JSON.
2. Selectores físicos existentes en el HTML de la escena correspondiente y efectivamente mencionados por código GSAP.
3. Anclas temporales, motivos de cámara y propósitos de plano no convertidos en un texto genérico.
4. Patrones de cámara de apariencia automática en todo un montaje; si aparecen, redirigir cada toma.

**Límite:** un selector presente en el código no demuestra que un brazo esté unido, una burbuja se deforme o un contacto sea creíble. La inspección del MP4 exige fotogramas **antes / contacto / después** y reproducción del movimiento, con la referencia visible. Si no se puede realizar, dejar `approved:false` y `VISUAL_PENDIENTE`; no entregar una afirmación de paridad.

## Piloto de aceptación

Para piezas mayores de 15 segundos, diseñar una escena o secuencia de 8–12 segundos que incluya el problema de movimiento más difícil. Antes de ampliarla verificar:

- **Geometría:** detalles visibles, materiales distinguibles, sujetos completos y proporcionados.
- **Causalidad:** el protagonista cambia de estado; hay causante, objeto afectado y resultado.
- **Raccord:** las posiciones, color, escala y silueta de activos persistentes no cambian caprichosamente.
- **Cámara:** dos planos se diferencian por una necesidad visual, no por un zoom aleatorio.
- **Voz:** los instantes de reacción corresponden a palabras reales del SRT.
- **Render:** prueba en Motion Studio y examen visual; repetir hasta corregir defectos.

La primera puerta **solo** pasa con storyboard coherente y evidencia revisada. La segunda y tercera exigen, además, código y render satisfactorios. Las puertas posteriores no pueden compensar una primera etapa defectuosa.

## Arte por piezas desde el storyboard

Para una escena con piezas independientes, añade `art` a la escena y usa `.ms-part-ID` como selector de las fases. Cada pieza se dibuja en su propia capa. Puedes usar trazados vectoriales, una imagen ya importada o un grupo que mueva sus piezas hijas. Los trazados y las poses los define quien prepara el storyboard.

```json
{
  "background": "#141b2c",
  "parts": [
    {
      "id": "producto",
      "x": 50,
      "y": 58,
      "width": 22,
      "height": 15,
      "pivot": {"x": 50, "y": 85},
      "viewBox": [0, 0, 100, 80],
      "paths": [
        {
          "d": "M10 12H90V70H10Z",
          "gradient": {"from": "#d1f4ff", "to": "#44738b"}
        }
      ],
      "keys": [{"at": 0, "y": 8}, {"at": 2, "y": -18}, {"at": 4, "y": 8}]
    }
  ]
}
```

- Declara las piezas de atrás hacia delante. Si usas `parent`, declara antes el padre con `group: true`. El frente de una caja puede cubrir el producto como una capa opaca por encima.
- `x`, `y`, `width` y `height` son porcentajes del lienzo o del grupo padre. El pivote se mide dentro de la propia pieza.
- Los `keys` tienen segundos locales a la escena. `x` e `y` en un keyframe desplazan la pieza en porcentajes del lienzo o grupo. También se admiten `rotate`, `scale` y `opacity`. El primer keyframe puede fijar la pose inicial en `at: 0`.
- Para un vector usa `viewBox` y `paths` con `d` y pintura opcional `fill`, `stroke`, `strokeWidth` o `gradient`. Una imagen usa `asset: "user-assets/UUID.png"`. `art.camera` admite keyframes locales con `x`, `y`, `zoom` y `rotate`. `depth` ajusta el paralaje de las capas raíz.
- Para una cola articulada, usa un grupo para el pez, con cuerpo y cola como hijos. Coloca el pivote de la cola en la unión al cuerpo. Sitúa la superficie como capa posterior en la lista si debe verse delante del pez.

En Motion Studio, pega el guion en **Guion y storyboard** y abre el storyboard desde **Abrir proyecto JSON o storyboard**. El inspector **Piezas del storyboard** permite ajustar la posición y el pivote por capa. El proyecto importado queda pendiente de revisión y se guarda como JSON de Motion Studio. El storyboard también puede pasar por el animatic de la aplicación o compilarse desde el complemento:

```bash
node scripts/compile-storyboard.mjs storyboard.json guion.txt proyecto.json palabras.json
```

`palabras.json` es opcional. Cuando lo aportas, conserva tiempos globales de voz y las anclas de los planos. La pista se añade al proyecto en Motion Studio. Para HTML/GSAP libre, usa `draft` en la escena. Ambas opciones pueden convivir en distintas escenas de un mismo storyboard.
