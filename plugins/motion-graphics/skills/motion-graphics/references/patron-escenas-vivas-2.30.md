# Patrón de escenas vivas 2.30 — aprendizaje del mejor diagnóstico aportado por el usuario

Referencia observada: \`assets/referencia-diagnostico-original.json\` (ocho escenas SVG+GSAP, 44 s) y el MP4 proporcionado \`studio-f0b055d3-1203-4c39-973a-8be526fb84f7.mp4\`. En la sesión se inspeccionaron un fotograma por escena y seis momentos de martillo y seis de levantar/caminar. **Este diagnóstico ya estaba empaquetado en el complemento antes de 2.30; la mejora consiste en obligar a transferir su método de autoría, no en añadir otra copia de ese JSON.** No hay garantía de paridad con las siete referencias. Las ocho escenas del diagnóstico tenían \`approved:false\`; el texto de voz usa tiempos sintéticos.

## Lo que el código y el MP4 sí demuestran

| Prueba | Evidencia observada | Técnica recuperable |
|---|---|---|
| \`t1-control-mecanico\` | Martillo inclina/baja; pilote se hunde tras contacto; chispa y sacudida aparecen con el golpe. | GSAP separado por objeto, causa y reacción, no movimiento ornamental. Tres impactos: aproximadamente 1, 2 y 3 s. Bajadas de pilote acumuladas de 26, 52 y 84 px. |
| \`t2-oceano-hud\` | Barco, personajes, agua, sol y etiquetas pertenecen al mismo ambiente; composición vertical sin recorte. | Escenario propio con diferentes escalas espaciales, mar y datos contextualizados. |
| \`t3-personaje-accion\` | Hombre se levanta, camina hacia la puerta y se detiene; cambia pose de piernas y brazos. | Grupos articulados SVG y tiempos de acciones secuenciales (levantarse aprox. 0.7–1.7 s, caminar 1.8–3.8 s local). **No asumir apoyo de pies perfecto**: verificar en MP4. |
| \`t4-interior-religioso\` | Perspectiva del pasillo, vitrales, ataúdes y luz del fondo. | Arquitectura original, profundidad, capas y oclusiones; no tarjeta con icono. |
| \`t5-documento-sello\` | Pergamino, tipografía, madera y sello forman el objeto explicado. | Materiales específicos por objeto, jerarquía visual y detalles estructurales. |
| \`t6-libro-versiculo\` | Libro abierto con páginas, lomo, marco y cita legible. | Geometría de objeto específica, encuadre de lectura y material. |
| \`t7-ojo-detalle\` | Macroscopía de pupila e iris ocupa el encuadre, no una esfera genérica. | Reencuadre extremo del protagonista y formas propias. |
| \`t8-cierre-seguir\` | Cierre editorial diseñado como escena propia. | Tratar una CTA como diseño específico, **solo cuando el usuario pida cierre**. |

Este es un conjunto de ocho **pruebas de capacidad**, no una historia con ocho escenas obligatorias. La duración no autoriza la fórmula «una escena por oración» ni «seis segundos por escena». El número de escenarios depende de cambio de acción, espacio, actor y mecanismo.

## Regla de generación transferible a cualquier tema

Antes de crear el SVG de **cada acontecimiento**, construir esta tabla interna, con valores reales, no objetivos retóricos:

| Campo | Ejemplo martillo | Ejemplo película sellada |
|---|---|---|
| \`actor\` | Martillo articulado | Dos hojas y dos rodillos |
| \`initialState\` | Maza separada del pilote | Láminas separadas |
| \`driver\` | Cabeza de martillo rota y desciende | Rodillos giran hacia dentro |
| \`contact\` | Maza encuentra la cabeza del pilote | Dos hojas se juntan en la mordaza |
| \`reaction\` | Pilote baja, suelo vibra, chispas | Se forma la costura, plástico cambia de forma |
| \`endState\` | Pilote más profundo, maza se recupera | Cámara de aire visible |
| \`selectores reales\` | \`.hammer\`, \`.pile\`, \`.sparks\` | \`.film-a\`, \`.film-b\`, \`.seam\`, \`.air-pocket\` |
| \`prueba visual\` | PNG antes, contacto y después | PNG separado, unido y burbuja inflada |

Un plano no cumple si solo anima una cámara, un título, un círculo o todo el \`<svg>\` y describe en el JSON algo que no ocurre. El cambio debe existir en sus propios elementos y sincronizarse con el narrador. **No basta poner \`direction.actions\` en una ficha**: enlazar cada verbo con selectores presentes y transformaciones/morfologías ejecutadas en \`customScene.script\`. Si una escena no requiere acción material (datos o tipografía), documentar su \`visualMode\` y una justificación; no forzar falsos mecanismos.

### Construcción en 5 capas funcionales (no plantilla estética)

1. **Escenario:** fondo, plano medio y primer plano dibujados específicamente. Si hay profundidad, grupos equivalentes a \`.L-bg\`, \`.L-mid\`, \`.L-fg\` y movimiento diferencial; de lo contrario no añadir parallax decorativo.
2. **Sujetos persistentes:** silueta, proporción, material, color y anclas. En personajes, brazo completo hombro–codo–muñeca, piernas con pies y objeto solidario al agarre.
3. **Mecanismo causal:** piezas móviles independientes; estado inicial/intermedio/final explícitos y contactos dibujados. Para película: hojas, rodillos, línea de fusión, bulbos de aire.
4. **Cámara motivada:** general para ubicar, medio para relación, detalle para prueba. No distribuir tiempos por porcentajes repetidos.
5. **Texto y audio:** titulares/subtítulos se añaden **después** de validar la legibilidad de la acción sin ellos; utilizar tiempos reales de voz, nunca los sintéticos del diagnóstico.

El acabado no se mide por número bruto de \`<path>\`, partículas, zooms o animaciones: requiere materiales oportunos, sombras de contacto, oclusión correcta, perspectiva, jerarquía, continuidad y cambios espaciales coherentes. Pueden usarse SVG/Canvas/HTML según fenómeno; un estilo de datos limpio no exige texturas de madera.

## Puerta de aceptación antes de extender el video

1. Elegir el acontecimiento físicamente más difícil, incluso si no es la primera frase.
2. Diseñar escena específica y declarar selectores de sujeto, objeto, contacto y reacción.
3. Ejecutar \`node scripts/audit-rendered-actions-2.30.mjs proyecto.json\` para detectar escenas **sospechosamente limitadas a cámara/texto**. El reporte es diagnóstico y no prueba realismo.
4. Renderizar y comparar al menos inicio, aproximación, contacto, reacción, estado final y puente con el plano siguiente, **sin subtítulos**.
5. Bloquear etapa 1 si el personaje flota, el objeto atraviesa otro, el mecanismo no produce su efecto, el material no parece el que narra la voz o se rompe continuidad. Resolver antes de generar el resto.

Un proyecto puede pasar todos los validadores y seguir siendo visualmente básico. No homologar el plugin por la riqueza de este archivo de demostración.
