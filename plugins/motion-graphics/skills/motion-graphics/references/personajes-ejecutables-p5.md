# P5 · Personajes animados y contacto ejecutable

Motion Graphics 2.14 crea JSON con capas `authored.layers[].type="character"` que Motion Studio interpreta sin dependencias externas. El rig 2D conserva ID, colores y una línea temporal de expresiones, muñecas, tobillos, flexión del torso y contacto de ambos pies.

## Generador

```bash
node skills/motion-graphics/scripts/generate-character-project.mjs --action all --demo --output galeria-p5.json
node skills/motion-graphics/scripts/generate-character-project.mjs --action walk --output caminar.json
node skills/motion-graphics/scripts/generate-character-project.mjs --action custom --rig poses.json --output escena-personaje.json
```

Acciones: `greet` (saludar), `walk` (dos pasos con anclas de apoyo), `reach` (agarrar y levantar un objeto), `crouch` (flexión del cuerpo sin deslizar pies), `react` (sorpresa, parpadeo, tristeza, enfado y alegría).

## Cómo planificar la acción

1. Definir rasgos y paleta estables del actor. Identificador alfanumérico, colores `#RRGGBB`.
2. Definir `poses` ordenadas: `at`, `rootX`, `rootY`, `headTilt`, `squash` (máximo ±0.16), `expression`, `leftHand`/`rightHand`, `leftFoot`/`rightFoot`, `contact:{left,right}`, `grip`.
3. Colocar muñecas y tobillos dentro del alcance físico de los segmentos. El motor resuelve codos y rodillas con cinemática inversa de dos huesos.
4. Mantener en posición mundial los pies `planted` cuando la raíz del cuerpo se traslada. Marcar `air` al levantar un pie y `planted` al terminar el paso.
5. Para sujetar un objeto, usar `grip:true`; el objeto permanece ligado a la mano derecha.
6. Validar la escena antes de renderizar. Los contactos deslizantes, saltos de posición, objetivos inalcanzables, articulaciones fuera de rango y deformaciones excesivas impiden aceptar el JSON.

`poses.json` de un personaje personalizado usa los mismos campos de una capa `actor` de los JSON generados. Puede derivarse de una plantilla de acción y editarse. Mantener como mínimo dos poses y comenzar en `at:0`.

## Evidencia y límites

La aceptación P5 produce cinco MP4 por separado, un montaje, hoja de contactos y `report.json`; comprueba las transiciones visuales y audita muestras temporales de pies plantados. La evaluación visual no equivale a captura de movimiento real, dinámica de telas ni reconstrucción anatómica 3D. Para SVG externos sin etiquetas de contacto la medición sigue siendo **no evaluada**: nunca debe declararse aprobada automáticamente.
