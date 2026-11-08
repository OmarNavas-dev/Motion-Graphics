# Producción narrativa con referencias visuales

`assets/referencia-diagnostico-original.json` es una muestra de variedad de recursos, **no una plantilla para copiar completa**. Su video muestra ocho mecanismos: golpe mecánico, océano con información, personaje caminando, interior religioso con perspectiva, documento sellado, Biblia con pasaje destacado, detalle ocular y tarjeta de cierre. Son evidencia de composiciones que funcionan por función narrativa, no garantía de calidad para otro tema.

## Contrato de preproducción, por plano

Antes de programar, anotar: propósito de la acción; espacio y eje de cámara; personajes y objetos persistentes; cuadro inicial/final; apoyo/contacto; capas y oclusiones; dirección de luz; cambio visible durante el plano; transición al plano siguiente; tiempo de voz real. La escena debe contestar «¿qué cambia visualmente?»; una ilustración inmóvil con zoom no basta si el guion describe una acción.

Crear una ficha visual persistente para cada personaje, ambiente y objeto. Mantener identificadores y proporciones. Definir un plano maestro del espacio para que las entradas y salidas tengan sentido. Hacer prueba representativa primero con poses extremas y contactos, comprobarla, y luego extender el metraje sin cambiar arbitrariamente el estilo.

## Componentes disponibles

Importar de `scripts/kits/index.mjs` durante autoría; los SVG y scripts quedan incrustados en el JSON.

| Función | API | Variantes relevantes |
| --- | --- | --- |
| Horizonte y agua | `ocean(s,{horizon,day,night,sea,at,duration})` | Mañana, atardecer o noche mediante paleta; `duration` oscurece gradualmente |
| Nave con perspectiva | `sanctuary(s,{vanishX,vanishY,floorY,arches})` | Punto de fuga, profundidad, velas |
| Documento | `sealedDocument(s,{x,y,w,h,heading,lines,seal,at})` | Título, líneas de apoyo, aparición del sello |
| Escritura | `scriptureBook(s,{x,y,w,h,chapter,verse,excerpt,at})` | Libro abierto con énfasis localizado |
| Etiqueta narrativa | `storyPlate(s,{label,value,x,y,w,accent,at})` | Año, edad, medida o capítulo si aporta información |
| Cierre explícito | `channelEndCard(s,{channel,cta,teaser,at})` | Nombre propio del canal y botón visual; NO un botón interactivo |

Los textos son datos reales del guion; no inventar cronologías ni versículos. La tarjeta de canal sólo se incorpora por petición explícita y nunca como firma recurrente. Las placas tienen propósito informativo, no decoración automática. La ausencia de subtítulos solicitada por el usuario sigue prevaleciendo.

## Composición, rendimiento y validación

1. Separar fondo, medios, personajes/objetos y HUD. Colocar primero la geometría y los apoyos, luego los movimientos; no intentar corregir una pose falsa añadiendo brillo.
2. Elige una dirección visual a partir de siluetas, gama tonal, material y luz de referencias autorizadas. Adaptar sin replicar identidad de otro creador.
3. Animar una acción con preparación, ejecución, contacto y recuperación. Para un paso, comprobar que el pie de apoyo no se desplace mientras recibe peso y que el piso esté a la misma altura entre cortes.
4. Cada selector `S+' .clase'` debe existir en el `customScene.html` generado. Nunca contar las animaciones como prueba de movimiento real; revisar fotogramas en varios instantes y el video completo cuando sea posible.
5. Ejecutar `node --test tests/story-kit.test.mjs`, los validadores de proyecto, y `review-project.mjs` contra Motion Studio cuando esté disponible. Distinguir pruebas estáticas, prueba de reproducción y percepción visual. Que pase un validador no significa que una escena sea buena.
6. Imágenes proporcionadas por el usuario: no incrustar `file://`, URLs ficticias, rutas locales ni enlaces remotos no autorizados en `customScene`. Consultar contrato de `imageAsset`/recurso real en Motion Studio y verificar importación. Si no está confirmado, pedir que el usuario vincule la imagen después; no prometer el zoom sobre ella dentro del JSON.

## Guiones cortos de curiosidad o historia

Una estructura posible, **no una obligación universal**: apertura con pregunta o hecho; contexto visual; detalle/objeto; ancla verificable (número, año o cita); cambio o giro; cierre. Ajustar duración al audio, contenido y tensión de la historia. No insertar un «PARTE 2» ni un llamado a seguir por defecto.
