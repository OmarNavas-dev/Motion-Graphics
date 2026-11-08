# Kits de motion graphics (v1.6)

Leer ANTES de dibujar escenas técnicas, explicativas o de mecanismos (cómo funciona X, procesos, máquinas, ciencia, construcción, productos) y siempre que se quiera un acabado de motion graphics en vez de formas planas. No son una estética obligatoria: son herramientas para materiales, cámara, efectos, etiquetas y piezas mecánicas. Cada tema decide su paleta y sus formas.

Los kits son código de AUTORÍA (Node). Generan HTML/CSS/GSAP como texto que se incrusta en `customScene`. El JSON final no los necesita.

```js
import * as K from '/RUTA/skills/motion-graphics/scripts/kits/index.mjs';
const s = K.createScene({id:'escena-01', duration:5.5});   // uid único por escena se deriva del id
s.add('bg', K.skyNight(s));                                // capas: bg · mid · fg (cámara) · hud (fija)
...
export default [ s.build({scriptExcerpt:'texto pronunciado'}) ];
```
Ensamblar con `node scripts/assemble-scenes.mjs base.json escenas.mjs salida.json --words palabras.json`. `examples/laboratorio-mecanico.mjs` es un ejemplo de combinacion tecnica; no exige usar todos los kits.

## Ficha de plano (obligatoria antes de dibujar)
Para cada escena definir que cambia, como se prepara, donde ocurre el contacto o revelacion y cual es el resultado. Elegir material, camara, efectos y etiquetas solo si ayudan a verlo. No hay un minimo de recursos ni una cantidad de animaciones que certifique calidad.

## Reglas que evitan errores (comprobadas)
1. **Todo lo que interactúa va en la MISMA capa** (`fg`). `bg` y `mid` se mueven con menos intensidad (paralaje); un martillo en `fg` y un pilote en `mid` se separan al hacer zoom. Usar `bg` solo para cielo/nubes/fondo lejano.
2. **Zona de subtítulos**: el generador pone el texto hacia el 11 % superior (y ≈ 140 de 1280). Mantener acción y etiquetas por debajo de y ≈ 200 **en pantalla**, contando el zoom de cámara. Un martillo levantado 40° ya invadía esa zona; se bajó a 28°.
3. **Fondos con margen**: `skyNight`, `clouds` y `soil` usan `bleed` (220 px por defecto) para no mostrar bordes al acercar la cámara.
4. **En GSAP con SVG, `svgOrigin` debe ir en los valores iniciales Y finales de un `fromTo`.** Si solo va en el final, una pieza dentro de `<g transform="translate(...)">` escala desde un punto equivocado (se midió un desplazamiento de cientos de px). Los kits ya lo hacen; hacerlo igual en código propio. `svgOrigin` es local al padre de la pieza.
5. **Dibujo determinista**: se admite onUpdate para reconstruir SVG o Canvas desde el estado GSAP. No acumular pasos ni depender de callbacks anteriores. El motor busca con callbacks activos. No usar onComplete para crear elementos necesarios. Comprobar ida, vuelta y saltos arbitrarios.
6. **Palabras prohibidas en el script**, incluso en comentarios o cadenas: `process`, `location`, `import`, `require`, `eval`, `fetch`, `setTimeout`, `Date.now`, `Math.random`, `navigator`… El kit comprueba con el mismo sanitizador de Motion Studio y falla al construir.
7. **Presupuesto por escena**: consultar scripts/capabilities.mjs y s.stats(). Los limites actuales son HTML 150000, CSS 50000 y script 100000 caracteres; son techos, no objetivos. Reservar espacio para subtitulos y simplificar antes de dividir una accion.
8. **Cámara**: añadir los movimientos en orden cronológico (el kit lanza error si no). `camera.shake` usa su propia capa (`.shake`) y no altera el encuadre. Los subtítulos nunca van dentro de la cámara.
9. **Duración**: toda animación debe terminar dentro de la escena; los kits lanzan error si `at + dur` supera la duración. No corregir con `timeScale`.
10. **Rendimiento**: los filtros `feTurbulence` repintan al mover la cámara. Motion Studio exporta fotograma a fotograma, así que el resultado es correcto; si la vista previa va lenta, bajar `texture`, usar menos nubes o reducir el tamaño de las placas de acero.

## API
Todas las funciones reciben `s` (la escena) como primer argumento. `at`/`out`/`dur` son segundos **de escena**. Las que devuelven SVG se insertan con `s.add(capa, svg)`; las que ya añaden su SVG devuelven el nombre de clase.

### Núcleo (`scene-kit`)
`createScene({id,duration,uid?,width=720,height=1280,bg,bleed})` · `s.add(layer,svg)` · `s.defs(key,markup)` (una vez por clave) · `s.css()` · `s.js()` · `s.nid(base)` · `s.gid(name)`/`s.url(name)` (ids únicos) · `s.stats()` · `s.build({title,scriptExcerpt})`. `scriptExcerpt` es obligatorio (texto pronunciado; `''` en un laboratorio sin narración).

