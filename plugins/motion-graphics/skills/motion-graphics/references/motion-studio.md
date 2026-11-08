# Contrato Motion Studio 7.1.3

Derivado de `src/studio-schema.ts`, `server-utils.mjs` y `GUIA-ESCENAS-HTML.md` de OmarNavas-dev/Motion-Graphics. Usar la version del repositorio si esta disponible. El importador acepta objeto raiz o `{ "project": objeto }`; preferir objeto raiz. No son escenas Remotion JSX ni una composicion HyperFrames independiente.

Estructura minima funcional:

```json
{
  "name": "Titulo",
  "format": "vertical",
  "resolution": "720p",
  "fps": 24,
  "palette": "aurora",
  "style": "cinematic",
  "visualEngine": "adaptive",
  "showText": true,
  "audioAsset": "",
  "musicAsset": "",
  "fontAsset": "",
  "script": "Texto completo pronunciado.",
  "creativeBrief": "Direccion visual concreta",
  "characterMode": "new",
  "references": [],
  "narrationMode": "single",
  "voiceClips": [],
  "scenes": [{
    "id": "escena-01",
    "layout": "hero",
    "duration": 5,
    "title": "Titulo interno",
    "subtitle": "",
    "scriptExcerpt": "Texto completo pronunciado.",
    "imageAsset": "",
    "videoAsset": "",
    "approved": false,
    "transition": "cut",
    "cues": [], "captions": [], "audioCues": [], "layers": [], "motionGraphics": [],
    "customScene": {
      "html": "<svg viewBox=\"0 0 720 1280\"><g class=\"world\"><!-- ilustracion completa aqui --></g></svg>",
      "css": "__SCENE__ > svg{width:100%;height:100%;display:block}",
      "script": "tl.to(S+' .world',{x:8,duration:D,ease:'none'},T0);"
    }
  }]
}
```

El comentario ilustrativo del ejemplo se reemplaza con geometria real. `approved:false` conserva la revision del usuario en Motion Studio.

- `customScene` reemplaza la plantilla visual automatica, y solo se dibuja fielmente con HyperFrames. Usar la vista previa fiel (integrada en la pantalla principal en versiones actualizadas) y posteriormente exportación HyperFrames en Motion Studio.
- HTML maximo 30000 caracteres, CSS 12000 y script 12000 por escena. Una a 80 escenas, duracion individual de 0.5 a 60 segundos (se redondea a centesimas), total maximo 900 segundos. Presupuesto: 1 MiB + 96 KiB por escena; no depender de truncamiento automatico.
- `id`: unicos, hasta 45 caracteres ASCII alfanumericos, guion o guion bajo. `name` max42; `title` max80; `scriptExcerpt` max800; `script` max45000; `creativeBrief` max2000. Dividir escenas si exceden limites.
- `format`: vertical u horizontal; horizontal base1280x720. `resolution`:720p o1080p; `fps`:24 o30. SVG escalable y CSS proporcional mantienen el diseno.
- En script: `tl` es la timeline GSAP compartida, `gsap` la API, `S` selector de esta escena, `T0` origen temporal proporcionado por el motor, `D` duracion. Programar TODO en `T0 + tiempoLocal`. No crear una timeline que corra por su cuenta. No cambiar ni redeclarar estas variables ni suponer que T0 siempre es cero o siempre el tiempo global; las versiones con reloj por escena aíslan cada clip para que repeat/stagger no alargue la película.
- En HTML/CSS `__SCENE__` se sustituye por selector unico. Prefijar reglas CSS. IDs de gradientes, mascaras y clipPaths deben ser unicos por escena, incluso con personajes reutilizados. Selectores JS acotados a `S`.
- Sin `<script>`, iframe, eventos HTML, importaciones, recursos remotos, `fetch`, relojes, almacenamiento, `eval`, `new Function` o azar. El namespace SVG `http://www.w3.org/2000/svg` es permitido. El script se ejecuta con las variables anteriores, sin modulos.
- Usar `tl.set`, `to`, `fromTo` deterministas. Canvas es posible si dibuja por un proxy temporal de GSAP, sin requestAnimationFrame. Preferir SVG para escenas ilustradas.
- Medios solo `user-assets/<UUID de 36 caracteres>.<extension>`, bajo `public`. No usar rutas absolutas, data URI o URLs en `audioAsset`. Los visuales SVG inline no requieren assets.
- Narracion unica en `audioAsset`; no repetirla en cada escena o `audioCues`. Suma de duraciones al audio dentro de un fotograma; considerar redondeo de cada escena a fotogramas en el reproductor.

