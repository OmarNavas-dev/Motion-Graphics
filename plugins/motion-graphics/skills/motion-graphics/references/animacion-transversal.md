# Animacion elaborada sin una plantilla de tema

El proyecto de diagnostico de ocho escenas aportado por el usuario es una referencia de procedimientos. Su codigo original, sin reescribirlo, esta en `assets/referencia-diagnostico-original.json`. Se estudio completo y se ejecuto en Motion Studio. Antes de construir una accion nueva, estudiar el procedimiento pertinente de ese archivo, sin copiar su tema o apariencia. Sus tiempos sinteticos no son sincronizacion con audio real. No trasladar datos, nombres, textos ficticios o placeholders como "TU CANAL" a otras historias.

| Procedimiento observado | Lo que se transfiere a cualquier tema |
|---|---|
| Martillo, pilote e impacto | Preparacion, golpe, desplazamiento de la pieza y reaccion coordinados; pivote y apoyo definidos. |
| Barco, oleaje y atardecer | Un escenario persiste mientras cambian condiciones; velocidades y profundidades distintas. |
| Personaje que se levanta y camina | Colocacion, locomocion, torso y articulaciones en grupos separados; los gestos responden a la accion. |
| Interior y detalle | La camara acerca una informacion concreta; la luz y la oclusion sostienen profundidad. |
| Pluma, recorte de texto y sello | Un objeto y una revelacion comparten tiempos; el estado final permanece visible. |
| Hoja de libro y resaltado | Bisagra, cambio de cara y sombra anclados al mismo objeto; el enfasis llega despues. |
| Ojo y detalle interior | Recorte anatomico, pupila, reflejos y acercamiento coordinados; no ampliar todo sin revelar nada. |
| Boton y respuesta al gesto | Una interfaz muestra una causa y su respuesta; usarla solo cuando la historia la necesite. |

## Del significado al movimiento

1. Definir que necesita ver el espectador. Dibujar el estado inicial y el resultado antes de agregar ambiente.
2. Elegir una silueta, escala, punto de vista, luz y lenguaje de ilustracion adecuados al tema. El kit adulto es opcional; crear otra anatomia, criatura, maquina, diagrama o tipografia cuando corresponda.
3. Separar transformaciones: colocacion fija -> movimiento -> articulacion -> geometria. Un objeto sujeto vive bajo la mano mientras esta lo sostiene; al soltarlo se conserva su posicion global. Camara y subtitulos usan grupos distintos.
4. Coordinar preparacion, accion, contacto/revelacion, reaccion y asentamiento solo donde aporten. No asignar siempre los mismos porcentajes, elasticidad, stagger ni zoom. Una maquina pesada, una mirada y una cifra requieren ritmos diferentes.
5. El movimiento secundario responde al principal y termina o se mantiene con motivo. No agregar particulas, destellos, temblor o etiquetas por cuota. El plano fijo y el silencio visual son recursos validos.
6. Revisar principio, puntos de contacto, intermedios y resultado. Alternar ejecucion continua con saltos hacia adelante y atras. Corregir la accion o la geometria, no esconder defectos con efectos.

## Secuencias con el mismo estado en las dos herramientas

`createExplainer()` acepta actores de cualquier clase; no genera su geometria. `scene.sequence()` compila fases a GSAP normal y conserva puntos de control observables en `direction.actions`. Motion Studio 7.4 y el revisor del complemento verifican esos puntos con el mismo modulo compartido, al avanzar y retroceder.

```js
scene.sequence({id:'abrir',actor:'objeto',selector:'.pieza',at:.5,
  description:'La pieza se abre sobre su bisagra.',
  result:'El interior queda visible.'}, {
  from:{rotation:0,svgOrigin:'0 0'},
  beats:[
    {phase:'anticipation',duration:.2,to:{rotation:4},ease:'power2.out'},
    {phase:'action',duration:.8,to:{rotation:-75},ease:'power2.inOut'},
    {phase:'settle',duration:.25,to:{rotation:-70},ease:'sine.out'},
    {phase:'hold',duration:.5}
  ]
});
```

`from` contiene todas las propiedades iniciales usadas; cada `to` cambia solo lo necesario. Las duraciones se suman sin estirarlas al audio. Se admiten traslaciones, rotaciones, escala, opacidad y atributos SVG (recortes, dimensiones y trazados compatibles). Los pivotes fijos se declaran en `from`; los cambios de apoyo necesitan grupos adecuados. Las fases sin cambio se marcan `hold` intencionalmente. No forzar estas cuatro fases en todos los movimientos.

Para coordinacion entre objetos usar secuencias independientes con el mismo reloj: el impacto dispara la consecuencia, la pluma acompana el recorte, la mirada precede o sigue al gesto segun la intencion. El nombre del actor no impone una ilustracion. Las pruebas en tests/fixtures/movimiento-transversal.mjs usan geometria simple para aislar ocho dominios. Son controles internos de ejecucion, no ejemplos de acabado ni escenas de produccion para copiar. Para aprender el lenguaje de animacion estudiar assets/referencia-diagnostico-original.json y las referencias del usuario.

Se puede escribir GSAP propio cuando esta ayuda no represente la accion. No limitar las escenas a esta API ni a los kits disponibles. Mantener estados explicitos, tiempos finitos y selectores locales. Los proyectos anteriores siguen admitidos sin puntos de control.

## Canvas y dibujo procedural

Un `onUpdate` puede dibujar desde un objeto de estado numerico animado por GSAP: `draw(state.t)`. Limpiar y reconstruir el fotograma de forma determinista. No acumular velocidad por llamada, usar reloj de pared, aleatoriedad no sembrada, timers ni depender de un `onComplete`. El motor busca con callbacks activos; la comprobacion debe incluir el mismo instante despues de saltos arbitrarios. Un callback por si solo no es un defecto.

## Acabado y comprobacion

Las pruebas tecnicas detectan propiedades que no llegaron a su estado, selectores rotos, desbordes temporales y diferencias al retroceder. No detectan por si solas una mano mal dibujada ni prueban belleza. Inspeccionar silueta, anatomia, contacto, apoyo de pies, oclusion, expresion, sombras, encuadre y lectura de la accion. Revisar a tamano de telefono y cerca de los detalles importantes. No aprobar solo por cuantos tweens o filtros contiene el codigo.

El JSON de referencia tiene duraciones sinteticas. Con audio real conservar palabras y tiempos medidos; sincronizar los acentos visuales con el significado, sin alterar la narracion para hacer caber la animacion. No dibujar pies editoriales ni numeracion de escenas.
