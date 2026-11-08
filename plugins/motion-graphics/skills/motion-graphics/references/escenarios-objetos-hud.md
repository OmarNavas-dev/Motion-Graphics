# Escenarios, objetos de historia, placas y cierre (kits v2.1)

Cinco kits nuevos cubren lo que las referencias de TikTok usan y los kits anteriores no dibujaban. Todos son geometría SVG determinista que se incrusta en `customScene`; ninguno usa azar al reproducir y todos rechazan animaciones que terminen después de la escena.
`import * as K from '../scripts/kits/index.mjs'` SOLO durante autoría. Ejemplo completo: `examples/formatos-referencia.mjs` (siete escenas).

## Reglas comunes

- Capas: `bg`, `mid` y `fg` se mueven con la cámara; `hud` queda fija. Las placas de `hud` deben ir a `y ≥ 215` para no pisar el subtítulo superior.
- Orden: los escenarios van primero; `oceanFront()` se llama DESPUÉS de `boat()` para que la ola tape el casco.
- Cada llamada usa clases únicas (`s.nid`), así que puedes repetir un kit en la misma escena.
- `camera(s)` protege por defecto la zona de título y subtítulo (`safeTop: 330`). Comprobar siempre el fotograma final de cada plano.
- Los tiempos son absolutos de escena (`at`, `dur`). Los bucles (olas, llamas, balanceo) calculan cuántos ciclos caben y nunca pasan de la escena.

## Escenarios (`scenery-kit.mjs`)

| Función | Qué dibuja | Devuelve |
|---|---|---|
| `skyCycle(s,{from,to,at,dur,sun,sunFrom,sunTo})` | Cielo que cambia `day`/`dawn`/`dusk`/`night`, sol que baja, estrellas si termina en noche, nubes | `{horizon}` |
| `ocean(s,{horizon,tone,bands})` | Mar con gradiente y bandas de olas en bucle (`blue`,`teal`,`deep`,`dusk`) | `{horizon,bands}` |
| `boat(s,{x,y,scale,crew,rock})` | Barca con motor y tripulantes; balanceo acotado | `{cls}` |
| `oceanFront(s,{y,amp,per})` | Ola frontal que tapa el casco (capa `fg`) | |
| `nave(s,{vp,vitrines,candles,windows})` | Nave en perspectiva: suelo, paredes, arcos de fondo, vitrales, pilares, vitrinas doradas, velas | `{pt(X,Y,z), floorY, wallX, zBack}` |
| `cellRoom(s,{bulb,floorY,door,window,tally})` | Cuarto con bombilla, cono de luz, ventana con barrotes, marcas y puerta | `{floorY, door}` |

`nave().pt(X,Y,z)` proyecta con `x = vp[0] + X/z`, `y = vp[1] + Y/z`: suelo en `Y=360`, techo en `Y=-920`, paredes en `X=±440`, fondo en `z=4`. Úsalo para colocar objetos propios en la misma perspectiva.

## Objetos de historia (`props-kit.mjs`)

| Función | Uso |
|---|---|
| `candle`, `crossMarkup`, `haloMarkup` | Vela que titila; cruz dorada y aureola como fragmentos de figuras |
| `recumbentFigure({kind})` + `closeUp(s,{inner})` | Figura yacente (`nun`,`monk`,`shroud`) dentro de un panel con marco dorado que entra con fundido |
| `petals(s,{x,y,count,at,dur})` | Pétalos que caen, escalonados dentro de la ventana de tiempo |
| `parchment(s,{x,y,w,h,title,signature,signAt})` | Pergamino con borde irregular, líneas, firma escrita con pluma; (x,y) es la esquina superior izquierda. Devuelve `{sealX,sealY,signY,bottom}` |
| `waxSeal(s,{x,y,emblem,at})` | Sello de lacre que cae con onda (`keys`,`cross`,`star`) |
| `stamp(s,{x,y,text,at})` | Sello de tinta que golpea («NO CUENTA») |
| `openBook(s,{heading,ref,verse,flipAt,hlAt})` | Libro abierto con hoja que gira y versículo resaltado (máx. 3 líneas; la letra se ajusta) |
| `eye(s,{ringAt,revealAt})` | Ojo en primer plano con siluetas reflejadas y anillo dorado. Devuelve `{center,pupil,target}` para `camera().move({focus:target,k:4.4})` |

## Placas editoriales (`hud-kit.mjs`)

`chip` (placa de año, edad o magnitud), `chapterBadge` («1 La sed»), `meterBar` (barra «agua en tu cuerpo»), `heartRate` («150 lpm» con trazo que se dibuja) y `stopwatch` (mm:ss fijo o en cuenta atrás). Para contadores de días o kilómetros usar `counter` de `callouts-kit`.

## Cierre del canal (`endcard-kit.mjs`)

`endCard(s,{logo:['TU','CANAL'], name, button, done, part:'PARTE 2', pill:'Parte 1 de 2'})`: logotipo con rayos, botón «Seguir» que se pulsa y pasa a «Siguiendo ✓», placa «PARTE 2» y pastilla. Exige `logo` y `name` del usuario; no inventa identidad. Es la única excepción a la regla de firmas y marcas.

## Foto del usuario (`photo-kit.mjs`) — NO verificada en Motion Studio

`photo(s,{asset:'user-assets/<UUID>.jpg', zoom:[1,1.12], caption})` incrusta `<image href>` con zoom lento. El contrato solo admite `user-assets/<UUID>.<png|jpg|jpeg|webp>` y la validación lo exige; no se comprobó que el motor resuelva esa ruta relativa dentro de `customScene`. Si no la resuelve, usar `scene.imageAsset` y `imageFit` del contrato para el plano completo.

## Lo que hay que ajustar a mano

- La pose `seatedPose` de `puppet` no se alinea sola con una silla: probar la altura de cadera y mover `y` del muñeco hasta que se apoye.
- Los límites medidos sobre fotogramas renderizados con GSAP, no dentro de Motion Studio.
- Mantener la acción fuera de la banda superior (título y subtítulo); revisar el último fotograma de cada plano.
