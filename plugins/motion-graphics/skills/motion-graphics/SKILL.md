---
name: motion-graphics
description: Convierte un guion y su narracion en un unico proyecto JSON importable en Motion Studio, con ilustraciones SVG, HTML, CSS, animaciones GSAP y titulos sincronizados. Usar para crear o editar videos a full codigo cuyo entregable sea JSON, eligiendo direccion visual y animacion segun el tema y las referencias del usuario. No usar para solicitudes cuyo entregable sea un MP4.
---

# Motion Graphics

## Integración con Motion Studio 7.4 y herramientas 2.7

Leer [references/direccion-creativa-2.6.md](references/direccion-creativa-2.6.md) y [references/produccion-2.7.md](references/produccion-2.7.md) antes de diseñar escenas. Separar referencias LOOK/MOVES; planificar visualmente causa, acción, consecuencia, estados y continuidad antes de generar el primer SVG. El plan se comprueba con `scripts/validate-creative.mjs`, además de los validadores previos de guion, mecánica, audio y escenas. No inventar tiempos de voz ni imponer una estética cerrada.

Las 16 familias SVG+GSAP ejecutables se encuentran en `scripts/kits/effects-16-kit.mjs`; `assets/effects-16-validation.json` es una galería importable para probarlas, **no** una narración completa. `scripts/morph-motion.mjs` permite deformaciones de formas; `scripts/kinematic-motion.mjs` añade IK para manos/piernas y marcha con pie anclado al mundo. Usar estas herramientas solo cuando su geometría sirva a la historia y revisar postura, peso y oclusión. El resultado final sigue siendo un único JSON autosuficiente.

En el repositorio Motion Studio, `src/custom-scene-preflight.mjs` detecta selectores GSAP simples ausentes e IDs repetidos antes del render. Con MP4 exportado, `scripts/compare-video-motion.py` estima diferencias de movimiento respecto a una referencia, pero no certifica dirección artística. Revisar fotogramas y audio reales; jamás afirmar render verificado por pasar pruebas estáticas. Conservar los anclajes de narración de la versión 7.4.

## Pantalla sin pies editoriales
No incluir en ningun video o JSON pies de pagina, firmas, marcas de agua, titulos de serie inventados, numeracion de escenas (01 / 16), barras de progreso de montaje ni lineas decorativas que los acompanan. En particular, no repetir "ARCHIVO DE UNA INVENCION" ni variantes. Esta regla se aplica a todas las escenas y estilos.
Conservar subtitulos sincronizados y etiquetas que expliquen un objeto, una fecha o una accion de la narracion. Un contador de una magnitud de la historia puede ser pertinente; el numero de escena es metadato interno y nunca se dibuja. Los titulos e indices del JSON permanecen como metadatos, fuera del HTML visible.
Ejecutar la comprobacion de pies editoriales incluida en validate-project.mjs y revisar visualmente los bordes inferior y superior. No ocultarlos solo para exportar: retirar sus nodos del HTML y las animaciones asociadas.

## Contrato compartido con Motion Studio (1.9.0)
Leer [references/contrato-compartido.md](references/contrato-compartido.md). Consultar scripts/capabilities.mjs antes de usar capacidades del motor. Generación, importación y renderizado deben conservar el mismo código y reloj; la validación técnica no concede aprobación visual ni verifica el MP4.

Este complemento se usa dentro de ChatGPT con archivos adjuntos. Leer los archivos disponibles en el entorno de esta conversacion, sin asumir acceso al ordenador del usuario. Crear la composicion completa en codigo dentro de un unico `proyecto.json`. Motion Studio es quien reproduce y exporta. No renderizar MP4, generar voz nueva, publicar en GitHub ni modificar Motion Studio como parte de esta habilidad. La habilidad guia al modelo: no es un servicio autonomo ni garantiza calidad sin revision.


