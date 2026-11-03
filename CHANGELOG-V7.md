# Motion Studio 7.0.0

## Cambios principales

- HyperFrames CLI 0.8.225 integrado como motor principal de exportación MP4.
- Validación previa de la composición (`hyperframes lint`) y del equipo (`hyperframes doctor`).
- Render directo desde el editor mediante un trabajo local y descargable.
- Remotion conservado como motor alternativo.
- Copia temporal segura de imágenes, videos MP4, narración, diálogos y música.
- Música al 18 % y clips de video silenciados para evitar duplicar el audio.
- Composición GSAP con timeline de duración completa y solapamiento visual de transición sin recortar la narración.
- Movimiento de cámara para imágenes y clips, gráficos inteligentes y cues temporizados.
- Exportación HTML independiente actualizada a V7.
- Prueba de Windows `probar-motion-studio-7.cmd`.

## Requisitos

- Node.js 22 o superior.
- FFmpeg/FFprobe disponibles en PATH.
- Conexión a Internet durante la primera instalación del CLI y Chrome.
- Después de instalar esos componentes, los renders se ejecutan localmente.

## Validación

- 48 pruebas automatizadas aprobadas con `npm test`.
- HTML de muestra V7 generado y comprobado con recursos locales.
- El render final del CLI debe probarse en Windows con `probar-motion-studio-7.cmd`.

## 7.0.1 — Corrección de FFmpeg en Windows

- Se añade `instalar-ffmpeg.cmd`, que instala FFmpeg desde el paquete WinGet de Gyan y verifica `ffmpeg` y `ffprobe`.
- El inicio, el servidor y la prueba reconocen la ruta portable de WinGet, `C:\\ffmpeg\\bin` y una instalación local dentro del proyecto.
- El error de requisitos ahora indica exactamente qué archivo ejecutar.


## 7.0.2 — Corrección de instalación de dependencias

- Se corrigen dos metadatos de `package-lock.json` que declaraban versiones distintas de los paquetes fijados en sus archivos de descarga (`locate-path` y `lru-cache`).
- Se actualiza la versión del paquete a 7.0.2.
- Se mantienen sin cambios el editor, los motores de render y los proyectos de usuario.
- Validación local: 51 pruebas automatizadas aprobadas.

## 7.1.0 — Escenas HTML a medida

- Nuevo campo `customScene` (html, css, script) por escena: sustituye la plantilla automática por HTML/CSS/GSAP propio.
- Validación en el servidor: sin scripts incrustados, eventos, recursos externos, azar, relojes ni red.
- Marcadores `__SCENE__`, `__IMAGE__`, `__VIDEO__` y variables `S`, `T0`, `D` en el script.
- Añadidos `GUIA-ESCENAS-HTML.md`, `ejemplo-escenas-html.json` y `custom-scene.test.mjs`.
- Limitación: la vista previa de Remotion no dibuja `customScene`; se revisa con «Descargar escena como HTML».

## 7.1.1 — Ejemplo de 30 s

- Nuevo `ejemplo-30s-sistema-solar.json`: 6 escenas HTML/GSAP a medida (texto cinético, Sol y haz de luz, órbitas, comparación de tamaños, contadores y cierre), 30 s en vertical.
- Se regenera con `node scripts/generar-ejemplo-30s.mjs`. Las posiciones de estrellas usan azar con semilla fija, así que el video sale idéntico en cada render.
- Primera ejecución: abre este archivo con «Abrir proyecto JSON» y exporta con HyperFrames.

## 7.1.2 — Detección de servidor anterior

- El servidor muestra su versión al iniciar y en `/api/integrations` (`"version"` y `"customScene": true`).
- Si el puerto ya está ocupado (por ejemplo, una versión anterior que sigue abierta), el servidor y `abrir-motion-studio.cmd` lo avisan en español en vez de arrancar en silencio.
- Motivo: una versión anterior que sigue abierta descarta `customScene` sin avisar y exporta la plantilla genérica.

## 7.1.3 — Vista previa fiel

- Nuevo botón **Vista previa fiel** (y la ruta `/preview`): reproduce el mismo HTML que usa HyperFrames, con play/pausa y deslizador, así que muestra las escenas HTML a medida igual que el MP4.
- La vista previa clásica de Remotion sigue igual y no dibuja `customScene`.
- Los archivos de `user-assets` aceptan peticiones `Range`, necesarias para saltar dentro de audio y video.
