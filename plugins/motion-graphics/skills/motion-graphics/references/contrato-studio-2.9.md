# Contrato de autoría compartido 2.9

**Mismo objetivo que Motion Studio 7.4.0 main**, sin duplicar motor de render.

- `stylePreset`: uno de los 21 IDs de `galeria-estilos-21.md` (aceptados tanto a nivel proyecto como escena).
- `brandProfile`: `{name,colors:{background,ink,accent},typography,motionRules:[],avoid:[],narrativePromise}`; colores hexadecimales de seis dígitos, reglas de máximo 12 elementos.
- `soundDesign`: opcional, solo si se desea sonido, `{enabled:true,cues:[{type,at,duration,gain}]}`. Tipos permitidos: `whoosh,impact,click,pop,riser,chime,pad,wind`. `at` está expresado en segundos globales; `gain` debe estar entre 0 y 1; `duration` es positivo y de máximo 10 segundos; ningún cue puede exceder la duración total.
- `loop`: booleano. Si es `true` la composición de inicio y final debe ser coherente y pasar comprobación del empalme real de fotogramas.
- `direction.shots`: registrar escala, propósito, tiempo, duración y coordenadas numéricas; `direction.cameraTarget` requiere selector CSS simple existente.
- `direction.actions[].motion`: `from/to` con `scale,x,y,rotation,opacity`, easing compatible, selector existente y tiempos dentro de la escena.
- `customScene`: código HTML/SVG, CSS y GSAP sin targets inexistentes ni variables globales no declaradas.
- Narración: no inventar audios o marcas temporales; para TTS no disponible registrar límites.

### Puerta de calidad

No publicar ni afirmar que el JSON está probado sin ejecutar el validador local. No afirmar que el MP4 ya se renderizó o que la calidad artística está aprobada a menos que el usuario proporcione evidencias o Motion Studio haya generado ese informe. El complemento es generador, Motion Studio ejecuta y evalúa.
