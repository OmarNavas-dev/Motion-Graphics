# Motion Studio 7.4.0 - HyperFrames + GSAP + Remotion

Motion Graphics 2.10.0 y Motion Studio 7.4 comparten secuencias y comprobaciones de
movimiento para cualquier tema. Se retiraron cuotas de efectos y camara automatica;
ver [MEJORAS-7.4.md](MEJORAS-7.4.md). El acabado visual se revisa en fotogramas reales.

### P1: corrección visual iterativa

Tras renderizar, Motion Studio genera un informe estructurado de defectos con
escena, segundo y fotograma de evidencia; su descarga aparece junto al MP4.
Motion Graphics lee ese informe con el JSON original, corrige contrastes de texto
deterministas y guía la reautoría de escenas con problemas artísticos.
Ahora permite planes `visual-revision/1` verificables para retocar capas,
HTML/GSAP y movimientos sin modificar el audio ni los tiempos. Con un modelo
multimodal de Ollama **instalado localmente** y `OLLAMA_VISION_MODEL` en `.env`,
el botón **Intentar corrección visual automática** prueba hasta dos renders
adicionales, revisa pares de fotogramas antes/después y conserva el original si
no demuestra mejora. No se envían imágenes a APIs externas.
Importa el JSON corregido, revisa las escenas, apruébalas y usa el nuevo botón
**Renderizar nuevamente el JSON corregido**. Se guardan ambos MP4 y se comparan
alertas técnicas antes y después (máximo tres renders relacionados).
Las alertas heurísticas no sustituyen inspección visual ni aprobación artística.
Ver [P1-VISUAL-ITERATION.md](docs/P1-VISUAL-ITERATION.md).

Los videos no llevan pies editoriales, marcas ni numeracion de escenas. Se retiraron
de las plantillas de ambos motores y del generador. Ver [MEJORAS-7.3.2.md](MEJORAS-7.3.2.md).

### Correcciones de persistencia y exportación

- El proyecto guardado se recupera al reiniciar. El arranque limpio opcional crea un respaldo del JSON.
- Los efectos de audio respetan el inicio y la duración de su escena en Remotion y HyperFrames.
- La importación admite fuentes WOFF2, TTF y OTF y comprueba su firma.
- El servidor entrega GSAP para descargar la composición HTML.
- La vista previa, el HTML y el render HyperFrames comparten la recopilación de recursos, incluidas fuentes y efectos.
- `npm test` incluye pruebas de reinicio, respaldo, fuentes y recursos. Después de `npm run build`, `npm run test:audio-cues` renderiza dos muestras y verifica el audio a 24 y 30 FPS. Necesita FFmpeg.

## Novedades de Motion Studio 7

### Ollama local con Qwen2.5

Motion Studio puede enviar el plan del storyboard al Ollama que ya tienes instalado en tu laptop. En el director creativo selecciona **Ollama local · Qwen2.5** y pulsa **Analizar guion localmente con Qwen2.5**. El servidor se conecta a `http://127.0.0.1:11434/api/chat` con el modelo `qwen2.5:1.5b`; no requiere clave ni envío a un proveedor externo. Asegúrate de que Ollama esté corriendo (`ollama list` debe mostrar `qwen2.5:1.5b`). Puedes cambiar `OLLAMA_MODEL` o `OLLAMA_BASE_URL` en `.env` si lo necesitas. El resultado es solo una propuesta: revísala y elige **Aplicar propuesta**; las escenas quedan pendientes de aprobación. La composición/render de video no se ejecuta dentro del modelo.

### Arranque limpio y limpieza de datos

El editor recupera el último proyecto guardado al reiniciar. Si todavía no hay un proyecto, abre vacío. Para abrir vacío en cada arranque, configura `MOTION_STUDIO_START_CLEAN=true` en `.env`: el proyecto anterior se mueve a un respaldo `data/studio-project-backup-*.json`. Los archivos importados se conservan. Pulsa **Proyecto nuevo** para comenzar, añade escenas o importa un proyecto propio. El botón **Limpiar todos los datos locales…** solicita confirmación escrita y elimina el proyecto guardado, archivos importados, créditos y renders del directorio `out/`; conserva código, dependencias, configuración y lanzadores. Descarga el JSON y respalda `public/user-assets/` antes de limpiar si quieres guardar tu trabajo. Al iniciar, un proyecto antiguo inválido se aparta como archivo de recuperación en `data/` en vez de mostrarse; si es información útil, respáldala fuera del sistema antes de eliminarla.

