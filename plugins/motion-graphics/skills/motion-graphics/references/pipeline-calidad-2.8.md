# Pipeline de calidad 2.8: autoría, ejecución y evidencia

## Contrato compartido
- El formato JSON continúa usando `customScene {html,css,script}` y la misma base de tiempo GSAP `T0`/`D`.
- `direction.shots` admite `at`, `duration`, `scale` (`wide`, `medium`, `close`, `macro`), y opcionalmente coordenadas numéricas `x`/`y`.
- `direction.cameraTarget` puede ser una clase CSS simple presente en HTML (por ejemplo `.world`). Para dos o más planos, Motion Studio compila keyframes GSAP si no existe movimiento manual de ese objetivo.
- `direction.actions[].motion` permite `{from:{x,y,scale,rotation,opacity},to:{...},ease}`, solo valores numéricos seguros y tiempo dentro de la escena. Si ya existe GSAP manual en el objetivo, se conserva el existente.
- El sistema NO inventa keyframes para descripción textual sin geometría/tiempo/selector. El archivo `src/direction-compiler.mjs` informa cuando no puede generar el movimiento.
- Para continuidad visual entre escenas SVG existentes usar `transition:"fade"` en la escena entrante. El renderizador mantiene la anterior 0,42 segundos tras su final y superpone una transición de opacidad sin desplazar la narración.
- Si se trata de cortes secos deseados, mantener `cut`.

## Personajes
- Mantener `data-motion-actor` y articulaciones reales en SVG. Para medir el contacto plantar, añadir a la geometría visible un ancla `data-dvj-foot="izquierdo"` o `"derecho"` y `data-dvj-contact="planted"` solo durante el apoyo real; usar `air` durante balanceo.
- `src/contact-motion-audit.mjs` inspecciona cambios de posición de anclas explícitas. La ausencia de anclas significa SIN EVALUAR, no aprobado.
- La prueba no demuestra anatomía correcta, reparto de peso ni realismo corporal sin inspección humana.

## Audio y dirección
- `wordTimings` contiene tiempos reales y globales; no crear marcas sintéticas ni reescalar la narración.
- `src/audio-quality-audit.mjs` valida cronología y mide LUFS/true peak del MP4 cuando hay audio. La medición no verifica que los acontecimientos correspondan semánticamente a palabras pronunciadas.
- Mantener niveles subordinados a la voz; no añadir efectos de sonido obligatorios. SFX de fuentes externas requieren consentimiento/criterio de licencia.

## Evidencia post-render
- Motion Studio analiza el MP4 y produce `out/quality-reviews/<render-id>/index.html` con fotogramas al principio, mitad y final de las escenas. Se accede también mediante `/reviews/<render-id>/index.html` mientras el servidor está encendido.
- Las observaciones de bajo movimiento y contraste son señales, no juicios estéticos.
- El resultado del trabajo contiene `visualAudit`, `audioTimingAudit`, `audioLoudnessAudit` y `contactSheet` si cada análisis terminó.

## Cinco pruebas de aceptación
- `npm test`, `npm run lint`, `npm run studio:build`.
- `npm run accept:five`: genera JSON y HTML de anatomía, volcanes, personajes, historia y gráficos; prueba contrato técnico.
- `npm run accept:five:runtime`: además abre navegador y prueba la timeline.
- `npm run accept:five:render`: también renderiza cinco MP4 de diagnóstico, analiza fotogramas/audio y genera hojas de contactos.
- `visualApproval` se mantiene `false` hasta que una persona inspeccione y apruebe cada render. La galería técnica no mide por sí sola calidad de nivel profesional.
