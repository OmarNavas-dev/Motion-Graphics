# Escenas explicativas y continuidad (1.7)

Corrección 1.7.1: el generador conserva el estilo y los tiempos, pero solo anima los tiradores opcionales `.dvj-handle` cuando existen. No silenciar los avisos GSAP ni desactivar la revisión de selectores. Motion Studio 7.2.1 aplica esta compatibilidad también al exportar JSON anteriores.

Leer antes de planificar un video explicativo. Usar los kits existentes de materiales, mecanismos, cámara y rigs; no reemplazarlos por instrucciones vagas ni imponer una apariencia universal.

## Contrato que debe convertirse en imagen

Definir `actors` en el proyecto: id estable, nombre, apariencia, partes y estado inicial. Conservar proporciones, materiales, poses y objetos sujetos entre escenas. Nunca inferir consistencia de rostros a partir de una referencia plana.

Definir `direction` en cada escena:
- `objective`: lo que se debe entender.
- `before` y `after`: mapas actorId → descripción del estado. El estado de salida enlaza con la siguiente entrada; justificar saltos temporales en `transition`.
- `actions`: id, actor, at, duration, description, result y selector CSS local. Separar preparación, contacto/transformación y consecuencia. Caber en D. No describir un efecto que el script no ejecuta.
- `shots`: at, duration, scale (`wide`, `medium`, `close`, `macro`), target y purpose. Elegir foco y cambio de escala según la información; no añadir deriva como sustituto de una acción.
- `holdReason`: justificar pausas largas útiles. No exigir una animación o corte cada dos segundos.
- `materials`, `lighting`, `transition`: especificar el tratamiento pertinente al tema.

`scripts/explainer-kit.mjs` aporta `createExplainer(actors)`. Su método `scene(options,plan)` devuelve un createScene ampliado:
- `scene.action(action,{from,to,ease})` genera el tween y registra su intervalo y consecuencia. Usar from/to explícitos y un selector local como `.payload-move`.
- `scene.pose(action,{jointId:[desde,hasta]})` genera articulaciones locales con rotateJoint. Usar rig/joint/heldObject para conservar colocación y contacto.
- `scene.shot({at,duration,scale,target,purpose,focus:[x,y],k})` ejecuta la cámara y conserva la intención del encuadre.
- `scene.build({title,scriptExcerpt})` produce customScene y direction, validando tiempo y continuidad declarada. Ensamblar con `{...base,actors:production.actors}`.

Las fichas por sí solas no animan nada. Estos ayudantes generan código; el runtime review comprueba su ejecución. Ninguna de esas comprobaciones certifica anatomía, claridad semántica ni mezcla sonora.

## Traducción de las referencias a decisiones transferibles

- Mecanismo: conservar piezas, mostrar la cámara interna, comprimir el volumen y representar la consecuencia. Acercar la cámara al punto de contacto.
- Personaje: torso y extremidades separados; manos y objetos con un anclaje común. Revisar inicio, contacto, pose máxima y recuperación.
- Mundo persistente: barco, sala o máquina reutilizados; actualizar tiempo, recursos y estado. No redibujar cada plano como una historia independiente.
- Curva o genealogía: trazado o población determinista que responde al concepto. No inventar cifras ni convertir una curva cualitativa en datos supuestamente medidos.
- Material: luz y textura coherentes; no imponer acero, brillo o partículas a todos los temas.

## Palabras y transición

Conservar por defecto add-captions.mjs y su estilo aprobado, sin reescribirlo. El ensamblador guarda también las palabras globales como `wordTimings`; no cambia su reloj. `captionMode:embedded` conserva subtítulos existentes.

Solo al solicitar la pista del motor, usar `captionMode:global` en Motion Studio 7.2+: evitar otra pista incrustada. `none` significa que no se añade una pista; no elimina cualquier texto dibujado manualmente en SVG o Canvas. Nunca prometer sincronía de oído porque un archivo de palabras sea válido.

Las escenas personalizadas respetan ahora fade/dip/flash mediante una capa independiente, sin estirar el reloj. Para un raccord de objeto, programar la salida/entrada con el mismo estado y geometría. Un corte motivado es válido; no superponer dos subtítulos durante un crossfade.

## Revisión y entrega

Ejecutar validación estructural, `scripts/check-explainer.mjs proyecto.json`, revisión real en navegador y apertura de los fotogramas. Los avisos de pausa son señales de revisión, no una nota artística. Revisar también semántica, contacto, encuadre y lectura en teléfono. Corregir y volver a capturar el JSON final. Mantener pendientes los controles que el entorno no permita ejecutar, sin atribuirles un aprobado.
