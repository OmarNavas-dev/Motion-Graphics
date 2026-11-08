# Motion Studio 7.4.0 y Motion Graphics 1.9.0

El sistema incorpora procedimientos de animacion del JSON de diagnostico de ocho escenas aportado por el usuario, sin convertir sus temas o su apariencia en una plantilla universal.

- Secuencias de movimiento con estados explicitos y fases de duracion independiente. Sirven para articulaciones, objetos, documentos, recortes, miradas, interfaces y otros sujetos. No obligan a usar todas las fases.
- El complemento genera codigo GSAP y puntos de control desde la misma secuencia. Motion Studio los conserva al importar y comprueba sus estados reales al avanzar y retroceder durante la revision previa al render.
- Ambos revisores comparten el observador y el contrato de movimiento. Las comprobaciones nuevas son opcionales en proyectos anteriores; no se altera su codigo.
- Camara creada solo cuando se solicita un movimiento. Un plano fijo puede declarar su foco y proposito sin insertar zoom ni paralaje.
- Eliminadas cuotas de efectos, texturas, etiquetas y tweens como supuesta medida de calidad. Se permite dibujo SVG mediante atributos y Canvas determinista desde estado GSAP.
- Presupuestos de autor y motor leidos de la misma fuente. Retiradas instrucciones antiguas que imponian limites menores y prohibian todo onUpdate.
- La camara lenta no dibuja una etiqueta de produccion por defecto. Se conserva la regla de no incluir pies editoriales, firmas o numeracion de escenas.

La biblioteca adulta existente es una opcion de ilustracion; los personajes y las formas se disenan segun cada tema. Los ejemplos transversales son regresiones internas, no un repertorio cerrado de escenas ni una garantia de acabado artistico.

Actualizar ambas herramientas y reiniciar Motion Studio para cargar la nueva revision del motor. Los limites de seguridad, la conservacion del audio y los tiempos de subtitulos no cambian. El JSON de diagnostico original se conserva como referencia.
