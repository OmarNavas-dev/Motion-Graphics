# P2 · B-roll sincronizado y exportación transparente

Este flujo de Motion Graphics produce campos `broll` ejecutables por Motion Studio. **No genera MOV directamente**: el complemento diseña y valida JSON; Motion Studio compone en MP4 y ofrece exportación independiente ProRes 4444 con canal alfa.

## Diseño y selección

1. Inspecciona el guion, `scenes`, narración y `wordTimings` reales. Para cada idea visual, decide si complementa la escena (`overlay`) o sustituye temporalmente su imagen (`cutaway`). No sustituir una intervención emocional por interfaces decorativas.
2. Describir para cada plano: escena (`sceneId`), entrada local (`at`), duración, tratamiento, objetivo de comunicación, objetos y motivo para el movimiento. Mantén pausas; no rellenes el video de B-roll.
3. En `overlay`, ubica paneles fuera de rostros/subtítulos. Puede dejarse transparente alrededor de formas, texto y PNG. En `cutaway`, provee `background` o imagen de cuadro completo; durante el cutaway se oculta la imagen de base.
4. Para sincronía verbal, usa `narration.wordIndex`, `edge`, `offset` y `phrase` de un elemento real de `wordTimings`. El motor calcula automáticamente `at` local desde el reloj global; no inventes marcas de tiempo. Si incluyes `at`, debe coincidir ±0.05 s con la palabra.
5. Valida con `node scripts/validate-broll.mjs proyecto.json`, y luego `node scripts/validate-project.mjs proyecto.json [--repo RUTA]`; corrige cualquier recorte, identificador repetido o referencia no importada.
6. Tras importar el JSON, revisar y aprobar escenas modificadas. Exportar MP4 con HyperFrames/Remotion o **Exportar B-roll alfa · MOV** en Motion Studio. Conservar pista de audio original. Inspeccionar visualmente transparencia, sincronía en palabras y legibilidad del material real.

## JSON ejecutable mínimo

```json
{
  "wordTimings": [{"text":"mundo","start":1.2,"end":1.55}],
  "broll": [{
    "id":"plano-mundo",
    "sceneId":"escena-01",
    "duration":1.5,
    "kind":"overlay",
    "narration":{"wordIndex":0,"edge":"start","offset":0,"phrase":"mundo"},
    "motion":"rise",
    "objects":[
      {"id":"panel","type":"shape","shape":"rect","x":8,"y":20,"width":84,"height":35,"color":"#112244"},
      {"id":"titulo","type":"text","x":12,"y":26,"width":74,"height":15,"text":"Un mundo por descubrir","fontSize":43,"color":"#FFFFFF"}
    ]
  }]
}
```

Es un fragmento ilustrativo; `sceneId` debe existir, y `1.2 + 1.5` debe caber dentro de su escena. `globalAt` es un campo **calculado** por el validador, no debe improvisarse.

## Contrato y límites

| Campo | Regla |
|---|---|
| `broll` | Array optativo, máximo 120 clips; IDs únicos |
| `sceneId`, `at`, `duration` | Tiempo local a escena, 0.1–60 s y sin cruzar el límite |
| `narration` | Opcional; palabra real global y `offset` de −5 a +5 s |
| `kind` | `overlay` o `cutaway`; cutaway requiere fondo sólido o imagen full-frame |
| `motion` | `static`, `rise`, `zoom`, `slide-left` |
| `objects` | De 1 a 32 por plano; `shape`, `text` o `image` |
| `x`, `y`, `width`, `height` | Porcentajes del lienzo, 0–100; anchura/altura positivas |
| `color`, `background` | Hex RGB/RGBA válido; opacidad según alpha hex |
| `asset` | `user-assets/UUID.png|jpg|jpeg|webp`, ya importado |

No afirmar segmentación de objetos tipo SAM, visor comparativo Barty ni blur por subfotogramas: esas capacidades de terceros son distintas de este B-roll operativo. ProRes 4444 MOV sí contiene alfa de píxel decodificable; MP4 H.264 final conserva imagen opaca convencional. Los cutaways pueden tapar completamente la imagen durante su duración, aun cuando el MOV mantenga canal alfa fuera de esos intervalos.