## Movimiento elaborado para cualquier tema (1.9)
Leer [references/animacion-transversal.md](references/animacion-transversal.md) antes de construir escenas. El JSON de diagnostico aportado por el usuario sirve como referencia de procedimientos: articulacion, recortes, profundidad, luz y coordinacion. No fija temas, paletas, anatomias, fuentes, decorados ni una plantilla universal.
Disenar primero la accion que necesita comprenderse: estado inicial, cambio, contacto o revelacion y resultado. Separar colocacion, movimiento, articulacion, objeto sujeto, camara y texto. Elegir las fases y el ritmo por esa accion; una pausa intencional y un plano fijo son validos.
Para acciones con fases usar scene.sequence() de scripts/explainer-kit.mjs: from explicito y beats con duration, to, ease y phase. Genera GSAP y puntos de control del mismo movimiento; no los inventa ni sincroniza por aproximacion con la voz. Se permiten SVG propio, HTML/CSS, atributos SVG y Canvas determinista. La biblioteca adulta es una familia opcional, no el unico modo de crear personajes.
Revisar con scripts/review-project.mjs: comprobar los estados declarados, avanzar y retroceder y abrir las capturas. Revisar tambien manos, apoyos, pivotes, oclusion, lectura de la accion y relacion con la narracion. No declarar acabado impecable solo por aprobar una prueba tecnica.
No exigir cuotas de tweens, texturas, camara, particulas ni etiquetas. check-motion-richness.mjs es un inventario de recursos y de datos incompletos, no una nota de calidad. No agregar decoracion para obtener una puntuacion.

## Escenas explicativas con estado (v1.7)
Leer [references/escenas-explicativas.md](references/escenas-explicativas.md) antes de planificar. Usar scripts/explainer-kit.mjs para generar acciones y poses ejecutables junto a sus fichas de intención. Conservar actores, estados y relaciones entre planos. Ejecutar scripts/check-explainer.mjs; revisar las pausas y la continuidad sin confundir avisos con calidad artística. Mantener los kits existentes y el estilo de subtítulos aprobado.

## Biblioteca de articulación y ensamblaje
Leer [references/rig-y-ensamblaje.md](references/rig-y-ensamblaje.md). Usar scripts/rig-kit.mjs para separar colocación, movimiento, articulaciones y objetos sujetos; las formas las decide cada historia, sin imponer personajes o paletas.
Preparar el código de autoría por lotes internos y ensamblar un solo proyecto con scripts/assemble-scenes.mjs, conservando audio, configuración y texto visible. El ensamblador no fuerza showText ni genera cámara, partículas o rebotes. Integrar subtítulos mediante --words; conservar los tiempos reales.
Calcular repeticiones y stagger antes de producir el JSON. Comprobar su duración efectiva en review-project.mjs: inspecciona GSAP real, no evalúa escenas con un DOM ficticio. La biblioteca y los módulos de autoría no se necesitan para reproducir el JSON final.

## Personajes y contacto
Leer [references/personajes-y-contacto.md](references/personajes-y-contacto.md) antes de construir personajes o interacciones. Usar el reparto ejecutable y la geometría de agarres y bisagras cuando correspondan al estilo elegido; mantener el diseño entre escenas. Revisar contacto, liberación, pivotes y oclusiones en capturas reales. Ejemplo completo: examples/inventores-sellado.mjs.

## Kits de motion graphics (v1.6): materiales, cámara, efectos, etiquetas y mecanismos
Leer [references/kits-motion-graphics.md](references/kits-motion-graphics.md) cuando el tema sea técnico, explicativo o de mecanismos, o cuando el resultado salga plano. Importar `scripts/kits/index.mjs` en el código de autoría y construir cada escena con `createScene()`. Los kits aportan: materiales con textura (acero cepillado, madera, tierra, nubes con grano), cámara con intención (push, corte, sacudida, cámara lenta, paralaje), efectos deterministas (explosión, humo, chispas, onda, corte interno), etiquetas informativas (líneas guía, flechas, termómetro, medidor, lista por pasos, contador) y piezas mecánicas (pistón-biela-cigüeñal con cinemática real, engranajes, resorte, depósito, flujo).
Antes de dibujar, definir accion, encuadre, cambios de estado y recursos que la explican. Elegir materiales, camara, efectos y etiquetas solo cuando aporten. Mantener lo que interactua en un espacio coherente y respetar la zona de subtitulos. Los ejemplos muestran procedimientos, no una estetica obligatoria. Revisar con scripts/check-motion-richness.mjs como inventario y con capturas reales como evidencia visual.

