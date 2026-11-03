# Motion Studio 5 — instrucciones para el agente de codigo

Objetivo: producir motion graphics profesionales con Remotion en una PC Windows
Intel i3, 8 GB de RAM, sin GPU dedicada, con conectores gratuitos
opcionales y sin APIs ni assets de pago obligatorios.

## Reglas de edicion

1. Lee README.md, src/Root.tsx, src/StudioVideo.tsx, src/StudioApp.tsx
   y server.mjs antes de editar la version 5. Lee también DESIGN.md
   y src/semantic-director.mjs, que comparten la decisión de tema con HyperFrames.
2. Conserva la exportacion de CPU con concurrencia 1 como ruta por defecto.
3. Haz animaciones deterministas calculando posiciones y opacidades mediante
   `useCurrentFrame()`, `interpolate()` y `Easing`. Evita relojes reales,
   temporizadores, animaciones CSS que funcionen fuera del sistema de fotogramas
   y descargas durante el render.
4. No agregues dependencias, imagenes o voces de pago sin consentimiento.
5. Usa graficos vectoriales y transiciones ligeras en vez de 3D pesado.
6. Si la tarea es cambiar la plantilla original, empieza por src/content.ts.
   Si cambia el editor, preserva el esquema de src/studio-schema.ts y
   la validacion en server-utils.mjs.
7. En historias narradas de Antonio o terror, no introduzcas subtitulos ni
   texto en pantalla a menos que el usuario lo pida expresamente.
8. No marques un render como exitoso hasta verificar un MP4 existente y
   reproducible. Si falla, conserva el error real y evita previews ficticias.
9. Antes de entregar, ejecuta `npm run lint`, `npm test`,
   `npm run studio:build`, `npm run build`, `npm run test:smoke`
   y `npm run render:motion-test`.
10. No reemplaces `MotionProfesional` ni el antiguo archivo
   `render-windows.cmd`: son la ruta de regresion ya probada.
11. Nunca dependas de APIs de pago ni afirmes que el borrador local es IA
    generativa. La integracion con Claude es opcional y usa JSON validado.
12. Conserva las propiedades de v3 (script, style, showText,
    narrationMode, voiceClips, characterMode, references y approved) y
    las de v3.1 (creativeBrief, style/motion/transition/motionStrength
    y focusX/focusY por escena).
    El servidor debe impedir la exportacion de escenas sin aprobar.
13. El estilo visual puede variar según el tema de cada proyecto. Las escenas
    pueden heredar el estilo general o escoger uno propio, sin perder una
    dirección de arte coherente. No conviertas un tema en estilo obligatorio.
    Los personajes se conservan mediante referencias importadas; nunca
    prometas consistencia automatica de rostros sin esas referencias.
14. El kit externo «Editor del Club» es una referencia tecnica, no una
    dependencia. No instales Torch, Whisper grande ni DeepFilterNet para
    el flujo CPU de 8 GB sin consentimiento.
15. Las referencias de HyperFrames y Motion Doctrine inspiran ritmos,
    continuidad y control de calidad, pero el render principal sigue en
    Remotion. No alteres los segundos de cada escena para crear transiciones:
    la voz y el video deben conservar el mismo reloj.
16. Para un resultado profesional, selecciona intencionalmente layouts
    (hero, orbit, editorial, data, kinetic, collage), movimiento de cámara,
    intensidad y transición. Evita aplicar el mismo zoom o destello a todas
    las escenas. Verifica la legibilidad a tamaño de teléfono.
17. Mantén la búsqueda de recursos y la transcripción detrás del servidor
    local y de acciones explícitas de la persona. Nunca filtres claves al
    navegador ni incluyas .env, data/ o user-assets/ en ZIP distribuibles.
18. La propiedad videoAsset admite clips MP4 externos por escena; conserva
    su silencio dentro de la composición cuando exista narración propia.
    El puente HyperFrames es experimental: HTML GSAP exportable y regreso
    por MP4, no una promesa de render cloud gratuito ni un catálogo instalado.
19. motionGraphics es una lista editable de 0 a 8 gráficos por escena.
    Registra su aparición y duración en segundos relativos a la escena,
    representa cada fotograma con funciones puras de Remotion y nunca genera
    números en historias sin datos. Cada cambio debe retirar la aprobación.
20. Las marcas del guion son sugerencias de tiempo; si un MP3 mide distinto,
    escala las propuestas sin perder el último bloque. No anuncies
    sincronización por palabra hasta que exista alineación real del audio.
21. El director FreeLLMAPI es opcional: server.mjs expone /api/ai/plan y
    ai-planner.mjs valida respuestas. Solo enviar texto a una API ante acción
    explícita; jamás transmitir audio, referencias o claves. Aplicar una
    propuesta preserva duraciones, archivos y personajes y retira aprobación.
22. Filtrar las cantidades de gráficos propuestos por IA contra las cifras
    reales del guion. No renderizar magnitudes inventadas. La conexión con
    FreeLLMAPI puede fallar o limitarse: mantener el modo local intacto.
23. Antes de entregar cambios del asesor IA, ejecutar npm run test:ai-route
    con servidor de IA simulado, además de la batería local y de render.
24. V5 incorpora visualEngine adaptive/classic. No elimines el modo clásico ni
    des la vuelta al interruptor sin retirar aprobación. Con showText false
    no debes pintar textos sobre las escenas.
25. El puente HyperFrames exporta un storyboard completo con GSAP. No incluye
    automáticamente imágenes, audio ni referencias personales. No confundas
    esa exportación HTML con la entrega MP4 sincronizada de Remotion.

Para usar las skills oficiales de Remotion: `npx remotion skills add`.

## Escenas HTML a medida (7.1)

26. `customScene {html, css, script}` por escena sustituye la plantilla de HyperFrames. Lee
    GUIA-ESCENAS-HTML.md antes de escribirlas. CSS prefijado con `__SCENE__`, tiempos con `T0`,
    sin azar, relojes reales ni red. `sanitizeCustomScene` en server-utils.mjs lo exige; no lo debilites.
    La previsualización de Remotion no dibuja customScene: se revisa con la exportación HTML.
