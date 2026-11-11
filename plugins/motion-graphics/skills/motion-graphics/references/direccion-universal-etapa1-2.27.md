# Etapa 1 universal: decidir qué representar según el tema

**Continuidad 2.28:** la selección de visualMode no autoriza redibujar un activo recurrente desde cero. Leer [continuidad-identidad-2.28.md](continuidad-identidad-2.28.md) y preparar continuity-plan.json para mantener identidad, modelo, materiales y proporciones entre escenas.

No hay una plantilla única válida para cualquier tema. La consistencia de marca (colores, tipografía, luz) NO exige repetir idéntico escenario y encuadre. El generador debe razonar primero sobre el fenómeno, después elegir lenguaje visual y finalmente escribir geometría específica.

## Decisión de modo visual por acontecimiento

| Modo | Cuándo elegirlo | Objeto esencial y prueba sin texto |
|---|---|---|
| narrative | Personas, relatos, sucesos, Biblia, historia | Personajes y escenario reconocibles; acción y consecuencia |
| mechanism | Máquinas, ingeniería, fabricación, procesos físicos | Piezas, relaciones y estados de funcionamiento |
| scientific-diagram | Biología, química, astronomía, anatomía | Entidades, relaciones espaciales, escalas y evolución |
| data-viz | Cifras, tendencias, comparaciones verificadas | Ejes/categorías y relación cuantitativa real |
| symbolic | Ideas abstractas, decisiones, paradojas | Metáfora visual justificada por el concepto |
| typographic | Lenguaje y texto como protagonista | Tipografía transmite una transformación semántica |
| documentary | Documentos, fechas, mapas, evidencias históricas | Fuentes representadas con contexto, sin inventar datos |

Un video puede combinar modos según su trama. No se deben imponer personas en un gráfico de datos ni una máquina en una parábola moral; tampoco se deben reemplazar inventores reales por un signo de interrogación. En modos abstractos un símbolo puede ser apropiado, pero debe tener symbolicJustification y una transformación visual informativa.

## Plan por acontecimientos, no por oraciones

Una oración puede mostrar varios estados con planos diferentes; varias oraciones pueden ocupar el mismo escenario si permanece el mismo fenómeno. Cortar solamente cuando cambie la acción, lugar, escala, sujeto o necesidad informativa. Respeta tiempo y pausas de la voz, no establezcas cantidades fijas.

## Ficha universal de composición

En composition-plan.json (externo al JSON de Motion Studio), cada escena debe registrar:

- visualMode: uno de los siete modos.
- setting, subject, cause, physicalAction, visibleResult, visualMotif, nextContinuity.
- layoutIntent: razón por la cual la composición tiene esa jerarquía espacial.
- visualQuestion: lo que se entiende sin leer texto.
- objects: selector y nombre de elementos de apoyo.
- essentialElements: role o concept y selector de cada elemento indispensable. essentialActors se admite por compatibilidad.
- states y visualEvidence.start/end para contraste antes/después.
- shotPurpose, placeholderPrimary y, si corresponde, symbolicJustification.
- continuityReason cuando se repite intencionalmente el mismo diseño en escenas contiguas.

El plan contiene visualEvents con id, action, outcome, sceneIds. No aprobar fichas genéricas con frases vacías. El auditor comprueba trazabilidad y presencia estructural; una persona debe inspeccionar los fotogramas para verificar calidad, claridad, proporciones y exactitud.

## Ciclo de corrección antes de aprobar

1. Diseñar un fotograma clave de cada escena con personajes/objetos/diagrama correctos; revisar contra la pregunta visual.
2. Implementar la composición, validar que essentialElements y objects existan y que el lenguaje visual no sea intercambiable con otra escena.
3. Ejecutar audit-specific-composition.mjs con composition-plan.json y solucionar errores.
4. Renderizar y evaluar los momentos inicial, crítico y final sin subtítulos, anotando problemas específicos por segundo.
5. Corregir geometría o contenido y repetir. Si no hay render inspeccionado, dejar etapa 1 en pending.

La prueba técnica reproducible es: node scripts/test-stage1-generalization.mjs. Abarca los siete modos y tres regresiones (elemento esencial ausente, símbolo injustificado, diseño repetido). No acredita resultados visuales profesionales ni compatibilidad universal de Motion Studio.