**Corrección 7.0.2:** se reparó `package-lock.json` para que `npm ci` instale las dependencias sin el conflicto de versiones de `locate-path` y `lru-cache`.

- **HyperFrames es ahora el motor principal de exportación MP4.** El editor
  crea una composición HTML y la renderiza directamente; ya no tienes que
  descargar el HTML, abrir otra herramienta ni volver a importar el MP4.
- **Conserva todos los medios del proyecto:** imágenes, clips MP4, una narración
  completa o diálogos separados y música de fondo. Los videos se renderizan
  silenciados para evitar duplicar la voz.
- **Sincronización temporal corregida:** las transiciones visuales pueden
  solaparse 0,42 segundos sin acortar la duración total ni adelantar el audio.
  La composición GSAP se extiende hasta el final del video.
- **Motion graphics editables:** contadores, barras, anillos de progreso e
  indicadores se incluyen en la composición y se animan en sus tiempos.
- **Movimiento de cámara por escena:** acercar, alejar, desplazar, ascender o
  deriva, respetando el encuadre y el punto de foco elegidos.
- **Remotion permanece como alternativa** por si HyperFrames no puede instalarse
  o falta FFmpeg en el equipo. Los proyectos JSON y el editor existente se conservan.
- **Sin APIs ni créditos de pago:** el render se realiza localmente. La primera
  ejecución instala HyperFrames desde npm y prepara su navegador Chrome.

