---
name: motion-graphics
description: Convierte un guion, narración y referencias en un proyecto JSON para Motion Studio 7.4, con escenas SVG/HTML/CSS/GSAP originales y sincronizadas. También revisa o corrige proyectos existentes.
---

# Motion Graphics · núcleo 4.0 · Producción verificable

**Objetivo:** producir escenas que representen acontecimientos verificables, con personajes y mecanismos completos, continuidad, cámara motivada y calidad contrastada con las referencias. El entregable de este complemento es JSON importable, **no MP4**. Motion Studio es quien lo exporta. No prometer un resultado profesional sin inspección real.

## Protocolo obligatorio de doce pasos (v4)

Leer íntegramente [receta-profesional-v4.md](references/receta-profesional-v4.md) **antes** de planificar, crear o corregir un proyecto. La secuencia de trabajo es: investigar → guion → referencias → dirección visual → storyboard → geometría → animación → audio/subtítulos → piloto → revisión → montaje total → entrega. Cada puerta conserva evidencia concreta; no marcar una fase como aprobada por escribir su descripción. La producción se detiene ante una puerta bloqueada. No sustituir revisión de render por una puntuación de auditor estático.

**Antes de entregar cualquier JSON** ejecutar `node scripts/audit-explainer-craft-v4.mjs proyecto.json --storyboard storyboard.json` además de los validadores existentes. Este control identifica anomalías *detectables por código* y devuelve errores o advertencias; no aprueba la calidad artística. Si falta guion, audio, render, referencias o herramienta, declarar exactamente qué no se comprobó y establecer `VISUAL_PENDIENTE` sin inventar tiempos, recursos ni aprobaciones. El usuario puede solicitar explícitamente el proyecto completo aun con evidencia visual pendiente.

**Condición de rechazo de animación espacial:** en cada escena con objetos físicos comprobar, en fotogramas de inicio, punto máximo, contacto y fin, que el sujeto ocupa el mismo eje pretendido; que su máscara/clip corresponde al hueco real; que la capa frontal oculta lo que entra y no lo que sale; y que no existen saltos entre planos. Un `clipPath` válido, `scale` correcto y selector GSAP existente **no** significan que el objeto realmente salga por el centro.

## Contrato de trabajo — una sola fuente de verdad

**No cargar las instrucciones antiguas de las versiones 2.24–2.31 en bloque.** Este archivo es el flujo principal. Las herramientas históricas siguen disponibles pero son **opcionales y específicas** para la tarea. Consultar solo las referencias indicadas en la sección «Rutas especializadas». No generar 3, 4 o 6 documentos de planificación redundantes.

**Antes de escribir cualquier SVG o GSAP nuevo**, producir un único archivo de preproducción `storyboard.json` con esquema `motion-studio.storyboard/v3`. Leer íntegramente [storyboard-ejecutable-v3.md](references/storyboard-ejecutable-v3.md) para su estructura y criterios. Ejecutar:

```bash
node scripts/audit-storyboard-v3.mjs --storyboard storyboard.json
```

Si falta el storyboard, hay eventos sin tiempos, no se identifica quién actúa o qué cambia, o el plan solo contiene objetivos genéricos, **parar**. No fabricar el storyboard retrospectivamente a partir del JSON para simular cumplimiento.

## Proceso de producción en seis puertas bloqueantes

1. **Narración, referencias y storyboard.** Medir duración real y leer el SRT por palabra existente; mantener tiempos globales reales (no repartir por duración estimada). Ver las referencias visuales accesibles para extraer LOOK (material, silueta, luz, detalle) y MOVES (acción, desplazamiento de cámara, ritmo, transición). Separar observado de inferido. Dividir la historia por **acontecimientos visuales**, no por oración ni por una cuota fija de segundos. Registrar en el storyboard: escenas, cada plano, actores y objetos, estado anterior, causa, contacto si existe, reacción, resultado visible, cámara motivada y raccord. Proponer solo la cantidad de planos que el contenido exige.
2. **Acción causal ejecutable.** Crear la geometría específica de cada escena y codificar la transformación de **objetos físicos**, no solo un `zoom`, `fade`, `scale` o movimiento de cámara. Para fenómenos materiales distinguir motor, pieza afectada, contacto y consecuencia, cada uno con selector real y evento temporizado; mostrar antes/durante/después. Si una lámina se sella, el código debe mostrar el recorrido de dos láminas, su encuentro y un estado nuevo de costura; el texto de `direction.actions` no lo reemplaza.
3. **Construcción ilustrada.** Un mismo actor conserva proporciones y anclajes. Manos, brazos y objetos manipulados deben estar conectados; si no existe rig correcto para una acción, rediseñar la composición sin una mano aislada. Construir volumen con geometría, gradientes, sombras y oclusión **cuando ayuden a explicar**. No usar un mismo panel de burbujas, pantalla o tarjeta como plantilla para acontecimientos distintos.
4. **Cámara y continuidad.** Variar plano general, medio y detalle **según lo que se deba comprender**. El movimiento de cámara no cuenta como movimiento del mecanismo. Prohibida la secuencia cíclica de 2–3 presets de cámara aplicada a todo el video. Preservar identidad de activos, continuidad de posiciones y el estado al terminar un plano.
5. **Inspección del piloto y del render.** Para proyectos mayores de 15 s, construir primero un piloto de 8–12 s que incluya **la acción visual más difícil**, no necesariamente el inicio. Renderizar y examinar frames antes, durante contacto y después, además de la secuencia en movimiento. Comparar con los MP4 de referencia. No continuar a la duración total si falla anatomía, contacto, causación o continuidad. Si no hay acceso al motor o al MP4, estado `VISUAL_PENDIENTE`: entregar solo el piloto y solicitar validación, salvo que el usuario pida explícitamente el proyecto completo aun sin revisión.
   Cuando exista MP4 real, generar evidencia con: node scripts/sample-pilot-v3.mjs --video render.mp4 --storyboard storyboard.json --out revision-piloto --max 12. Si el piloto es un recorte, añadir `--start SEGUNDO_GLOBAL` (por ejemplo, `--start 29.45`). Si existe una referencia externa, añadir `--reference referencia.mp4`. El reporte indica el segundo del clip y del storyboard. Abrir review.html y revisar los fotogramas y el video. Ese script **nunca aprueba por sí solo**.
