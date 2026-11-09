# P3 · Los 21 estilos como composiciones ejecutables

P3 convierte las 21 fichas de `references/styles/` en **recetas de capas y movimiento** que Motion Studio puede calcular cuadro a cuadro con Remotion y HyperFrames. Las referencias originales incluyen interacciones con material externo y dirección artística específica; este sistema implementa sus firmas visuales reproducibles y conserva las instrucciones originales para personalización profunda.

## Autoría obligatoria

1. Leer `references/styles/<id>.md` completo del estilo seleccionado. Extraer composición, paleta, tipografía, gramática de movimiento, materiales, firma visual y prohibiciones. No presentar como equivalente un video que solo cambió colores.
2. Usar `scripts/generate-style-project.mjs` para construir `authored` con capas ejecutables y `stylePreset` congruente. Modificar esas capas en función del guion y las referencias del usuario, sin inventar detalles factuales. La firma base es un punto de partida funcional, no un sustituto del trabajo artístico por proyecto.
3. Mantener el perfil de marca: `brandProfile.colors` reemplaza los colores canónicos, sin añadir acentos arbitrarios; preservar la restricción de un solo acento cuando se aplique.
4. En estilos sin texto como `paper-world`, `ink-line` y `growing-city`, no incorporar títulos de forma automática. En estilos UI, dibujar datos demostrativos claramente genéricos sin simular marcas reales ni fabricar métricas.
5. Si la escena ya tiene `customScene`, `authored` manual, `imageAsset` o `videoAsset`, conservar ese arte; seleccionar un estilo no debe destruir la autoría existente.
6. Validar el proyecto con `node scripts/validate-project.mjs proyecto.json`, ejecutar `node scripts/generate-style-project.mjs --style <id>` para inspeccionar el ejemplo y comprobar visualmente los cuadros claves después del render. El CI de Motion Studio produce 21 MP4 y una hoja de contactos; sus pruebas no certifican paridad exacta con referencias externas.

## Uso del generador

```bash
# Un ejemplo con estilo concreto, 3 segundos, JSON importable
node scripts/generate-style-project.mjs --style paper-world --duration 3 --output papel.json

# Galería completa, 21 escenas y 21 recetas; 42 segundos en total
node scripts/generate-style-project.mjs --style all --duration 2 --output galeria-p3.json
```

La galería es un ensayo técnico de estilos, no una historia terminada. Su campo `approved` se mantiene falso para obligar a revisar cada escena. Los 21 IDs son exactamente los de `stylePreset` y no se cambia el contrato de narración.

## Cobertura del motor

Los estilos `paper-world`, `ink-line`, `weather-widget`, `data-story`, `swiss-kinetic`, `particle-field`, `growing-city`, `explainer-diagram`, `time-travel`, `editor-ui`, `motion-app-ui`, `design-app-ui`, `audio-app-ui`, `swiss-grid`, `editorial-paper`, `midnight-grid`, `paper-cut`, `risograph`, `blueprint`, `graphite-ui` y `poster-pop` generan composiciones diferenciadas con geometría SVG/HTML compartida, capas, entrada escalonada y cámara determinista. Las recetas usan primitivos locales, sin API ni imágenes externas.

**Limitaciones que deben comunicarse:** los originales de terceros incluyen ciertas técnicas especializadas (diez mil partículas con render de GPU, captura/edición real de programas, interacciones y comparación con videos externos, simulaciones físicas o ajustes manuales de metraje) que no quedan reproducidas automáticamente por una plantilla. No declarar homologación 1:1 sin comparaciones visuales directas del mismo material y pruebas de cada comportamiento exigido.
