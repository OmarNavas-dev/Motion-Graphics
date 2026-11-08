# Escenas HTML a medida (Motion Studio 7.1)

Cada escena puede llevar su propio HTML, CSS y animación GSAP en `customScene`. También puede incluir un lienzo Canvas procedural: el HTML crea `<canvas>` y el script dibuja cada estado de forma determinista usando `T0`, `D` y una función temporal llamada por GSAP. No uses `requestAnimationFrame`, relojes ni azar; HyperFrames controla el reloj del render. Para Canvas, usa un proxy de GSAP para que el dibujo se actualice en cada fotograma:

```js
const state = {t: 0};
tl.to(state, {t: D, duration: D, ease: 'none', onUpdate: () => draw(state.t)}, T0);
```

Las llamadas discretas `tl.call(() => draw(...))` producen saltos y no deben usarse para una animación continua.
Si existe, **sustituye la plantilla automática** de esa escena. La voz, la música,
la duración y la aprobación siguen funcionando igual. Las escenas sin `customScene`
usan la plantilla de siempre, así que puedes mezclar ambas en un mismo video.

```json
"customScene": {
  "html":   "<div class=\"wrap\">...</div>",
  "css":    "__SCENE__ .wrap{...}",
  "script": "tl.from(S+' .wrap',{opacity:0,duration:.5},T0+.2);"
}
```

## Marcadores que se sustituyen al exportar
| Marcador | Valor |
|---|---|
| `__SCENE__` (en html/css/script) | `#hf-scene-N`, el selector único de la escena |
| `__IMAGE__` | imagen importada en esa escena |
| `__VIDEO__` | clip MP4 importado en esa escena |
| `S` (variable del script) | igual que `__SCENE__`, como texto |
| `T0` (variable del script) | segundo en el que empieza la escena en el video |
| `D` (variable del script) | duración de la escena en segundos |
| `tl`, `gsap` | la línea de tiempo principal y GSAP |

## Reglas
1. **Prefija todo el CSS con `__SCENE__`** para que una escena no afecte a otra.
2. **Tiempos siempre relativos a `T0`**: `T0+0.4` es 0,4 s tras empezar la escena.
3. **Determinista**: no uses `Math.random`, `Date`, `setTimeout`, `setInterval`,
   `requestAnimationFrame` ni `fetch`. El servidor rechaza el proyecto si aparecen.
4. **Sin recursos externos**: nada de `http(s)://` en imágenes o fuentes. Usa `__IMAGE__`
   o SVG/CSS en línea. Tampoco `<script>`, `<iframe>` ni atributos `onclick`.
5. Tamaños máximos por escena: HTML 150 000, CSS 50 000, script 100 000 caracteres. Son techos de capacidad, no cantidades que haya que llenar. Los proyectos admiten 1 MiB de base y 2 MiB por escena (máximo 161 MiB con 80 escenas), incluyendo texto, UTF-8 y escapes JSON. Los excesos se rechazan; no se recorta código. Estas capacidades requieren la versión de Motion Studio que incluye esta ampliación; versiones anteriores conservan 30 000 / 12 000 / 12 000.
6. El lienzo base mide 720×1280 (vertical) o 1280×720 (horizontal); el proyecto puede exportarse a 1080p (1080×1920 o 1920×1080) y a 24/30 FPS.
7. Una idea por escena; escalona las entradas 60–120 ms (`stagger`) y varía los easings.
8. Anima solo `transform` y `opacity` siempre que puedas: es lo más fluido en una PC de 8 GB.

## Cómo usarlo
1. Pide a Claude las escenas con este formato (pásale este archivo y `ejemplo-escenas-html.json`).
2. En el editor: **Abrir proyecto JSON**.
3. Revisa con **Vista previa fiel** (abre /preview; la vista previa de Remotion no dibuja `customScene`).
4. Aprueba las escenas y **Exportar MP4 · HyperFrames**.

Ejemplos: `ejemplo-escenas-html.json` (10 s, básico) y `ejemplo-30s-sistema-solar.json` (30 s, 6 escenas)
(regenerable con `node scripts/generar-ejemplo-html-a-medida.mjs`).
