# Preproducción vinculante 2.31: las escenas nacen del acontecimiento, no del SVG

Problema confirmado en `Motion_Studio_Plástico_Burbujas_20s(1).json` y su MP4: cuatro escenas, seis planos documentados, objetivos aparentemente concretos pero las diez acciones de `direction.actions` repetían fórmulas «Transformación material de …» / «Cambio visible tras la acción». No constaban transiciones ni estados de entrada/salida. Había una mano/dedo que flotaba en la escena de la caja y una formación de burbujas realizada aumentando el tamaño de un grupo. El auditar técnico de 2.30 dio un falso positivo. El plan de 2.31 debe bloquear esas deficiencias **antes** de producir dibujos.

## Orden obligatorio de trabajo

1. **Reloj único.** Leer audio y SRT de palabras reales. Mantener segundos globales en el plan y convertir a segundos de escena una sola vez (`local = global - sceneStart`). Conservar pausas y no repartir tiempos proporcionalmente.
2. **Acontecimientos.** Identificar cambio de lugar, protagonista, causa, mecanismo y resultado. El número de escenas sale de los eventos, nunca de las oraciones ni de una cuota fija.
3. **Plan de planos `plan.json`.** Por plano: `id`, `sceneId`, `start`, `end`, `narration`, `visualGoal`, `location`, `lighting`, `entryFrame`, `exitFrame`, `camera {shot,from,to,movement}`, `action {anticipation,main,contact,recovery}`, `actors[]`, `props[]`, `transition {type,to,continuity}`. El último `transition.to` es `null`. La salida del plano N debe concordar con la entrada del N+1, incluso si cambia de escena.
4. **Hoja de acontecimientos `beats.json`.** Cada beat usa el ID de escena final, segundo global `at`, sujeto `subject`, `visual`, `cause`, `effect` y `speechAt` obtenido del SRT cuando corresponda; `bridge` en cortes. **No inventar la palabra ancla**; si falta tiempo real, documentar bloqueo.
5. **Plan de mecanismos `mechanics.json`.** Cada acción lleva `id`, `sceneId`, `selector`, `kind`, `actor`, `cause`, `visibleResult`, `start/end` globales, `startState/endState`; para movimientos `contact` y `hinge`, `contactAtTime` numérico global dentro de la acción, además de ancla y soporte. Registrar qué objeto arrastra, sostiene, comprime o transforma a otro. Un `tl.to(.objeto,{scale:...})` no demuestra que el objeto se infle, abra o rompa.
6. **Validar antes del dibujo.** Ejecutar `validate-shot-plan.mjs`, `validate-beats.mjs` y `validate-mechanics.mjs`. Resolver errores; analizar advertencias. Conservar estos tres planes como artefactos internos de autoría.
7. **Dibujar y animar.** Generar HTML/SVG/GSAP por acontecimiento. Cada `direction.action` debe conservar un verbo real y una consecuencia; los selectores y su cronología deben corresponder a `mechanics.json`. No aceptar «Transformación material de» ni «Cambio visible tras la acción».
8. **Verificar el contrato ejecutado.** Ejecutar `node scripts/audit-production-planning-2.31.mjs --project proyecto.json --plan plan.json --beats beats.json --mechanics mechanics.json` **antes de superar la etapa 1**, además del gate secuencial con los tres argumentos. El auditor cruza IDs, número y tiempos de planos, duración, beats por escena y selectores/intervalos de mecanismos.
9. **Revisar imágenes reales sin subtítulos:** estado inicial, precontacto, contacto, reacción, estado final y fotogramas de continuidad entre escenas. La verificación estructural puede fallar por limitaciones del contrato, y aun cuando pasa no certifica calidad de imagen ni biomecánica.

## Unidad de continuidad

Al cambiar plano, conservar por ID: aspecto del protagonista, color/estructura del material, transformaciones ya ocurridas, eje de movimiento, lugar de cámara y punto de contacto. Un objeto no puede aparecer mágicamente fuera de la mano. En un cambio de tiempo, indicar elipsis explícita. Compartir activos canónicos; no reconstruir personajes o herramientas de distinta silueta en cada escena.

## Ejemplo de segmentación específico, NO plantilla universal

Los primeros 20 s del plástico de burbujas contienen seis acontecimientos que pueden representarse con seis escenas o con escenas que incorporen múltiples planos motivados:

| Global | Evento visual | Acción visible | Raccord |
|---|---|---|---|
| 0–2.70 | Material en pared | Desenrollar, alinear, aplicar lámina | Su textura conduce al plástico de embalaje |
| 2.70–6.38 | Caja/paquete | Manos con antebrazos conectados abren caja; dedo aplasta burbuja | Plano cercano de misma textura |
| 6.38–9.00 | Concepto decorativo | Transformar uso de protección a revestimiento doméstico | Elipsis temporal hacia 1957 |
| 9.00–13.70 | Inventores | Dos personas preparan cortinas y las llevan a máquina | Sus manos/sábanas permanecen en el plano siguiente |
| 13.70–16.76 | Sellado | Rodillos juntan las hojas; se forma costura | La cámara sigue el material a la unión |
| 16.76–20.00 | Aire atrapado | Membranas se curvan y levantan, aire se encapsula | Resultado final sostiene la siguiente idea |

Justificación: las frases «nació como una idea para decorar casas» y «entre las capas quedaron burbujas» cambian el objetivo visual aunque compartan narración con la escena anterior. Esto no obliga seis escenas para otros temas ni impone duración mínima.

### Sincronización observable

- «Reventás» aproximadamente 4.26–4.80 s: el contacto del dedo y el hundimiento de la burbuja deben desarrollarse allí, no después de desaparecer el gesto.
- «Sellaron» aproximadamente 13.70–14.06 s: comenzar la acción de unión dentro de ese acento, mostrando presión real durante las palabras siguientes.
- «Burbujas» aproximadamente 17.98–18.64 s y «aire» 18.78–19.06 s: la cavidad debe aumentar su volumen durante esa frase, no terminar antes de pronunciarla.

Cada plano puede anticipar o sostener una acción con intención; el ancla de voz fija el clímax, no impone una animación brusca por palabra. Para planos sin voz, registrar el silencio deliberado.

## Cambios en las puertas

- **Etapa 1:** ahora valida los tres planes reales y su concordancia con el proyecto, además de composición específica y continuidad. Un `--plan` que solo exista pero no corresponda al JSON NO pasa.
- **Etapa 2:** corroborar movimiento físico en render, no un selector ficticio. Declarar y demostrar causa/efecto.
- **Etapas 3–6:** permanecen bloqueadas si 1 falla. El usuario conserva aprobación visual final; ningún `pass:true` de auditor la sustituye.

La validación es técnica: no puede confirmar por sí sola que un brazo esté pegado al cuerpo o que una burbuja parezca real. La regla definitiva sigue siendo visualizar y corregir el MP4.
