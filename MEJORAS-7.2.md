# Motion Studio 7.2 y Motion Graphics 1.7

Documento histórico. La actualización vigente y sus comprobaciones están en [MEJORAS-7.3.md](MEJORAS-7.3.md).

## Sincronización 7.2.2 / complemento 1.7.2

La fuente publicada del complemento se conserva ahora junto al sistema en `plugins/motion-graphics`, separada de los prototipos de personajes sin revisión. El sistema y el complemento exponen el mismo descriptor de capacidades: `GET /api/integrations` devuelve `sceneContract` y el complemento incluye `scripts/capabilities.mjs`.

`npm run test:ecosystem` verifica seis módulos compartidos, genera ejemplos con el ensamblador del complemento, compara ambos validadores, comprueba importación repetida sin cambios de código, actores o palabras y produce el HTML del exportador real. `--sync` actualiza las copias del complemento desde las fuentes de Motion Studio. La prueba forma parte de `npm test`.

Se corrigió un cambio de representación decimal en los beats al importar repetidamente el mismo proyecto; esa diferencia alteraba la huella del JSON. Pasaron 101 pruebas generales, las dos rutas de integración técnica, lint, TypeScript y ambas compilaciones. Estos resultados no certifican el render final ni el acabado visual. El navegador de revisión rechazó abrir el archivo local por política de protocolo; no se usó una vía alternativa para eludir ese bloqueo.

El smoke con servidor real pudo guardar y recuperar un proyecto temporal, importar imagen y WAV y comprobar los bloqueos de exportación. El MP4 de esa prueba no se completó: el `ffprobe.exe` incluido con Remotion terminó con código 3221225477 al analizar el WAV en este entorno. El smoke completo sigue fallido; no se registra como aprobado. El proyecto guardado del usuario no se utilizó para esas operaciones.

## Corrección 7.2.1 / complemento 1.7.1

El generador de subtítulos intentaba cambiar la visibilidad de `.dvj-handle` aun cuando la palabra o la escena no usaban recuadro. GSAP emitía avisos por selectores y NodeList vacíos, y la revisión previa los trataba como fallo de exportación. Ahora esos tres cambios opcionales comprueban primero que existan tiradores. La exportación aplica la misma reparación a scripts antiguos, sin modificar el proyecto guardado, las palabras ni sus tiempos. La revisión de otros selectores permanece activa. Guardar el proyecto y reiniciar Motion Studio permite volver a exportar el mismo JSON.

Verificación de la corrección: 14/14 pruebas específicas, incluidas palabras sin recuadro, con recuadro y combinadas, y compatibilidad de scripts antiguos. Suite general 99/100, con el mismo bloqueo de loopback en el caso de servidor. Lint, TypeScript e interfaz y bundle aprobados. El revisor del proyecto guardado sigue bloqueado aquí por `EACCES 127.0.0.1`, y el render por la descarga inaccesible del navegador; no se certifica un MP4 completado.

## Cambios de producción

- Ficha explicativa por escena: objetivo, estados de entrada/salida, acciones con tiempos y consecuencias, planos con foco y propósito, materiales, iluminación y pausa justificada.
- Registro de personajes y objetos recurrentes mediante `actors`. La ficha se conserva al importar, guardar y enviar el brief al generador.
- Avisos de continuidad, actores ausentes y pausas extensas. Son observaciones de planificación, no puntuaciones de calidad artística.
- Importación de SRT con una palabra por bloque. Los tiempos permanecen globales; no se reescalan ni se inventa alineación dividiendo frases.
- `wordTimings` compartidos y `captionMode`: `embedded` conserva la pista de la escena; `global` utiliza la pista del motor; `none` no añade una pista. Esta última opción no borra textos dibujados manualmente en SVG o Canvas.
- Pista global independiente del movimiento de cámara. Las pistas antiguas reconocidas se ocultan al activar explícitamente la global para evitar duplicados.
- Transiciones fade/dip/flash para escenas personalizadas sin estirar su duración.

## Correcciones del motor

