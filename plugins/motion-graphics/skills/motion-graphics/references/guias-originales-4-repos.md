# Integración de las guías originales de producción

Fuentes MIT preservadas en `references/source-guides/`:

- **Barty-Bart**: `explainer-default`, `explainer-engaging`, `explainer-high-energy`, `motion-broll`, `object-separation`, `sound-effects`.
- **whaleyxbt**: `motion-design`, `review-loop`, `sound-design`, `web-sims`.
- **ItsssssJack**: `jack/claude-video-studio.md` y las 21 fichas visuales en `references/styles/`.
- **Charlie Hills**: 15 documentos especializados, de `animated-chart` a `vox-explainer`.

Para generar un proyecto, identificar primero el modo de producción correspondiente, consultar la especificación de referencia y adaptarla a **un JSON importable en Motion Studio**. No ejecutar comandos Claude Code, descargar modelos externos, usar servicios con créditos ni prometer funciones de video/audio que el sistema no haya implementado. Seguir la versión contractual local de Motion Studio y preservar las licencias. Para estilo visual reproducible, emitir `stylePreset` y opcionalmente `brandProfile:{name,colors,typography,motionRules,avoid,narrativePromise}`; `brandProfile.colors` tiene prioridad sobre colores del estilo. Esto hace que las reglas persistentes se conserven entre importaciones y exportaciones, pero no demuestra por sí solo que cada objeto customSVG cumpla todas las reglas.

La lista estricta de funciones **sin integrar completamente** reside en `docs/reference-parity.json` del repositorio. No interpretar una guía textual copiada como un motor ejecutable ni declarar paridad hasta cerrar los 33 elementos de esa lista.
