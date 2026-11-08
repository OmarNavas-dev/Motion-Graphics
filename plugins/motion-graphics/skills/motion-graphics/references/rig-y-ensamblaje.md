# Integración del paquete escenas-customscene

Se adaptaron los principios útiles del paquete aportado por el usuario: dibujo reutilizable, colocación fija separada del movimiento, articulaciones, objeto sujeto a la mano, selectores de escena y ensamblaje. No se incorporaron las reglas de túnicas/presets, cámara permanente, subtítulos desactivados o partículas obligatorias.

## Biblioteca neutral: scripts/rig-kit.mjs
- rig(id,{x,y,scale,parts}): envoltura fija marcada data-dvj-placement y capas id-move, id-scale e id-sway. Dibujar las partes con el estilo elegido para el guion.
- joint(id,{x,y,rest,shape,held}): pivote local de hombro/codo/cuello/bisagra. La pose de reposo está en la envoltura fija. La capa animada tiene coordenadas locales.
- heldObject(id,{x,y,angle,shape}): anclaje al extremo del miembro. Incluirlo DENTRO de la articulación que lo sostiene; no dibujarlo aparte ni cambiar su opacidad aisladamente.
- rotateJoint(id,{from,to,at,duration,ease}): produce código GSAP que anima el atributo SVG rotate alrededor de (0,0), sin depender de la caja del dibujo o del objeto sujeto. Mantiene separados el giro y el translate de colocación.
- repeatBudget({at,duration,sceneDuration,stagger,count,repeatDelay,maxRepeat}): calcula repeticiones que caben. Considera el tramo escalonado completo y las pausas de repetición. Rechaza un primer ciclo demasiado largo. El repeat dentro del objeto stagger tiene semántica diferente y no está cubierto por este helper.
- sceneSelectors('.a,.b'): expresión JS con S prefijado en cada selector. Evita animar otros clips.
- seededRandom(seed): azar reproducible SOLO durante autoría; incrustar el resultado en el JSON, no depender de módulos en reproducción.

El kit no obliga a usar personajes prefabricados. Anatomía, proporción, ropa, paleta y encuadre pertenecen a la dirección del proyecto. No aplicar transformOrigin:'50% 50%' a todo: los pivotes de articulación son explícitos y la cámara tiene su propia gramática.

## Ejemplo ejecutable
examples/rig-authoring.mjs es un módulo de una escena de ejercicio, con dos articulaciones y un objeto que acompaña a la mano. Muestra arquitectura y pivotes, no el acabado artístico esperado para un relato. Importa el kit durante autoría y exporta registros customScene completos.
Para compilar con la configuración de un proyecto existente:

node scripts/assemble-scenes.mjs base.json examples/rig-authoring.mjs nuevo.json --repo MOTION_STUDIO

Para un relato, proporcionar TODAS las escenas creadas para su guion y agregar --words palabras.json. El ejemplo no es un reemplazo de las escenas existentes.

## Ensamblaje
Cada registro lleva id, duration, scriptExcerpt y customScene {html,css,script}. El ensamblador conserva ajustes, audio, fuentes y showText del proyecto base; solo reemplaza las escenas por las de autoría y marca approved:false.
No asigna fragmentos por saltos de línea ni inventa el texto que falta. No agrega cámara, resplandores, partículas ni movimiento de fondo por defecto. No cambia los tiempos de voz.
Con --words usa el generador de subtítulos actual. Después ejecutar validate-project.mjs con el mismo archivo de palabras y review-project.mjs. La compilación sola no certifica sincronía ni calidad visual.
El módulo .mjs de autoría es código ejecutable: inspeccionarlo antes de importarlo. No ejecutar módulos desconocidos como si fueran datos JSON. El JSON final sí debe pasar el validador antes de reproducirse.

## Verificación ampliada
review-project.mjs usa DOM y GSAP reales para que también funcionen los subtítulos basados en document.querySelector. Comprueba IDs repetidos y registra selectores GSAP inexistentes como errores.
El informe motionAudit mide duración natural de las timelines de escena frente al intervalo asignado, incluyendo repeats y stagger. Señala colas que el motor pudiera recortar. También detecta movimiento aplicado a una envoltura marcada como colocación fija.
Los fotogramas guardan coordenadas rigAnchors para examinar pivotes y anclajes. Es evidencia geométrica parcial, no un detector universal de anatomía o contacto físico. Continuar la revisión visual del relato completo.

## Pruebas realizadas
Se comprobó conservación de audio, showText y subtítulos al ensamblar, rechazo de datos incompletos y cálculo de ciclos que caben. En un navegador real se capturaron siete momentos: el pivote del hombro permaneció fijo y la distancia del objeto respecto al codo conservó los 110 puntos de su anclaje.
Una fixture con movimiento de 8,2 s en una escena de 4 s produjo un aviso de exceso de 4,2 s. Otra fixture con un selector inexistente produjo runtimePassed:false. Estos son ejercicios técnicos; no equivalen a un video completo aprobado.

