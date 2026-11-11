# Dirección cinematográfica 2.29: escenas que hacen avanzar la historia

El objetivo es reproducir la **gramática visual** observada en siete referencias verticales de curiosidades, historia y relatos, no copiar sus temas, personajes o colores. La comparación del proyecto de plástico de burbujas reveló 13 escenas con un reparto de cámara idéntico 58/42, acciones descritas con el relleno «cambio verificable en...», subtítulos de 32,4 px en 720 y protagonistas parcialmente cortados. Un SVG detallado y una auditoría estructural correcta no garantizan un video convincente.

## Tres observaciones antes de crear código

1. **LOOK:** identificar en las referencias la profundidad, siluetas, escala, oclusiones, iluminación, materiales, textura, composición y tamaño legible del texto. Separar lo observado de lo inferido; no convertir siete estilos distintos en una única plantilla.
2. **MOVES:** identificar en segundos concretos la acción del sujeto, los objetos que reaccionan, deformaciones, articulaciones, movimiento de cámara y resultado. Un zoom no sustituye una acción.
3. **CAUSALIDAD:** por acontecimiento responder dónde ocurre, quién/qué lo inicia, qué interactúa, qué se transforma y cómo se ve la consecuencia sin subtítulos. Elegir visualMode según el tema: narrative, mechanism, scientific-diagram, data-viz, symbolic, typographic o documentary.

No crear una escena por oración. Una frase puede necesitar dos planos; varias frases pueden compartir escenario. Un símbolo es correcto en una idea abstracta, pero no debe sustituir a un inventor, vehículo, herramienta o proceso físico.

## Construcción de cada escenario

- Dibujar primero el **fotograma de máxima legibilidad**: entorno concreto, sujetos esenciales reconocibles, objetos de apoyo y relaciones espaciales. Profundidad 2.5D, materiales y luz cuando el contenido lo requiera; no obligar realismo en gráficos de datos.
- Coreografiar **causa -> contacto -> reacción -> evidencia**. Por ejemplo, las dos láminas llegan a los rodillos, se aproximan, se sellan y el aire queda atrapado. Desplazar una ilustración terminada o atenuar su opacidad no demuestra ese proceso.
- Determinar cámara por función narrativa: general para situar, medio para relacionar, detalle para demostrar el cambio. No aplicar por defecto el mismo porcentaje de duración ni el mismo zoom a cada escena.
- Mantener silueta, proporciones, materiales y estado de los activos persistentes; enlazar planos mediante acción, posición, forma o continuidad de escenario cuando aporte claridad.
- Revisar encuadres al inicio, durante el contacto, en el resultado y tras el movimiento de cámara. Rostro, mano, herramienta o máquina solo salen del cuadro cuando es intencional.
- Revisar subtítulos en tamaño de teléfono. En 720×1280 puede funcionar un punto de partida de 48–64 px para narración vertical, pero ajustar a la cantidad de palabras y el estilo; no es una cuota universal.

## Piloto obligatorio cuando haya render

Antes de extender un montaje largo, elegir uno o más acontecimientos difíciles representativos del proyecto (por ejemplo personajes interactuando y un mecanismo físico). Modelar, animar y capturar:

1. Fotogramas reales **sin subtítulos** al inicio, antes del contacto, durante el cambio y al final, más puntos intermedios y búsqueda hacia atrás.
2. Comparación con los mecanismos LOOK/MOVES aplicables de las referencias, no comparación semántica de píxeles entre temas distintos.
3. Lista de defectos por segundo: ausencia de actor, recorte, acción no visible, deformación incorrecta, escala inverosímil, texto pequeño o transición sin continuidad.
4. Reparación y nueva captura. No multiplicar el problema en todas las escenas hasta corregir el piloto.

Si no es posible renderizar, dejar la aprobación artística pendiente. No fabricar capturas, revisiones ni valoraciones humanas; se puede entregar el JSON técnicamente validado, indicando con precisión que no se ha demostrado semejanza.

## Control técnico complementario

Ejecutar:

    node scripts/test-stage1-cinematic.mjs
    node scripts/audit-cinematic-composition.mjs proyecto.json

El auditor detecta texto de acción intercambiable y patrones de cámara clonados, y advierte de subtítulos posiblemente pequeños o acciones que terminan demasiado pronto. Sus errores bloquean la etapa 1 a través del gate secuencial y de audit-art-direction.mjs. Las advertencias requieren revisión, no añadir justificaciones ficticias. Un plano fijo o repetido puede ser correcto si hay motivo narrativo documentado y verificado en el render.

**Rechazar visualmente aunque el código pase:** protagonista ausente o cortado sin propósito; escena que solo se entiende por su título; máquina que no muestra causa y reacción; personaje que solo se traslada como bloque; decenas de escenas intercambiables; material que cambia de diseño sin explicación; subtítulos ilegibles en móvil. El validador automático no detecta por sí solo estos fallos: necesitan inspección de fotogramas.
