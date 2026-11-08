# Construcción y continuidad visual
La dirección de arte se decide con [direccion-adaptable.md](direccion-adaptable.md), según el tema, la función del guion y las referencias. El hijo pródigo es un ejemplo histórico, no una estética obligatoria ni una plantilla.

## Construccion

Componer entorno, plano medio y primer plano. Usar perspectiva, sombras de contacto, luz coherente, texturas sutiles y detalles utiles al relato. Dibujar silueta legible, rostro, pelo, ropa con pliegues y extremidades completas; elegir complejidad que permita terminar todo el guion. Mantener geometria base de personajes en funciones reutilizables durante la autoria e incrustar su resultado SVG en cada escena. No depender de archivos fuente para reproducir el JSON.

La accion central debe leerse sin titulo: entrega de monedas, viaje, hambre, construccion, comparacion o abrazo segun el relato. Una camara lenta sobre una escena detallada sirve como pausa, pero no reemplaza todas las acciones. Variar planos generales, medios y detalles de objetos.

## Continuidad anatomica y de objetos

- Todas las partes del personaje aparecen juntas desde el primer fotograma visible; no animar la opacidad de manos, dedos, brazos u objetos sostenidos de forma independiente.
- Para mover un brazo usar grupos articulados con origen en el hombro/codo; mano y objeto viajan juntos. Si una articulacion compleja no se puede resolver bien, usar una pose completa estable.
- Mantener manos unidas a munecas, pies al suelo y sombras bajo personajes. Evitar capas que corten cuerpos; disenar oclusiones intencionales.
- Una moneda no cambia de mano entre planos sin una transferencia; anillos y sandalias no aparecen por un destello arbitrario. Representar cambios narrativos con acciones o cortes coherentes.
- Revisar transformaciones SVG anidadas: envolver un grupo con transform fijo antes de animarlo evita que GSAP reemplace su posicion original.


## Texto y revisión
Aplicar solo la sección de subtítulos de [estilo-referencias.md](estilo-referencias.md) como tratamiento habitual del texto. Para personajes, planos, movimiento y acabado, tiene prioridad direccion-adaptable.md. Validar el JSON y revisar imágenes son comprobaciones distintas; ninguna sustituye a la otra.