### Materiales (`materials-kit`) → devuelven SVG
- `skyNight({top,bottom,stars,seed})` · `clouds({y,h,count,seed,tone,light,rough,grain})` nubes con borde irregular y grano.
- `steel({x,y,w,h,tone,rivets,brush:'h'|'v',texture})` placa de acero cepillado con bisel · `rod({x,y,w,h,tone,cap})` varilla/cilindro vertical con luz lateral.
- `wood({x,y,w,h,tone})` veta horizontal · `soil({y,layers:[{h,tone}],pebbles,seed})` estratos ondulados con guijarros.
- `mix(a,b,t)` mezcla colores `#rrggbb`.

### Efectos (`fx-kit`)
- `explosion({cx,cy,r,at,dur,seed,sparks,debris,smoke,flashScreen})` destello + bola de fuego con turbulencia + onda + chispas + humo + escombros (+ destello de pantalla). Combinar con `camera.shake` al mismo `at`.
- `smoke`, `sparks`, `shockwave`, `flash`, `glow` (SVG), `pulse(selector,{at,dur,from,to,times})` latidos acotados, `particles` (polvo/brasas, con medida).
- `cutaway({x,y,w,h,at,dur,from:'center'|'top'|'bottom'|'left'|'right',out,outer,inner})` ventana que se abre revelando `inner` sobre `outer` (corte interno). Devuelve SVG.
Todo el azar sale de `seed` y queda fijo en el JSON: la reproducción es determinista.

### Cámara (`camera-kit`)
`const cam = camera(s,{layers,anchor,focus,k})` y luego, en orden: `cam.move(at,dur,{focus:[x,y],k,ease})` (alias `push`/`pull`) · `cam.cut(at,{focus,k,dip})` · `cam.drift(at,dur,{dx,dy,dk})` · `cam.shake(at,dur,{amp,hz,decay,seed})` · `cam.slowMo(at,dur,{label,focus,k,vignette})` (viñeta + etiqueta fija + acercamiento; **no cambia la velocidad de la timeline**, así las palabras siguen sincronizadas: dar más tiempo a la acción en el guion de escena).

### Etiquetas y gráficos (`callouts-kit`)
`label({text,x,y,dx,dy,at,out})` línea guía que se dibuja · `arrow({x1,y1,x2,y2,double})` · `dimension({x1,y1,x2,y2,text})` cota · `thermometer({x,y,h,from,to,text})` · `gauge({cx,cy,r,from,to,text})` · `stepList({x,y,items,times})` enciende el paso activo en su instante · `counter({x,y,from,to,format,unit})` · `tally({x,y,count,step})` · `frame({x,y,w,h})` marco azul con puntos · `warning({text,x,y,blink})` · `tag({text,x,y})`. Opción `layer:'hud'` para fijarlas en pantalla (no siguen a la cámara).

### Mecanismos (`mechanism-kit`)
`rails` guías · `chamber` + `chamberGlow` + `gasDots` cámara de combustión en corte · `pistonCrank({cx,cy,r,L,bore})` con `.animate(at,dur,{cycles,samples})` (cinemática real muestreada: carrera = 2r) · `gear` + `spin` (engranar: fase del segundo = 180/dientes, giro opuesto, vueltas ∝ dientes) · `spring` + `compress` · `tank` + `setLevel` · `flow({d,at,dur})` fluido por tubería · `fuelCell`.

## Receta: «cómo funciona X» (patrón del video de referencia)
1. **Gancho cotidiano** (objeto real, textura de madera/metal) con contacto, chispas y conteo.
2. **Zoom al detalle**: `camera.move` al punto de acción; `label` con el nombre de la pieza.
3. **Corte interno**: `cutaway` desde el centro; dentro, la causa invisible (compresión, flujo).
4. **Proceso por pasos**: `stepList` sincronizada con acciones reales + `thermometer` o `gauge` del valor que cambia.
5. **Consecuencia**: `explosion`/`shockwave` + `camera.shake` + `warning`, y `cam.move` de retirada.
6. **Cierre por analogía** (p. ej. contorno lineal del objeto cotidiano) si el guion lo pide.
Variar el encuadre entre escenas; `check-motion-richness.mjs` avisa de planos repetidos o planos.

## Comprobación
- `node scripts/check-motion-richness.mjs proyecto.json` — recursos por escena (materiales, cámara, efectos/corte, etiquetas), escenas casi estáticas, planos repetidos y HTML cerca del límite. Mide presencia, no calidad.
- `python scripts/preview-frames.py proyecto.json --gsap RUTA/gsap.min.js --out carpeta_nueva` — fotogramas reales con Chromium + GSAP, errores de consola, selectores inexistentes y timeline más larga que la escena. **No** sustituye a `review-project.mjs` ni a la exportación de Motion Studio; es la vía cuando no hay repositorio de Motion Studio. Usar los PNG para revisar encuadres, texto tapado y piezas que se separan.
- Verificado en este complemento con GSAP 3.12.5 y Chromium; no se ejecutó dentro de Motion Studio. Si su versión de GSAP difiere, repetir `review-project.mjs` antes de entregar.

