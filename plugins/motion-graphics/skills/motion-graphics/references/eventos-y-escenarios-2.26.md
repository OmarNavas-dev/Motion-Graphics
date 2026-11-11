# Etapa 1 — Escenarios completos y segmentación por acontecimientos

La unidad de montaje NO es la oración: es el acontecimiento visual o cambio de estado. Una oración puede ocupar múltiples planos cuando hay una transformación compleja; varias oraciones pueden compartir un solo escenario cuando permanece el mismo protagonista y la acción avanza. No imponer una duración fija. El inicio y final de cada evento se anclan a la narración real.

## Planificar por eventos antes de decidir el número de escenas

1. Leer el guion completo; extraer todos los acontecimientos que cambian lugar, protagonista, objeto, acción, escala explicativa o estado visible. Guardarlos en composition-plan.json bajo visualEvents con id, action, outcome y sceneIds.
2. Agrupar frases contiguas cuando comparten escenario y causa; dividir un evento cuando hace falta un plano general más un detalle macro o hay una transición de estado físicamente distinta. Un cambio de frase sin cambio visual NO genera por sí solo escena. Una acción continua no se corta arbitrariamente.
3. Para cada acontecimiento crear una ficha de escena antes de dibujar: escenario (profundidad y contexto), protagonista, objetos esenciales, secundarios, relación espacial, estado anterior, acción, cambio y prueba visual. En essentialActors registrar role y selector existente por cada personaje u objeto indispensable; objects recoge también piezas secundarias.
4. Elegir una composición específica: por ejemplo en el taller de 1957, inventores **visibles** con brazos, mesa, rollos, selladora y elementos de fondo. Si el plan dice «dos inventores» deben existir dos figuras separadas en SVG, no dos círculos/rollos en su lugar. Si habla de invernadero, mostrar plantas, estructura, panel e interacción; no sustituir todo por una tarjeta.
5. Antes del estilo, diseñar siluetas reconocibles en escala de grises. Añadir perspectiva, capas de profundidad, oclusión y materiales solo donde sirvan a la explicación. En la composición no colocar automáticamente «panel centrado + fondo azul + signo ?» como sustituto del evento.
6. Para cada escena documentar shotPurpose, visualEvidence.start, visualEvidence.end y placeholderPrimary:false. Si un símbolo es realmente el protagonista (p. ej. un signo que representa una pregunta), justificarlo en el brief y revisar visualmente; si reemplaza un acontecimiento material, rehacerlo.
7. Crear un keyframe real por escena antes de programar movimientos. Revisar sin captions: ¿se reconoce el lugar y el acontecimiento?, ¿aparecen los protagonistas?, ¿el plano comunica algo distinto del anterior? Corregir hasta responder sí con pruebas.
8. Ejecutar audit-specific-composition.mjs; después renderizar fotogramas y cotejarlos con cada ficha. El pase del auditor no autoriza aprobación automática.

## Ejemplo de segmentación flexible

Narración: «En 1957, dos inventores sellaron dos cortinas de ducha. Quedaron burbujas de aire entre las capas».

- Evento A: preparar dos cortinas en un taller; plano abierto para establecer inventores, mesa y material.
- Evento B: presionar y sellar las capas; plano cercano de rodillos y láminas con uniones.
- Evento C: aire encapsulado; macro de cavidades después del sellado.

Tres eventos pueden compartir una oración y media. Si el siguiente texto sigue explicando las burbujas, puede permanecer en el mismo macro. El criterio es el cambio observable, no la puntuación ni un número obligatorio de escenas.

## Evidencia obligatoria

Cada ficha incluye essentialActors (role, selector), shotPurpose, visualEvidence.start/end y placeholderPrimary. visualEvents enlaza los acontecimientos completos a sceneIds. Verificar selectores, consistencia y cobertura con audit-specific-composition.mjs. Revisar el render y anotar segundo, defecto y corrección si faltan elementos o se repite una composición.
