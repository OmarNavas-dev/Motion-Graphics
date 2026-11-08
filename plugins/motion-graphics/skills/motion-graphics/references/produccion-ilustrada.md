# Producción ilustrada y comparación con referencias

## Alcance y selección
Crear la geometría y coreografía que requiere la historia, con SVG, HTML/CSS o Canvas determinista. Los componentes son ayudas de autoría; se incrustan sus resultados, nunca sus imports. El JSON conserva el contrato de Motion Studio. Ninguna familia cubre todas las anatomías, estilos ni temas. Un acabado equivalente a una referencia se decide con imágenes y reproducción, no por el nombre de un kit.

Examinar referencias del usuario antes de dibujar. Para nuevas referencias ejecutar:

```
python scripts/reference-analysis.py referencia.mp4 --out referencia-nueva --interval 4 --detail 10:13:4
```

Requiere FFmpeg, ffprobe y Pillow disponibles. Abrir la hoja y los fotogramas. El programa mide tiempos y extrae imágenes; el modelo completa observaciones, inferencias, planos, materiales y trayectorias. No infiere software de autoría ni inventa una escucha. No adjuntar los videos originales ni copiar identidad del canal al complemento o a otro proyecto.

## Dirección de arte y recursos
Definir una biblia visual breve: siluetas, proporciones, rostro, perspectiva, colores, materiales, luz, sombras y cámara. Resolver una imagen final representativa ANTES de animar. Persistir personajes/objetos mediante una única definición de geometría y configuración. Redibujar el recurso si su forma no corresponde a la historia; más efectos no arreglan anatomía.

Transferir procedimientos de las tres referencias recientes, sin convertirlas en tres plantillas universales:
- Cartoon científico: conservar personaje, cama y ambiente; pasar de una instancia a varias para explicar una muestra; usar curva y anotación cuando la narración trata del tiempo. Mantener los objetos en contacto bajo la misma transformación de cámara.
- Criatura naturalista: resolver primero segmentación, silueta y material; después patas, antenas, sombra y encuadre. El escenario continúa mientras cambia la explicación. Una imagen plana trasladada no sustituye la actuación de apéndices.
- Diagrama luminoso: expresar relaciones y cantidad mediante instancias, conexiones y cambios de escala. Controlar brillo para mantener siluetas y separar profundidad de resplandor. No atribuir 3D, SVG o una herramienta concreta al original solo por su apariencia.

Evaluar cada proyecto por su propósito, no por coincidencia de estos objetos. En una historia diferente dibujar recursos diferentes y conservar los mismos principios de acción, continuidad y revisión.

Importar `scripts/kits/index.mjs`. Crear escenas con `createScene({id,duration})` o `createExplainer().scene()`. Dimensiones lógicas 720×1280; exportación 1080p y 30 FPS como objetivo habitual, preservando los ajustes de proyectos existentes y preferencias explícitas.

Recursos nuevos:

- `bedroom(scene, options)`, `bed(scene,{id,x,y,w,h,blanket})`, `tiledRoom(scene,{tile,tone,night,floorY})`, `book(scene,{id,x,y,w,h})`, `contactShadow(scene,{x,y,rx,ry,opacity})`: geometría configurable y materiales. El libro es una ilustración abierta; para pasar una página construir la hoja móvil y usar la bisagra del kit de contacto. No presentar una imagen fija como apertura animada.
- `puppet(scene,{id,x,y,scale,config,poses})`: cuerpo completo con extremidades de dos segmentos y nodos estables. Colores `skin,shirt,pants,hair`; longitudes `upperArm,forearm,thigh,shin`. Posiciones locales de muñecas y pies; corregir objetivos inalcanzables. Pose: `at,hip:[x,y],rotation,bodyAngle,headTilt,leftHand,rightHand,leftFoot,rightFoot,blink,gaze,mouth`. `blink` y `mouth` en 0..1. Cadera y extremidades se mueven en el mismo espacio. `standingPose(at)`, `seatedPose(at)` y `sleepingPose(at)` son puntos iniciales, no sustituyen diseño específico.
- `walkPoses({duration,stride,travel,cycles})`: genera poses densas con apoyos fijos en coordenadas de mundo y elevación del pie libre, alternando pasos a velocidad de avance constante. `risePoses({duration,seatDrop,groundY})` genera levantarse con ambos pies plantados; dibujar y alinear la silla. `puppetPose(config,poses,t)` usa `config.interpolation='continuous'` (Hermite), `'linear'` o `'smooth'` (estilo antiguo con frenado en cada clave). Los presets no solucionan marcha sobre superficies arbitrarias, contacto con manos, giros 3D ni actuación compleja. El recorrido debe caber en zancadas y articulaciones; probar apoyos y transiciones. La familia editorial adulta anterior sigue disponible para sus planos y agarres.
- `createPuppetCast([{id,name,initialState,...config}])`: registra un diseño corporal una vez, devuelve `actors` y `place(scene,id,options)`. Reutilizar el reparto entre planos. Los controles no especificados en una pose conservan su valor anterior; un control desconocido se rechaza en vez de aparentar que funciona.
- `segmentedCreature(scene,{id,x,y,scale,rotation,travel:[dx,dy],pace})`: criatura plateada segmentada, seis patas, antenas curvas y tres filamentos, con apéndices separados. Es una familia naturalista concreta; diseñar otra anatomía si el tema lo exige. No usarla como plantilla universal de animal.

