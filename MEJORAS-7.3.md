# Motion Studio 7.3.0 y Motion Graphics 1.8.0

El complemento produce el código y las acciones. Motion Studio conserva ese
código al importar y guardar, ejecuta su reloj y exporta el resultado. Ambos
comparten límites, campos, tiempos y validación, con copias comprobadas desde
`plugins/motion-graphics`.

## Exportación y reproducción

- Corregido el error de GSAP por `.dvj-handle` ausente. Los elementos opcionales
  se consultan antes de animarlos; los selectores obligatorios erróneos siguen
  provocando un error útil. Se conserva compatibilidad con pistas antiguas.
- HyperFrames y Puppeteer tienen versiones fijadas en la instalación. El render
  utiliza un trabajador y desactiva la GPU del navegador para esta ruta de CPU.
- La revisión abre un navegador privado, sirve únicamente los recursos de la
  composición y comprueba tiempos, selectores y ejecución antes de exportar.
  El cierre contempla la terminación del proceso en Windows antes de su evento
  de salida. La captura se distribuye entre todas las escenas.
- El progreso interpreta los mensajes reales del renderizador. El 100 % queda
  reservado al archivo terminado.
- Se incluyen las cinco fuentes del estilo de subtítulos y sus licencias; el
  servidor y el exportador entregan los mismos archivos.
- Se conserva la precisión de los tiempos globales por palabra y se calculan
  los límites de fotograma desde el tiempo acumulado, también a 30 FPS.
- Las escenas privadas reciben un reloj numérico y actualizan GSAP con eventos
  explícitos. Se evita que la optimización de la exportación trate su timeline
  como un objetivo animable y omita estados de los subtítulos o las ilustraciones.
  La verificación de subtítulos compara los glifos de cada palabra entre el
  navegador y el fotograma exacto del MP4, después de decodificarlo.
- La ruta Remotion repara en una caché local los binarios nativos afectados por
  DLL con tablas de firma truncadas, utilizando bibliotecas compatibles ya
  instaladas en este equipo. No modifica archivos del sistema ni su seguridad.

## Construcción visual del complemento

- Reparto ejecutable: la ficha y el personaje visible utilizan la misma
  definición. La familia de adultos editoriales incluye cuello, torso, piernas,
  hombros, codos, muñecas, manos y variantes de cara, cabello, gafas y ropa.
- Los brazos conservan sus longitudes y rechazan muñecas inalcanzables. Las
  poses se calculan desde el tiempo, por lo que admiten avanzar y retroceder.
- Agarre de láminas con dedos por delante y antebrazo por detrás; mano con índice
  para presionar; objetos sujetos bajo la misma transformación de la mano.
- Bisagras con dos anclajes fijos y profundidad explícita de caja, tapa y contenido.
- Las etiquetas con líneas guía se ajustan al encuadre después del movimiento
  de cámara, conservando el inicio de la guía unido al objeto. Se evita cortar
  palabras al hacer acercamientos o desplazamientos.
- Las acciones establecen sus valores iniciales desde cero para evitar saltos
  al comenzar movimientos retrasados.
- `examples/inventores-sellado.mjs` ejecuta presentación, colocación, liberación,
  retirada de las manos, cierre y apertura de una mordaza.

Esta familia de personajes tiene un estilo y un alcance concretos. Otros tipos
de personaje o referencias requieren dibujos y rigs específicos. Los ensayos
de ejecución no sustituyen la revisión visual de cada video.

## Uso

Cerrar y volver a abrir Motion Studio con `abrir-motion-studio.cmd` carga los
módulos nuevos. El lanzador comprueba las versiones instaladas e instala las
dependencias que falten. Requisitos: Node.js 22.13 LTS o 24 y superiores y FFmpeg/FFprobe.
El navegador debe estar disponible localmente o prepararse en la instalación
inicial. El proyecto guardado y sus recursos no forman parte del paquete de
actualización y se conservan.

## Verificación reproducible

```powershell
npm test
npm run lint
npm run studio:build
npm run build
npm run test:ecosystem -- --runtime --out revision-contrato
npm run test:smoke
npm run render:motion-test
node scripts/verify-stable-render.mjs proyecto.json --out revision-video
node scripts/verify-render-audio.mjs original.mp3 revision-video/verified.mp4 revision-video/audio.json
node scripts/verify-render-captions.mjs proyecto.json revision-video/verified.mp4 --out revision-palabras
```

El contrato prueba importación, guardado repetido y exportación de tres casos:
continuidad de objetos, palabras a 30 FPS y personajes con contacto. La revisión
del proyecto completo produce capturas de sus 16 escenas; la exportación real
se descarga, se inspecciona con FFprobe y se decodifica con FFmpeg. La comparación
de audio mide alineación de la señal al inicio, mitad y final, sin afirmar que
ha realizado una nueva transcripción semántica.
