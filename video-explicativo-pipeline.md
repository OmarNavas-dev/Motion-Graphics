# Pipeline de video explicativo profesional

Motion Studio ahora se orienta a videos de temas variados mediante este flujo:

1. Tema y guion.
2. Storyboard por propósito: hook, contexto, hecho, comparación, proceso, payoff o CTA.
3. Dirección visual por escena.
4. `customScene` para diagramas, SVG, mapas, redes y capas.
5. Captions temporizados cuando existen timestamps reales.
6. Motion graphics ligados a cifras verificadas.
7. Revisión fiel y aprobación antes del MP4.

## Qué necesita el usuario

- Un tema concreto.
- Un guion o narración.
- Audio opcional.
- Imágenes/referencias si el video necesita arte real.
- Timestamps de palabras/frases si se quieren subtítulos sincronizados.

## Qué hace el sistema

- Conserva la ruta local sin IA cuando no hay proveedor.
- El planificador IA recibe texto y tiempos, no audio, claves ni referencias.
- Propone tema, audiencia, promesa, hechos y propósito visual por escena.
- Puede proponer captions y gráficos; los números deben aparecer en el guion.
- Renderiza escenas SVG/HTML deterministas con HyperFrames.

## Límite honesto

El sistema ya puede crear videos explicativos gráficos y editoriales de distintos temas. Todavía no genera automáticamente ilustraciones complejas ni hace alineación palabra-a-palabra desde un MP3 sin timestamps. Para acercarse al formato de TikTok hacen falta assets temáticos, una transcripción con timestamps y sound design separado.