6. **Verificación y entrega.** Al finalizar un JSON, comprobarlo **contra el mismo storyboard anterior**:

```bash
node scripts/audit-storyboard-v3.mjs --project proyecto.json --storyboard storyboard.json
node scripts/audit-art-direction.mjs proyecto.json --storyboard storyboard.json
node scripts/gate-sequential-quality.mjs proyecto.json --storyboard storyboard.json --evidence evidencia.json --render render.mp4
```

Si existe una referencia externa, añadir `--reference referencia.mp4` al control final. La evidencia visual debe incluir un video del propio proyecto que se pueda decodificar y cuya duración corresponda al montaje.

Usar `scripts/validate-project.mjs`, `scripts/validate-2-9-contract.mjs` y `scripts/repair-scene-ids.mjs` cuando estén disponibles. Validar la existencia de **todos** los selectores GSAP por escena y los IDs SVG únicos. Los scripts son ejecutables en un entorno con Node, no dentro del JSON. Si no se pueden ejecutar, declarar explícitamente qué no se validó y no marcar la puerta como aprobada. No confundir un auditor sintáctico con juicio visual.

### Umbrales de rechazo, no métricas decorativas

- Un propósito de plano repetido literalmente en escenas distintas sin justificación visual bloquea la primera puerta.
- Ciclos de cámara idénticos reutilizados por inercia bloquean la primera puerta.
- Una acción del storyboard sin selector físico en HTML y sin modificación real en `customScene.script` bloquea la segunda puerta.
- Los eventos de contacto, compresión, sellado, agarre o articulación deben tener **dos participantes y una consecuencia**. Una traslación de todo el objeto no cuenta como deformación de su material.
- Escenas con extremidades desconectadas, objetos flotantes, recortes injustificados o personajes que cambian de diseño necesitan corrección visual. **Ningún auditor estático los aprueba**.
- Todas las escenas nacen con `approved:false`. Un informe de tests verde **no** cambia esa bandera.

## Contrato Motion Studio 7.4

- Mantener el formato `proyecto.json` vigente: `script`, `scenes`, `duration` por escena, `customScene:{html,css,script}`, `direction:{objective,shots,actions,visualMode}`, `wordTimings`, `voiceAnalysis` y configuración ya proporcionada. Consultar [contrato-studio-2.9.md](references/contrato-studio-2.9.md).
- Gráficos verticales lógicos de 720 × 1280, exportación habitual de 1080 × 1920/30 fps. No inventar audioAsset: el JSON no contiene bytes de MP3. Conservar la voz y subtítulos sincronizados con SRT real.
- Script temporal GSAP determinista, compatible con `tl`, `S`, `D`, `T0` cuando la composición los usa. El tiempo de cada acción se expresa localmente en el script, y el tiempo del storyboard es global. No cambiar ni escalar la narración.
- IDs de `<defs>` y referencias SVG únicos entre escenas; cámaras, capas y selectores reales. Quitar adornos editoriales innecesarios, overlays genéricos y subtítulos ilegibles.
- Conservar uno de los 21 `stylePreset` válidos y la identidad visual de marca cuando el usuario la pida. El preset **no sustituye** dirección, ilustración ni acción.
- Mantener `showText:false` cuando el usuario pida no subtítulos. Foley, música y B-roll solo si se solicitan o contribuyen y sus tiempos están verificados.

## Rutas especializadas — solo si aplican

| Caso | Recurso |
|---|---|
| Estructura del storyboard y eventos causales | [storyboard-ejecutable-v3.md](references/storyboard-ejecutable-v3.md) |
| Contrato de JSON y sincronización | [contrato-studio-2.9.md](references/contrato-studio-2.9.md), [motion-studio.md](references/motion-studio.md) |
| Personajes articulados, manos y contacto | [personajes-ejecutables-p5.md](references/personajes-ejecutables-p5.md), [personajes-y-contacto.md](references/personajes-y-contacto.md) |
| Simulaciones de deformación y técnica SVG | [animacion-transversal.md](references/animacion-transversal.md), [produccion-ilustrada.md](references/produccion-ilustrada.md) |
| Los 21 estilos | [galeria-estilos-21.md](references/galeria-estilos-21.md), `references/styles/<id>.md` |
| Corregir un JSON existente con evidencia visual | [correccion-iterativa-p1.md](references/correccion-iterativa-p1.md) |
| B-roll, flujos especiales, audio, integraciones | Consultar únicamente su referencia P2, P4, P6 o P7 si el usuario los pide |

**Regla final:** prefiero un plano causal terminado y visualmente revisado que trece escenas aparentemente completas pero genéricas. Si alguna puerta falla, informar el defecto, corregir la misma puerta y **no declarar éxito**.