## Diagramas y densidad
- `lineChart(scene,{id,x,y,w,h,data,at,duration,labels,unit,color})`: pares [x,y] con X estrictamente creciente. Revelación por eje horizontal, marcador sobre la misma curva. No inventar datos de investigación; datos ilustrativos deben identificarse como tales.
- `radialPopulation(scene,{id,rings,branching,radius,reveal,zoomFrom,zoomTo,color})`: árbol esquemático calculado con Canvas; devuelve `nodes,count`. La estructura representa un modelo de ramificación, no una genealogía histórica demostrada. Sustituir datos cuando se represente una genealogía real. Límite 12000 figuras por llamada.
- `dna(scene,{id,x,y,w,h,turns,amplitude,speed,color})`: hélice 2.5D con segmentos ordenados por profundidad. No es geometría 3D ni certifica exactitud molecular.
- `symbolInstances(scene,{id,markup,instances,layer})`: registra geometría una vez en defs y crea use con x,y,scale,rotation,opacity. Evitar duplicar un personaje completo cientos de veces.
- `procedural(scene,{selector,draw,config,at,duration,from,to})`: incrusta una función autosuficiente `draw(root,time,config)` y la controla desde GSAP. Reconstruir el estado desde t; no acumular transformaciones, velocidad, partículas o azar entre callbacks. Configuración solo JSON. Usar nodos estables o Canvas en escenas densas. No depender de imports, closures, Date.now, temporizadores, requestAnimationFrame o Math.random en el JSON final. El sanitizador del motor sigue siendo obligatorio.

Estos recursos no habilitan Three.js, WebGL ni Remotion en Motion Studio. Si una historia requiere 3D real, implementar y verificar un adaptador del motor en una tarea autorizada aparte; mientras tanto resolver perspectiva y proyección de forma explícita con los medios existentes y explicar la limitación concreta.

## Anclar acción a voz sin tocar el contrato

```
import {createTimingAnchors} from './scripts/timing-anchors.mjs';
const voice=createTimingAnchors(palabras,{sceneStart:12,sceneDuration:6});
const event=voice.span(
 {phrase:'antes de despertar',edge:'start'},
 {phrase:'la hormona',edge:'end',occurrence:1}
);
// Pasar event.at y event.duration a scene.action/sequence o al kit.
```

`index` identifica una palabra desde 0; `phrase` busca palabras normalizadas; `occurrence` empieza en 1 y es obligatorio para frases repetidas. `offset` suma segundos medidos, nunca reescala el audio. `edge` puede ser start/end/center. El helper rechaza anclajes fuera de escena o ambiguos. Emplear únicamente palabras reales de la versión de audio entregada. No generar ni estimar palabras para hacer pasar la prueba.

Guardar los anclajes en el módulo de autoría; el JSON final recibe tiempos numéricos compatibles. Los subtítulos siguen usando exactamente `add-captions.mjs`, con sus datos globales originales. Un cambio de voz exige resolver anclajes y regenerar subtítulos de nuevo.

## Revisión por evidencia
1. Ejecutar validadores técnico y de subtítulos del JSON final. Resolver errores, no silenciar comprobaciones.
2. Con Motion Studio usar review-project.mjs y añadir `--dense-fps 6` para secuencias cortas críticas. La estabilidad se comprueba ahora para cada muestra; el exceso temporal es error. La comparación registra diferencias de píxeles y admite como máximo un nivel de redondeo de color de 8 bits por canal; no tolera cambios mayores ni equivale a aprobación artística. Los actores nuevos deben llevar `data-motion-actor="id"` para poder observar su encuadre, además de su geometría.
3. Sin ese repositorio, usar `node scripts/review-standalone.mjs proyecto.json --gsap ruta/gsap.min.js --out revision-nueva --browser ejecutable --dense-fps 6`. Requiere Playwright disponible; `--modules` permite indicar su node_modules. `--single-process` y `--browser-args archivo.json` permiten adaptar el navegador a un entorno de ejecución comprobado; no descargarlo sin comprobar primero qué existe. Este fallback usa DOM y GSAP reales, compara saltos temporales y captura secuencias, pero no certifica exportación Motion Studio, recursos externos ni audio. No confundir sus informes con una prueba end-to-end.
4. Abrir imágenes al inicio, contacto, intermedios y resultado. Examinar también las muestras consecutivas y reproducción continua disponible. Las capturas solas no certifican ritmo. Revisar dibujo, expresión, sombras, antenas, pies, oclusión, foco de cámara y legibilidad a tamaño de teléfono.
5. Para emparejar con referencias usar `compare-frames.py pares.json --out comparacion-nueva`. El archivo contiene `pairs:[{time,reference,render}]`, con rutas de imágenes. La herramienta crea parejas y diferencias; el error de píxeles no es una nota estética. Registrar diferencias concretas y corregir las de mayor impacto. Justificar las diferencias deliberadas de un video original.
6. Mantener tres estados distintos: estructura válida, ejecución estable y revisión artística/voz. Nunca marcar aprobado por contar tweens o efectos, ni por imitar una paleta. Conservar el hash del JSON final en evidencia de trabajo y volver a capturar tras modificarlo.

## Ejercicios de integración
`examples/reference-families.mjs` contiene estudios originales silenciosos: dormitorio con despertar, curva, criatura, población, ADN y marcha. Exporta `studyProject` y escenas completas para ensamblaje. Son demostraciones de recursos y ejecución; sus tiempos no son narración real y no reemplazan el diseño del proyecto solicitado. Usar también las escenas históricas de contacto y mecanismos cuando procedan.

Para temas nuevos, combinar las capacidades pertinentes y crear geometría adicional. No reducir cualquier guion a cama/insecto/ADN por disponer de estos ejemplos. Completar siempre todas las escenas solicitadas y entregar un único JSON, sin pies editoriales ni identidad de canales ajenos.