- Renderer declarativo compartido por Remotion y HyperFrames: jerarquía de grupos, cámara y profundidad, HUD fijo, imágenes, formas, SVG, paths, texto, captions, partículas y keyframes.
- Conserva alias de fuentes, énfasis por palabra, formas line/blob y gradación. HyperFrames copia las fuentes incluidas cuando están disponibles. Esta instalación no contiene `public/fonts`: se utiliza la familia de respaldo y el revisor lo advierte; no se certifica igualdad tipográfica sin esas fuentes.
- Tiempo de autoría calculado con los FPS reales, incluidos 30 FPS.
- Límites de escena calculados desde el tiempo acumulado: se evita sumar el redondeo de cada escena. Se conservan milisegundos y se discretiza únicamente la salida por fotogramas.
- Validación de identificadores, jerarquías cíclicas, tiempos y estilos de capas. Los tipos sin renderer compatible se rechazan con una explicación; no se sustituyen silenciosamente por rectángulos.
- Remotion rechaza proyectos `customScene` que necesitan HyperFrames, en lugar de exportar una plantilla diferente.
- Los errores de ejecución de escenas quedan disponibles para el revisor. La exportación HyperFrames de escenas personalizadas/declarativas realiza una comprobación de ejecución previa.
- Se descartan respuestas del generador que correspondan a una versión del proyecto anterior a cambios hechos durante la espera.

## Uso en el editor

1. Abrir el proyecto y revisar **Ficha explicativa de la escena** en el inspector. Los botones **Ver acción** llevan al momento correspondiente.
2. Definir actores en **Personajes, objetos y palabras sincronizadas** cuando se necesite continuidad.
3. Importar allí el SRT por palabra y elegir **Usar palabras globales** en las escenas pertinentes. El tratamiento incrustado existente se conserva por defecto.
4. Abrir **Acciones y continuidad** y ejecutar **Comprobar ejecución y tiempos**.
5. Revisar las imágenes y escuchar la narración; la comprobación técnica no concede aprobación visual ni certifica sincronía de oído.

Si ya hay un servidor abierto, cerrar y volver a abrir Motion Studio carga los módulos nuevos. Actualizar solo la pestaña carga la interfaz, pero no reinicia el servidor Node.

## Herramientas

```powershell
npm run lint
npm test
npm run test:explainer
npm run review:explainer -- proyecto.json --out revision
```

La revisión necesita un navegador instalado; `MOTION_STUDIO_BROWSER` permite indicar su ejecutable. El revisor produce estados de inicio, mitad, final y acciones, comprueba tiempos, selectores y texto fuera del lienzo, y captura imágenes. El informe declara por separado que la aprobación visual y la alineación de audio no están verificadas.

Existe también `review:offline`, que intenta la revisión mediante archivos locales cuando el entorno impide conexiones locales. Si el navegador no devuelve evidencia, termina con error; no produce una aprobación ficticia.

## Complemento Motion Graphics 1.7

Se conservan los kits de materiales, efectos, cámaras, mecanismos y rigs existentes. `createExplainer` añade acciones y poses ejecutables asociadas a su ficha, actores estables y comprobación de continuidad declarada. El ejemplo `elasticidad-explicativa.mjs` tiene dos escenas y ocho segundos, expresamente sin audio ni subtítulos.

Los validadores y el ensamblador usan los límites actuales de Motion Studio. El estilo de subtítulos aprobado continúa usando su generador original; el archivo final guarda también las palabras globales. La excepción explícita sin texto no exige fabricar tiempos de voz.

## Alcance

Esto mejora herramientas, contratos y comprobaciones. No es un solucionador general de anatomía o física, ni garantiza que cualquier respuesta de un modelo tenga acabado profesional. La calidad visual requiere inspeccionar el resultado final; no se deduce del número de efectos, líneas de código o pruebas aprobadas.

## Verificación de esta actualización

- Estilo y TypeScript: aprobados. Compilación de interfaz y bundle Remotion: aprobados.
- Suite general: 98 de 99 pruebas aprobadas; el caso de servidor real no consigue conectarse a loopback en este entorno. Las pruebas específicas de escenas explicativas y del complemento pasan (9 de 9).
- Las dos pruebas de rutas IA y el smoke de servidor quedan bloqueados por la misma restricción de conexión local. No se ejecutaron llamadas pagadas a modelos ni transcripción externa.
- El render de prueba no pudo descargar Chrome Headless Shell (`ENOTFOUND storage.googleapis.com`). Los intentos con navegadores instalados no devolvieron capturas verificables. La inspección visual, la escucha y el MP4 final siguen pendientes.
