# Personajes y contacto ejecutables

La ficha de un personaje debe gobernar la geometría que se dibuja. No basta con
escribir su apariencia en `actors` y generar otro cuerpo en cada plano.

Para adultos de ilustración editorial en tres cuartos, usar
`createCharacterCast`, `animateAdult` y `renderSheetGrip` desde
`scripts/kits/index.mjs`. Definir el reparto una vez y reutilizarlo. El reparto
produce las fichas `actors` y las instancias visibles desde la misma definición.
Esta familia tiene variantes de cara, cabello, gafas y vestuario; no produce
automáticamente niños, animales, retratos históricos o cualquier estilo de las
referencias. Para esos casos dibujar un rig específico y revisarlo con el mismo
criterio de anatomía y contacto.

```js
const cast = createCharacterCast([
  {id:'inventor', name:'Inventor', face:'long', glasses:true, shirt:'#526f7c'},
]);
const rest = {left:[-87,-12], right:[88,-10]};
const actor = cast.place(scene,'inventor',rest,{x:360,y:800,scale:1});
animateAdult(scene,actor,[
  {...rest,at:0},
  {...rest,right:[100,-44],headTilt:6,at:1},
  {...rest,at:3},
]);
```

Las poses indican ambas muñecas. La cinemática conserva la longitud del brazo y
antebrazo, calcula los codos y rechaza destinos inalcanzables. Las poses deben
empezar en cero, terminar dentro de la escena y funcionar al avanzar y retroceder.
El objeto sostenido se dibuja bajo la transformación de su mano. Para soltarlo,
transferirlo al destino en el mismo instante y con la misma matriz: sin saltos,
duplicación ni desaparición. Estudiar `examples/inventores-sellado.mjs`: incluye
dos personajes distintos, entrega de películas, retirada y sellador, en orden.

Para un primer plano de una mano sujetando una lámina, colocar los elementos en
un único grupo animado: `renderSheetGrip({layer:'back'})`, lámina,
`renderSheetGrip({layer:'front'})`. Los dedos deben abrazar el borde; una flecha
o un trazo en V no representa una mano. El antebrazo de este componente entra
desde la derecha del encuadre y necesita una composición apropiada.

Para tapas, usar `hingedPanelAt` con los dos puntos reales de bisagra y las dos
esquinas libres. La bisagra queda fija durante el movimiento. Dibujar interior,
pieza móvil y frente según su orden de profundidad. El frente de una caja oculta
el material todavía contenido: elevar todo un grupo no sustituye esa oclusión.

Antes de entregar, abrir fotogramas reales de preparación, contacto, liberación
y resultado de cada interacción. Revisar cuello unido al torso, hombros, dos
codos y manos legibles, proporciones coherentes, pies o recorte intencional,
oclusiones, pivotes y ausencia de saltos. Comprobar la ejecución con los dos
validadores del contrato compartido y volver a capturar después de cada cambio.
Un render sin errores no demuestra por sí solo calidad visual.