## Herramientas y evidencia, no solo instrucciones
Leer [references/produccion-comprobable.md](references/produccion-comprobable.md). Comprobar capacidades reales del entorno y usar las herramientas disponibles:
- SRT por palabra: `node scripts/import-word-srt.mjs palabras.srt palabras.json --duration SEGUNDOS`. No pedir tiempos que ya se aportaron ni dividir un SRT por frases.
- Revisión ejecutable: `node scripts/review-project.mjs proyecto.json --repo MOTION_STUDIO --out revision-nueva [--browser EJECUTABLE] [--times INSTANTES]`.
- Revisión sin Motion Studio: `python scripts/preview-frames.py proyecto.json --gsap RUTA/gsap.min.js --out carpeta-nueva` genera fotogramas y detecta errores de ejecución; `node scripts/check-motion-richness.mjs proyecto.json` describe los recursos presentes sin imponer cuotas. No sustituyen a review-project.mjs ni a la revisión visual.
- Ejemplos de acciones: `assets/laboratorio-mecanico.json` (nivel de acabado con todos los kits) y `assets/motion-lab.json` para estudiar contacto/reacción, bisagra y mecanismo. Adaptar geometría, tema y ritmo; no es una plantilla estética ni un proyecto narrado.
Primero componer el fotograma final legible; después animar. Separar transformaciones fijas de colocación de los grupos que reciben movimiento para evitar personajes lanzados fuera de su lugar.
Abrir los fotogramas realmente generados, registrar defectos con escena/tiempo, corregir y volver a capturar. Un informe runtimePassed no certifica arte ni audio; no convertirlo en aprobación visual. La revisión debe corresponder al JSON final, no a una versión anterior.
Resolver internamente momentos difíciles, completar todo el proyecto y entregar un único JSON. Si falta una capacidad, declarar la limitación concreta y el trabajo comprobado, sin afirmar perfección ni inventar revisiones.

## Direccion adaptable: primero decidir como contar
Funciona para cualquier historia o tema; no hay una apariencia universal ni una plantilla por palabra clave. Leer [references/direccion-adaptable.md](references/direccion-adaptable.md) ANTES de diseñar. Decidir lenguaje visual, realismo, paleta/luz, gramática de planos y acciones según el propósito del guion. El hijo pródigo y las demás referencias son ejemplos, no modelos que deban repetirse.
Conservar por defecto el tratamiento de subtítulos aprobado, pero separar esa continuidad tipográfica de la dirección de arte y del diseño de personajes. Las instrucciones de dirección adaptable tienen prioridad sobre los apartados visuales históricos.
Diseñar y revisar primero los momentos esenciales dentro del trabajo, corregirlos y continuar hasta el proyecto completo. No usar esta comprobación como excusa para entregar solo un storyboard o pedir aprobación de cada escena.

## Condicion obligatoria de entrega

Si el usuario solicita expresamente un video sin texto o sin subtítulos, conservar esa decisión: no exigir palabras ni inventar una narración. `showText:false` o `captionMode:none` aplica esa excepción en los validadores. Las reglas siguientes corresponden al estilo de subtítulos por defecto cuando hay una pista hablada solicitada.

El estilo aprobado exige tiempos por palabra. Una marca por clip NO basta. Si solo hay tiempos de escenas y no se puede obtener una transcripcion real, pedir el audio completo o palabras temporizadas y dejar pendiente el JSON final. Se puede avanzar con ilustraciones, pero NO reemplazar los subtitulos por frases fijas ni entregar un resultado estatico como si cumpliera el estilo. Solo hacerlo si el usuario solicita explicitamente titulos estaticos.
No usar clip-title/clip-key, una sola frase completa visible durante D ni destacar una palabra fija todo el clip. No confundir el pulso de entrada del contenedor con el pulso de cada palabra.
Es obligatorio ejecutar add-captions.mjs para el estilo por defecto y conservar su HTML, CSS y script sin reescribirlos. Al regenerar, retirar primero la pista de titulos previa sin tocar la ilustracion. Conservar el archivo de palabras reales como evidencia de trabajo para validar; nunca fabricarlo repartiendo la duracion.
No afirmar estilo aplicado solo porque la fuente o el borde se parezcan. Revisar que en el MISMO clip cambian las palabras visibles, la palabra blanca y el recuadro cuando corresponde.
Si el usuario pide expresamente otra pista estatica, explicar que esa pista no pasa la comprobacion del estilo progresivo; no afirmar cumplimiento del estilo habitual.

