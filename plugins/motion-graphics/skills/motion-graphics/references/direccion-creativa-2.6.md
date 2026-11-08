# Dirección creativa y movimiento narrativo, v2.6

Adaptación original de las prácticas públicas de `charlie947/motion-graphics-skills`, al JSON de Motion Studio. No copiar archivos gráficos, marcas, escenas o código del repositorio.

## Referencias e identidad

Separar **LOOK** (materiales, iluminación, color, tipografía, profundidad) de **MOVES** (duración de cada plano, transición, velocidades, cámara, retención, cambio de foco). Clasificar cada evidencia en `observed`, `inferred` y `unknown`; un fotograma no demuestra velocidad. No transferir colores y logos cuando solo se quiere aprender el ritmo.

Construir `creative-bundle.json` de autoría: `{ "direction": { "topic": "...", "audience": "...", "visualThesis": "...", "narrativePromise": "...", "look": { "background": "#101820", "foreground": "#ffffff", "accent": "#ff9900", "typography": "...", "materials": "...", "light": "..." }, "moves": { "pace": "...", "transitions": "...", "camera": "...", "easing": "..." }, "references": [], "motionRules": { "must": [], "avoid": [] } }, "outline": { "duration": 4, "shots": [{ "start": 0, "end": 4, "claim": "...", "visualProof": "...", "action": "...", "camera": "...", "bridgeToNext": "...", "layers": ["fondo", "sujeto", "consecuencia"], "beats": [{ "time": 1, "event": "..." }] }] }, "effects": [], "layouts": [] }`. Son fichas para tomar decisiones, no cambios al formato final. Revisar `node scripts/validate-creative.mjs creative-bundle.json`.

## Narración explicativa

Cada plano plantea una idea comprobable: lo que dice la voz (`claim`), qué se ve para probarla (`visualProof`), qué cambia (`action`), qué observa la cámara (`camera`) y cómo se enlaza al siguiente (`bridgeToNext`). Los beats usan tiempos reales de narración; no inventar cifras ni fechas. El primer plano debe establecer un gancho visual significativo, sin forzar rótulos cuando el usuario pidió silencio o no quiere subtítulos. Cada capa cumple una función (profundidad, contacto, revelación, evidencia), no una cuota decorativa. No imponer duración fija o estética Vox a toda historia.

## Animaciones y efectos

`scripts/effect-recipes.mjs` contiene 16 **recetas declarativas**, no 16 efectos completamente renderizados: button-player, search-results, card-workspace, tabs-panels, chart-morph, dashboard-zoom, spring-stack, magnetic-dock, masked-type, elastic-type, text-layout, image-reveal, perspective-shift, glass-focus, flowing-paths y particle-logo. Usar solo si explican la idea. Mantener el mismo objeto desde el estado inicial al final, incluir anticipación, transformación, pausa legible y salida, y evitar reinicio de loop bajo narración.

`scripts/morph-motion.mjs` implementa transformación geométrica real por remuestreo equidistante de anillos, alineación de vértices y deformación local. Tomar dos polígonos bien diseñados; `morphTrack(from,to,{start,end})` devuelve `d` SVG al instante pedido. Para producción, muestrear claves de `d` y animarlas en el reloj GSAP del JSON (o incorporar una interpolación autosuficiente, sin temporizadores autónomos). Un órgano con cavidades requiere deformar piezas con anclas compartidas: no basta un contorno escalado.

## Calidad y límites

`scripts/visual-audit.mjs` revisa las fichas reales `layouts[].elements` con `bounds`, `fontSize`, `readableSeconds`, `characters`, `contrastRatio` si se midió y `motion`. Detecta recorte, textos pequeños, colisiones, tiempo de lectura, bajo contraste declarado y movimiento decorativo exagerado. No afirma que inspeccionó píxeles: abrir imágenes reales del MP4 y comprobar anatomía, contactos, legibilidad, causa y consecuencia. Los efectos no garantizan automáticamente calidad cinematográfica. Conservar silencio cuando el usuario lo pida; no imponer música por recetas ajenas.
