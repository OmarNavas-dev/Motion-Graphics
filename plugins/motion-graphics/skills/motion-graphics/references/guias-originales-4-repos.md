# Flujos especializados de cuatro repositorios

Las fichas siguientes vinculan las capacidades de producción del complemento con fuentes MIT. Son **rutas de autoría**; no atribuyen al complemento la capacidad de ejecutar renderizado, modelos externos ni servicios premium.

## Barty-Bart/motion-graphics
- [explainer-default](source-guides/barty/explainer-default.md): Explicación clara, ritmo de lectura, prioridad al mecanismo causal.
- [explainer-engaging](source-guides/barty/explainer-engaging.md): Alternar escalas, movimiento con propósito, ejemplos y transición visual.
- [explainer-high-energy](source-guides/barty/explainer-high-energy.md): Cortes precisos, retención visual sin sacrificar legibilidad.
- [motion-broll](source-guides/barty/motion-broll.md): Alinear B-roll con palabras y planos de apoyo. Las salidas alfa/transparencia y los compositores externos no están disponibles por copiar esta guía.
- [object-separation](source-guides/barty/object-separation.md): Planificar capas y objetos separables. La segmentación por modelo externo requiere instalar y ejecutar el modelo, no puede simularse.
- [sound-effects](source-guides/barty/sound-effects.md): Elegir momentos diegéticos y discretos para eventos; `soundDesign.cues` admite efectos sintetizados solo si `enabled:true`.

## whaleyxbt/claude-motion
- [motion-design](source-guides/whaley/motion-design.md): Jerarquía de planos, composición, easing y continuidad deliberada.
- [review-loop](source-guides/whaley/review-loop.md): Revisar fotogramas críticos, señalar errores observables y priorizar correcciones; no afirmar re-render autónomo sin motor de edición conectado.
- [sound-design](source-guides/whaley/sound-design.md): Planificar cues en tiempo global, evitar tapar la narración y medir la mezcla exportada.
- [web-sims](source-guides/whaley/web-sims.md): Narrar una simulación visual continua con estados y reloj reproducible, pero no prometer un runtime interactivo si no está incorporado.

## ItsssssJack/claude-video-2
- [claude-video-studio](source-guides/jack/claude-video-studio.md): Elegir un estilo de catálogo, crear storyboard, montar timeline, renderizar y revisar.

## charlie947/motion-graphics-skills
- [animated-chart](source-guides/charlie/animated-chart.md): Crear visualizaciones con datos reales, estados inicial/final, etiquetas seguras y cambios con tiempo explícito.
- [apple-launch-film](source-guides/charlie/apple-launch-film.md): Revelación de producto con imagen limpia, ritmo, encuadres precisos y transiciones intencionales.
- [brand-intake](source-guides/charlie/brand-intake.md): Emitir `brandProfile` con nombre, colores, tipografía, reglas de movimiento, prohibiciones y promesa narrativa.
- [launch-video](source-guides/charlie/launch-video.md): Desarrollar problema, valor y conclusión en planos escalonados.
- [loop-cover](source-guides/charlie/loop-cover.md): Para loops, cerrar en el mismo estado visual y emitir `loop:true` solo cuando está justificado; el sistema mide salto en fotogramas.
- [milestone-reveal](source-guides/charlie/milestone-reveal.md): Construir anticipación y revelar un hito en etapas con tiempo GSAP definido.
- [model-showdown](source-guides/charlie/model-showdown.md): Comparar dos objetos/modelos con jerarquía simétrica, una escala común y conclusiones visibles.
- [motion-brief-writer](source-guides/charlie/motion-brief-writer.md): Plan de escenas, objetivos, referencias, movimiento, paleta y reglas.
- [motion-effects](source-guides/charlie/motion-effects.md): Escoger entre las 16 recetas locales y combinar sin duplicaciones.
- [motion-prompt-writer](source-guides/charlie/motion-prompt-writer.md): Describir encuadre, objetos, estilo, cámara, tiempos y controles explícitos.
- [newsletter-promo](source-guides/charlie/newsletter-promo.md): Promover boletines sin saturar texto; mantener una idea dominante y CTA legible.
- [reel-export](source-guides/charlie/reel-export.md): Diseñar considerando 9:16, zona segura, subtítulos, densidad y duración.
- [reference-to-motion](source-guides/charlie/reference-to-motion.md): Extraer paleta, composición, dinámica y transiciones desde el video de referencia sin copiar material protegido.
- [title-sequence-3d](source-guides/charlie/title-sequence-3d.md): Especificar planos tridimensionales, luces y movimiento solo si el motor correspondiente soporta esas operaciones.
- [vox-explainer](source-guides/charlie/vox-explainer.md): Priorizar pregunta, evidencia visual, mecanismo causal y resumen consistente.

## Cobertura real

El inventario de paridad en `docs/reference-parity.json` del repositorio Motion Studio sigue registrando capacidades parciales y externas. Las presentes fichas aportan criterios de autoría y referencias, no sustituyen los motores aún faltantes.

Consulte también [el contrato JSON de Motion Studio 2.9](contrato-studio-2.9.md) y [las fuentes/licencias](fuentes-y-licencias-2.9.md).