## Prioridad y base temporal de los subtitulos

Si el usuario aporta palabras-sincronizadas.json u otra lista de palabras con start/end, leerla ANTES de pedir transcripcion o repartir un SRT. Si las palabras estan ordenadas de 0 hasta la duracion del audio, son tiempos globales: preservarlos exactamente. Un campo scene es una etiqueta del montaje original, NO prueba de que los tiempos sean locales.
Nunca reescalar por escena, repartir por caracteres/silabas ni eliminar pausas para encajar en marcas aproximadas. La tabla de clips dirige las ilustraciones; no sustituye los tiempos de voz. El generador selecciona las palabras que se solapan con cada escena y resta una sola vez su inicio global.
Usar timing.duration para contrastar la duracion; se admite timing.timeBase="global". Si los tiempos se reinician por escena, determinar sus offsets reales antes de convertirlos. Si corresponden a otra version de audio, explicar la discrepancia; no ajustar proporcionalmente de forma silenciosa.
Conservar texto y acentos en UTF-8. Detectar U+FFFD antes de entregar; regenerar desde el texto original, no conservar caracteres sustituidos.
Limitar repeats/stagger/retardos de cada accion a D. Al revisar, comparar duracion del audio, suma de escenas y duracion REAL de la timeline GSAP: las animaciones pueden alargarla aunque el JSON sume bien. No corregir un exceso de duracion con timeScale/duration porque desplazaria las palabras.

## Entradas y decisiones

- Usar el guion y audio suministrados. Conservar idioma y contenido. Quitar marcas bibliograficas como `[1]` de los titulos si no se pronuncian.
- Si falta el audio, solicitarlo: se puede avanzar con el diseno, pero no afirmar sincronizacion. No inventar tiempos de palabras. Usar tiempos proporcionados o transcripcion real.
- Por defecto, vertical 720x1280 y 24 FPS. Elegir libremente el tratamiento visual adecuado dentro de los medios disponibles y del contrato de Motion Studio: SVG, HTML/CSS y Canvas cuando esté admitido. No imponer un estilo editorial, bíblico, infantil o cinematográfico a todos los temas.
- Seguir [references/motion-studio.md](references/motion-studio.md) para el contrato JSON y [references/direccion-visual.md](references/direccion-visual.md) para la calidad visual. El archivo `assets/escena-aprobada.json` es un ejemplo histórico de construcción, no define el estilo ni el nivel de acabado exigido para temas nuevos y tampoco es un ejemplo vigente de subtítulos. Para titulos usar exclusivamente el generador y la referencia actual.

## Flujo