**Requisitos de HyperFrames:** Node.js 22.13 LTS o 24 y superiores y FFmpeg/FFprobe.
En Windows, si faltan, haz doble clic en `instalar-ffmpeg.cmd`: instalará el paquete gratuito de Gyan mediante WinGet y verificará ambos ejecutables. Motion Studio reconoce la ruta portable de WinGet y las rutas locales habituales; no tienes que editar manualmente las variables de entorno. Si WinGet no está disponible, el instalador muestra la alternativa manual desde [gyan.dev/ffmpeg/builds](https://www.gyan.dev/ffmpeg/builds/). La primera instalación necesita conexión a Internet; después, el render se realiza en el equipo.
El motor usa 24 FPS y un trabajador por defecto para reducir el uso de memoria; opcionalmente admite 30 FPS y salida 1080p desde el inspector.

**Prueba de V7:** primero ejecuta `instalar-ffmpeg.cmd` si el equipo no tiene FFmpeg. Después haz doble clic en `probar-motion-studio-7.cmd`. Ejecuta las
pruebas automatizadas, genera una composición temporal neutral (sin tus medios ni
proyectos), descarga el navegador necesario y renderiza una muestra técnica.

La V6 Beta original no se modifica: esta es una copia independiente.

**Corrección de inicio en Windows (5.0.1):** el archivo
`abrir-motion-studio.cmd` comprueba que existan tanto Remotion como el comando
de Vite. Si faltan dependencias, ejecuta automáticamente
`npm ci --include=dev --no-audit --no-fund` antes de compilar el editor.
La versión 5.0.0 podía omitir este paso si encontraba Remotion Player,
aunque Vite no estuviera instalado.

Si aparece `"vite" no se reconoce`, abre una ventana CMD dentro de la carpeta
`motion-studio` y ejecuta `npm ci --include=dev --no-audit --no-fund`.
Después vuelve a abrir el editor. No se necesita instalar Vite globalmente.

**Funciones heredadas de V5 y V6:** dirección visual adaptativa por tema,
titulares cinéticos, estilos por escena, referencias visuales reutilizables,
revisión obligatoria, gráficos numéricos locales, búsqueda opcional de medios,
transcripción opcional con Groq y asesor creativo opcional con FreeLLMAPI.
La V4.2 y la V6 Beta originales permanecen intactas.

### Primer ensayo recomendado

1. Ejecuta `abrir-motion-studio.cmd` y abre el editor.
2. Pulsa **Proyecto nuevo**, importa tu guion y agrega tus propias escenas y medios.
3. Revisa y aprueba cada escena antes de exportar.
4. Pulsa **Exportar MP4**. El primer render HyperFrames instala el motor y Chrome si hace falta.
5. El MP4 aparecerá en `out/` y también tendrás el enlace de descarga en el editor.
6. Si HyperFrames no está disponible, elige Remotion como alternativa.

**No se necesitan claves para el motor local.** FreeLLMAPI, Groq, Pixabay y
Openverse siguen siendo integraciones independientes y opcionales, con los mismos
límites/condiciones que la versión anterior. No confundas vectores automáticos
con imágenes generadas por IA: son procesos diferentes.

Si utilizas FreeLLMAPI Desktop, copia `.env.example` como `.env` y verifica
que el puerto `FREELLMAPI_BASE_URL` coincida con el que muestra la pestaña
«Clave de API unificada» de FreeLLMAPI (en tu captura era **31415**). Pega tu
clave solo en ese archivo local; nunca la añadas al ZIP ni a un mensaje.

---

Una aplicación para diseñar, previsualizar y exportar motion graphics 2D con
HyperFrames como motor principal y Remotion como alternativa en Windows de 8 GB.
El motor sigue funcionando localmente sin API,
pero ahora puedes buscar recursos con Openverse/Pixabay, transcribir con Groq
y traer clips animados desde HyperFrames. Esta versión también crea contadores,
barras, gráficos circulares e iconos animados desde el guion, sin pagar APIs.
Ahora incluye un **director creativo opcional con FreeLLMAPI** para proponer
estilos, animaciones y recursos según el guion. El modo local sigue operativo
sin claves ni conexión y las APIs de pago no se activan automáticamente.

La composición original **MotionProfesional** permanece intacta y también
se conserva **StudioVideo**, el motor de previsualización y exportación.
Se añadió un flujo de narración, estilos por proyecto, audios de diálogo
y aprobación de escenas antes de exportar.

## Empezar en Windows (Lenovo, 8 GB de RAM)

1. Instala [Node.js 22 LTS](https://nodejs.org/) de 64 bits si aún no lo tienes.
2. Descomprime el ZIP en una carpeta normal de Windows, por ejemplo Documentos.
3. Abre la carpeta `motion-studio`.
4. Haz doble clic en **abrir-motion-studio.cmd**.
5. Espera a que termine la instalación/compilación la primera vez.
6. El editor se abrirá en **http://127.0.0.1:4317**.

Mantén abierta la ventana **Motion Studio - Servidor** mientras lo uses.
Al terminar, ciérrala. Todo funciona en tu computadora; no necesitas una
cuenta de la aplicación.

## Qué puedes hacer

- Crear entre 1 y **80 escenas** de 0,5 a 60 segundos (máximo **15 minutos** por video).
- Editar título, descripción, orden, estilo y duración de cada escena.
- Elegir formato vertical 720 × 1280 u horizontal 1280 × 720, a 24 FPS.
- Elegir entre 3 paletas, **6 diseños visuales** y **9 estilos globales**:
  moderno, terror, acuarela, documental, cine, tecnología, minimalismo,
  publicidad/deporte y educativo/divertido. Puedes mezclar estilos por escena.
- Nuevas plantillas generales **tipografía cinética** y **collage audiovisual**.
- **Presets para videos narrados:** prepara el brief visual para Relato narrado,
  Curiosidades o Historia/explicación sin cambiar guion, audios ni medios importados.
- **Subtítulos por frase:** Groq puede proponer frases temporizadas desde la transcripción
  aproximada; puedes editarlas por escena o añadirlas manualmente. No es alineación por palabra.
- **Nivel de música editable:** ajusta el volumen de fondo para que no compita con la voz.
- **Gráficos inteligentes automáticos:** detecta datos numéricos en guiones
  (presupuestos, porcentajes, ventas y métricas) y propone contadores, barras,
  gráficos circulares e iconos ligeros. Se generan localmente y pueden editarse.
- Detección por contexto: no agrega gráficos financieros a historias de terror,
  cuentos bíblicos o narraciones que no necesitan cifras en pantalla.
- En el inspector de cada escena puedes editar tipo de gráfico, cantidades,
  porcentajes, máximos, categorías, iconos y segundos de aparición y animación.
- Reutiliza escenas existentes con **Generar gráficos en las escenas actuales**,
  sin sustituir sus MP3, imágenes ni referencias.
- **Director creativo con IA:** FreeLLMAPI propone primero tema, audiencia,
  promesa, hechos y storyboard; después deriva composición, estilo, movimiento,
  gráficos y búsquedas visuales para cada escena. Puedes revisar y descartar el
  plan antes de aplicarlo, sin perder tu voz ni tus imágenes.
- **Control de datos:** los valores numéricos de los gráficos de la IA se
  contrastan contra el guion y se descartan si no aparecen en el texto.
- Elegir movimiento de cámara por escena (acercar, alejar, desplazarse,
  ascender, deriva o cámara fija), intensidad y punto de encuadre de cada imagen.
- Elegir corte limpio, entrada desde negro, oscurecimiento o destello;
  sin alterar la duración de los audios.
- Escribir una dirección artística libre por proyecto para utilizarla en el
  intercambio manual con Claude; se conserva en el JSON exportado.
- Sugerir un estilo a partir de las palabras del guion mediante reglas locales gratuitas.
- Pegar el guion y crear un **storyboard preliminar** usando marcas de tiempo como (0:14).
- Se conservan todos los bloques con tiempo: el último ya no desaparece si
  la estimación de palabras termina antes de su marca. Cuando hay MP3, las
  marcas se pueden escalar a la duración del audio como punto de partida.
- Usar **un MP3 completo** o **muchos archivos por diálogo**, en orden y con duración individual.
- Elegir por proyecto si conservar personajes o crear nuevos, guardar hasta 20
  imágenes de referencia y reutilizarlas en las escenas.
- Descargar y volver a abrir proyectos como JSON. El editor mantiene un único
  proyecto activo; usa **Descargar proyecto** antes de comenzar otro.
- Importar PNG/JPG/WebP, voz MP3/WAV/M4A y música propia (máximo 50 MB por archivo).
- Importar clips MP4 como escena (por ejemplo, los exportados en HyperFrames),
  sin su sonido original para no duplicar la voz. Ajusta su duración manualmente.
- Buscar fotos para una escena con Openverse sin clave y Pixabay con clave gratuita.
  Solo se pueden importar desde fuentes de imágenes autorizadas por seguridad.
- Conectar opcionalmente Groq/Whisper para generar una transcripción con marcas
  de tiempo. Se envía audio únicamente cuando lo confirmas.
- Descargar la escena seleccionada como HTML compatible con HyperFrames,
  y reimportar su MP4 una vez que lo renders con HyperFrames.
- Crear elementos vectoriales con aparición programada por segundo.
- **Aprobar cada escena** en el inspector. El botón Exportar y el servidor
  rechazan una exportación si alguna escena no está aprobada.
- Revisar el inicio, la mitad y el final de cada escena y leer advertencias
  técnicas antes de exportar. Las alertas no sustituyen una revisión humana.
- Previsualizar el montaje con Remotion Player; el MP4 final lo genera HyperFrames y debe revisarse tras exportarlo.
- Exportar MP4 con HyperFrames (un trabajador); Remotion sigue disponible como motor alternativo.
- Guardar automáticamente el video en `out/` y descargarlo desde el editor.
- Generar un borrador de escenas mediante reglas locales sin IA ni Internet.
- Copiar instrucciones para Claude e importar el JSON generado por él.

La conexión con Claude es **opcional y manual**. FreeLLMAPI también es opcional:
la IA solo recibe textos cuando pulsas su botón. La generación local de
storyboard y estilos utiliza reglas, **no es IA generativa y no crea imágenes**.
La búsqueda visual y la transcripción necesitan Internet; las APIs pueden
devolver errores por límites gratuitos o disponibilidad. El tiempo de cada
segmento transcrito es aproximado, y debe revisarse antes de exportar.

## Gráficos inteligentes: prueba de finanzas

1. Selecciona formato vertical, pega el guion y carga tu MP3 en **Audio**.
2. Pulsa **Crear storyboard desde narración**: el sistema detectará valores,
   proporciones e iconos apropiados. No necesita conexión a Internet.
3. Si ya tienes escenas creadas, pulsa **Generar gráficos en las escenas
   actuales**. Esto conserva tus archivos importados y retira las aprobaciones
   para que vuelvas a revisar los cambios.
4. En el inspector abre **Gráficos inteligentes**. Corrige las cantidades,
   etiquetas, segmentos y segundos de cada efecto; puedes añadirlos o quitarlos.
5. Escucha la voz en la vista previa, aprueba cada escena y exporta MP4.

**Sincronización:** las marcas de tiempo y la duración del MP3 sirven para
crear una propuesta. No se trata de reconocimiento exacto de cada palabra:
afina el campo **Aparece (s)** con el reproductor antes de aprobar.
La detección usa reglas locales; no inventa datos faltantes ni cifras financieras.
## Director creativo FreeLLMAPI (opcional, para cualquier tema)

Esta integración mejora la **planificación visual**: no renderiza el MP4 final
ni sustituye a Remotion. Solo se envían textos cuando tú lo solicitas. No se
envían MP3, imágenes, referencias ni rutas de archivos; el token queda en el
servidor local y no se expone en el navegador.

**Para configurarlo en Windows:**

1. Instala FreeLLMAPI desde su [repositorio oficial](https://github.com/tashfeenahmed/freellmapi)
   y configúralo con al menos un proveedor que hayas autorizado. Obtén su
   clave unificada; Motion Studio no entrega claves de otros servicios.
2. Comprueba que FreeLLMAPI esté funcionando en `http://127.0.0.1:3001`
   (puerto de ejemplo). Déjalo abierto mientras utilices el asesor IA.
3. Duplica `.env.example`, renómbralo `.env` en la carpeta `motion-studio` y
   configura estas opciones, sin compartir el archivo:

```ini
FREELLMAPI_BASE_URL=http://127.0.0.1:3001
FREELLMAPI_API_KEY=tu-token-unificado
FREELLMAPI_MODEL=auto
```

4. Reinicia `abrir-motion-studio.cmd`. En el editor aparecerá el router como
   configurado. Si tu router está en la nube, `FREELLMAPI_BASE_URL` debe
   empezar por `https://`.
5. Pega tu guion y crea primero el storyboard local. Pulsa **Analizar guion
   y proponer motion graphics con IA**. El asesor permite hasta **30 escenas
   por solicitud** (el editor completo sigue admitiendo hasta 80).
6. Revisa la propuesta de movimientos, estilos y gráficos antes de pulsar
   **Aplicar propuesta**. Se mantienen audios, imágenes, referencias, orden
   y duraciones. Todas las escenas quedan pendientes de aprobación.
7. Si la IA sugiere una búsqueda visual, abre esa escena en el inspector y
   pulsa **Buscar este recurso**; después selecciona la fotografía que quieras.
   Siempre puedes comprobar su procedencia y licencia.

**Limitaciones importantes:** FreeLLMAPI no ofrece tokens ilimitados. Sus
propios autores recomiendan los agregadores de planes gratuitos para aprender y
experimentar, no como garantía de producción. Cada proveedor puede restringir
el uso comercial, imponer cuotas o dejar de estar disponible. Revisa sus
condiciones antes de monetizar videos. Un error de API nunca debe cambiar el
proyecto: puedes continuar sin conexión con el generador local.

Por ahora usamos `/v1/chat/completions` para proponer dirección artística.
**No se activa la generación remota de imágenes o videos:** la disponibilidad
y las licencias dependen de proveedores externos. Seguimos permitiendo la
búsqueda de imágenes gratuitas mediante Openverse y Pixabay.

## APIs híbridas y seguridad

Openverse funciona sin clave. Para activar Pixabay y Groq:

1. Busca el archivo `.env.example` en la carpeta de Motion Studio.
2. Haz una copia llamada `.env` (conserva el punto inicial).
3. Rellena tus claves `PIXABAY_API_KEY` o `GROQ_API_KEY` y guarda.
4. Reinicia `abrir-motion-studio.cmd`.

La búsqueda con Pixabay conserva temporalmente resultados durante 24 horas
para respetar las condiciones de su API; Openverse usa una caché más breve.

No pegues tus claves en el guion, el JSON del proyecto ni en un chat.
El servidor solo indica si hay una API configurada, sin revelar su clave.
Las imágenes descargadas se guardan en `public/user-assets/` y su procedencia
en `data/media-credits.json`. Revisa atribuciones y términos de cada recurso.
Las imágenes de bancos externos no garantizan consistencia de personajes.
Una URL no segura o un recurso demasiado grande puede ser rechazado.

## Motor HyperFrames integrado

Motion Studio 7 utiliza el CLI oficial de HyperFrames para renderizar MP4
directamente desde el servidor local. No requiere una cuenta ni una API de pago.
El programa ejecuta la versión fijada `hyperframes@0.8.225` mediante `npm exec`,
valida la composición con `hyperframes lint`, prepara Chrome, ejecuta `hyperframes doctor`
y renderiza a 24 FPS con
`--workers 1`.

- **Primera ejecución:** requiere Internet para descargar el CLI y Chrome.
- **Requisitos locales:** Node.js 22.13 LTS o 24 y superiores, y FFmpeg/FFprobe disponibles en PATH.
- **Medios:** el render directo copia al proyecto temporal imágenes, MP4, voz,
  diálogos y música. Se permite un máximo combinado de 512 MB por exportación.
- **Audio:** la narración y los diálogos se colocan en pistas separadas; la música
  se mezcla al 18 %. El audio original de los clips MP4 se silencia.
- **Sincronización:** la duración final se calcula con la suma de las escenas;
  los solapamientos de transición no recortan la línea de tiempo.
- **Salida:** `out/studio-<id>.mp4`. El editor muestra el progreso y permite
  descargar el archivo al terminar.

El apartado **Motor HyperFrames** también permite descargar el HTML de una escena
o del proyecto completo. Ese archivo incluye GSAP y puede abrirse como un proyecto
independiente de HyperFrames. La exportación HTML desde el navegador tiene un
límite de 28 MB de medios incrustados.

**Remotion se mantiene como alternativa** desde el mismo apartado. Si el equipo
no tiene FFmpeg o no puede descargar Chrome, puedes seguir exportando por CPU
con Remotion.

## Uso básico del editor

1. Escribe el nombre, formato y estilo del proyecto (o pulsa **Sugerir estilo**).
   También puedes dar instrucciones artísticas libres y cambiar el estilo de
   cada escena; para videos con letras grandes elige **Tipografía cinética**.
2. Decide si conservar personajes y carga sus imágenes de referencia.
3. Carga un MP3 completo **o** varios audios ordenados por diálogo.
4. Pega tu guion en **Guion y storyboard**. Si tiene marcas (0:00), (0:08),
   (0:14), se usarán para proponer escenas. Pulsa **Crear storyboard**.
5. Si configuraste FreeLLMAPI, puedes pulsar **Analizar guion y proponer motion
   graphics con IA**, leer el plan y aplicarlo si te convence.
6. Revisa cada escena en la vista previa, importa imágenes, define su movimiento,
   transición y encuadre. Pulsa **Ver inicio / Ver mitad / Ver final**.
7. Pulsa **Aprobar esta escena** después de comprobarla. Un cambio visual
   importante retira las aprobaciones para volver a revisar.
8. Pulsa **Guardar** y después **Exportar MP4 · HyperFrames**. Si falla la
   instalación o el motor, utiliza **Remotion como alternativa**.

Para alternar entre proyectos, pulsa **Descargar proyecto** y guarda su JSON;
después pulsa **Proyecto nuevo**. Para recuperarlo usa **Abrir proyecto JSON**.
Al importar un proyecto, sus escenas vuelven a quedar sin aprobar.

Para sincronizar una figura con una palabra, mueve el reproductor al
momento correcto, selecciona la escena y pulsa **+ Elemento**. Ajusta su segundo.

**Importante:** el audio no se estira ni se acelera. La interfaz muestra su
duración y avisa si no coincide con la suma de las escenas. Si el guion
no tiene tiempos, las escenas son un borrador orientativo, no una
transcripción ni sincronización exacta. Los audios por diálogo se colocan
uno detrás de otro usando sus duraciones; revisa el orden y cada duración.

**La Llorona:** la narración de prueba dura aproximadamente 166,11 segundos,
por lo que supera el antiguo límite de la v2. En v4 cabe dentro de los
15 minutos permitidos. El estilo aconsejado es terror cinematográfico,
con textos en pantalla desactivados. Importa las referencias originales
del protagonista y La Llorona para mantener sus rostros y vestuario.

## Archivos de tu trabajo

- `data/studio-project.json` — proyecto guardado (vacío al iniciar si no existe).
- `data/media-credits.json` — origen y licencia de recursos buscados.
- `public/user-assets/` — narraciones, música e imágenes importadas.
- `public/user-assets/` también contiene los clips MP4 cargados de HyperFrames.
- `out/` — renders MP4 y los parámetros usados.

Al actualizar Motion Studio, conserva esas carpetas si quieres mantener tus proyectos y medios. Para borrar todo el contenido local usa **Limpiar todos los datos locales…** en la interfaz; confirma escribiendo la frase solicitada. Descarga primero el JSON si necesitas una copia.
Los proyectos antiguos de la v2 se normalizan al abrir: sus escenas se
marcan como pendientes de revisión hasta que las apruebes.
El archivo JSON es un plan de edición, **no empaqueta los medios**:
las referencias deben continuar disponibles en `public/user-assets/`.

## Comandos para desarrolladores

```powershell
npm ci
npm run studio:build
npm run studio:start
```

Para cambiar el código del editor y ver cambios en desarrollo, ejecuta
`npm run studio:dev` en otra terminal (puerto 5174) con el servidor
`studio:start` abierto.

Pruebas:

```powershell
npm run lint
npm test
npm run test:smoke
npm run studio:build
```

El test integral levanta un servidor temporal, prueba guardado e importación,
rechaza archivos peligrosos, prueba el bloqueo por falta de aprobación,
verifica que no existan renders paralelos y genera MP4 breves con imagen
y narración (incluido el modo por diálogos). También integra y reexporta un
clip MP4 externo. No reemplaza tu proyecto guardado.
`ffprobe` es opcional y añade comprobaciones del códec de salida.

La prueba de regresión actual se ejecuta con `npm run render:motion-test`. El archivo `render-windows.cmd` se conserva como launcher compatible y verifica una salida válida.

## Notas de rendimiento y seguridad

- Pensado para 8 GB de RAM y procesadores modestos; cierra otros programas
  pesados antes de exportar videos largos.
- No utiliza la tarjeta gráfica dedicada ni requiere Python, Ollama o una
  clave de API para su motor local. Solo las integraciones opcionales usan claves.
- No se incluyen las librerías pesadas del «Kit Editor del Club»: su
  transcripción grande, MediaPipe y DeepFilterNet no son requisitos para
  el equipo de 8 GB. Se aprovechan sus ideas de planificación y revisión.
- El servidor solo escucha en `127.0.0.1`; no expone el editor a Internet.
- Se aceptan únicamente formatos de medios definidos; los nombres guardados
  son generados por el sistema y no se ejecutan archivos subidos.
- Los videos con muchas escenas o elementos pueden tardar varios minutos.
- Los efectos son 2D y están diseñados para renderizarse con CPU. Esto permite
  títulos cinéticos, composiciones de fotos, diagramas, geometría, parallax y
  transiciones simples. No genera actores en 3D, animación facial realista,
  escenas de IA de video ni simulaciones físicas pesadas por sí solo.
- Las plantillas de collage usan imágenes completas, no recortan automáticamente
  personas. Para un recorte limpio importa PNG con transparencia.
- Los recursos de una narración o imagen deben estar cargados antes de exportar.
- Las etiquetas de un elemento pueden dejarse vacías para evitar texto en
  pantalla; para historias bíblicas y de terror desactiva **Mostrar textos**.

## Estado de validación

- Ejecuta `npm test`, `npm run test:smoke`, `npm run test:ai-route`, `npm run lint`, `npm run studio:build` y `npm run build` para validar los cambios locales.
- La suite integral genera MP4 de prueba temporales; la limpieza global del producto no está disponible en su entorno de test.
- Ejecuta `probar-motion-studio-7.cmd` para verificar HyperFrames y FFmpeg en Windows.
- La calidad artística de cada video debe revisarse en el reproductor antes
  de publicarlo; pasar pruebas de código no sustituye la revisión visual y sonora.