1. Usar la herramienta de audio/transcripcion con tiempos disponible en ChatGPT o el entorno de ejecucion de la conversacion. Medir la duracion del archivo; ffprobe es una opcion si existe. Si hay SRT por palabra, importarlo con scripts/import-word-srt.mjs. Si no hay tiempos, obtenerlos usando la transcripcion disponible o `scripts/transcribe.py`. Ese script requiere Python, faster-whisper, numpy y FFmpeg; acepta un modelo local. No instalar ni descargar dependencias sin comprobar lo disponible. No enviar el audio a terceros sin autorizacion. Si no se puede transcribir, explicar el impedimento y pedir tiempos/transcripcion; no presentar aproximaciones como sincronizacion real.
2. Cotejar la transcripcion con el guion. Corregir errores claros de reconocimiento con contexto. Si el audio omite o agrega contenido sustantivo, seguir lo pronunciado para los titulos y explicar la diferencia. Para dudas relevantes preguntar. No repartir toda la narracion proporcionalmente a su cantidad de letras.
3. Planificar escenas segun acciones y pausas reales. Ajustar la suma al audio, conservar el numero de escenas si el usuario lo solicita. Definir una ficha consistente por personaje y objeto recurrente: apariencia, ropa, escala y manos que sujetan objetos.
4. Aplicar references/direccion-adaptable.md: elegir la dirección y registrar su motivo en creativeBrief; crear una ficha interna de planos y resolver los momentos esenciales antes de extender el montaje. Planificar preparación, acción y resultado con encuadres, poses y objetos pertinentes, no solo zoom y partículas; en temas técnicos usar los kits de motion graphics. Construir ilustraciones originales y acciones semanticas con SVG, HTML/CSS y Canvas admitido en `customScene`. Cada escena tiene que comunicar lo que ocurre en su fragmento. No entregar solo un storyboard, instrucciones para otro modelo, pseudocodigo, bloques vacios ni fotos sustitutas. Variar encuadres y composicion sin perder continuidad.
5. Aplicar por defecto el tratamiento de subtítulos de [references/estilo-referencias.md](references/estilo-referencias.md). Esa continuidad se limita al texto: las ilustraciones, encuadres, ritmo y acciones se eligen con direccion-adaptable.md. Cambiar también el texto si el usuario lo solicita expresamente. Integrar titulos dentro de `customScene`, con palabras reales del audio y aparicion progresiva y enfasis de la palabra activa; marcar box:true solo en cifras y palabras clave. Usar `scripts/add-captions.mjs` sobre un proyecto SIN titulos previos, pasando el archivo de palabras globales. Revisar los cortes de frase; no duplicar con `scene.captions`. El archivo de palabras es de trabajo, no un segundo proyecto para el usuario.
6. Validar con `python scripts/validate-project.py proyecto.json --duration SEGUNDOS` en el entorno de ejecucion disponible. Ejecutar tambien `node scripts/validate-project.mjs proyecto.json --duration SEGUNDOS --words palabras.json`: ademas de sintaxis, compara los subtitulos completos con el generador usando los tiempos reales. La validacion Python sola NO certifica este estilo. Si Node no esta disponible, no afirmar que paso esta comprobacion. Si hay repositorio Motion Studio disponible, usar tambien su `validateProject` actual pasando `--repo RUTA`. Corregir errores, truncamientos, IDs duplicados, duraciones y recursos faltantes. El validador comprueba estructura y sintaxis, no calidad visual ni significado.
7. Cuando haya Motion Studio y navegador, ejecutar scripts/review-project.mjs y pasar --runtime-report revision/report.json al validador Node; su huella debe corresponder al proyecto final. Con otra vista HTML disponible, capturar allí. Inspeccionar imágenes fijas de los momentos esenciales y corregir su dirección según la rúbrica de direccion-adaptable.md, sin exportar video. No aprobar un proyecto solo por superar el validador técnico. Comprobar inicio, mitad y final de acciones y cambios de titulo; buscar manos u objetos que desaparecen, texto tapado y encuadres cortados. Si no se inspecciono visualmente, decirlo brevemente; no afirmar una revision inexistente.

## Audio y entrega

El JSON guarda la composicion, no los bytes del MP3. Si el audio ya esta importado en Motion Studio, preservar su ruta `user-assets/UUID.mp3`. No copiar archivos al ordenador del usuario ni exigir una instalacion local. Si solo se entrega un JSON descargable, dejar `audioAsset` vacio e indicar: importar el JSON y luego seleccionar el mismo audio en Motion Studio. No inventar una ruta de audio que no exista ni incrustar base64 en ese campo.

Entregar un unico archivo `proyecto.json` descargable usando los archivos generados del entorno de ChatGPT, no dos proyectos ni un MP4. Si no hay herramientas para generar archivos, entregar el JSON completo sin truncar y explicar que debe guardarse como proyecto.json; no inventar un enlace de descarga. El guion queda dentro de `project.script` (o `script` en raiz) y en `scene.scriptExcerpt`; no crear otro guion salvo solicitud. Explicar solo numero de escenas, duracion, resultado de validacion y como vincular el audio si corresponde. No decir que el video ya se exporto. Un ZIP de recursos solo es necesario si hay recursos externos autorizados; priorizar todos los visuales en codigo y fuentes de sistema.

