# Receta profesional v4: contrato de producción y aceptación

Esta referencia obliga a producir **acontecimientos visuales verificables**, no una sucesión de etiquetas, zooms y fondos. Aplica a inventos, ciencia, historia, curiosidades y cualquier otro tema; el estilo debe depender de su contenido y de referencias concretas, no de un preset repetido.

## Doce pasos y entregables verificables

| Paso | Trabajo | Evidencia necesaria | Rechazo |
|---|---|---|---|
| 1 Investigar | Identificar hechos, mecanismo y afirmaciones | Fuentes o guion del usuario; separar dato de interpretación | Hechos inventados o mecanismo incomprensible |
| 2 Guion | Descomponer en eventos visualizables | Narración definitiva con duración real | Frases importantes sin representación |
| 3 Referencias | Revisar visual y temporalmente los MP4, SVG e imágenes disponibles | Observaciones de LOOK y MOVES con segundos/fotogramas | Copia superficial sin comprender la acción |
| 4 Dirección | Elegir estilo, escala, cámara, tipografía, luz y sonido | Biblia visual con zonas seguras y razones por plano | Presets de zoom o paleta repetidos sin función |
| 5 Storyboard | Planificar acciones, contactos, resultados y raccord | `storyboard.json` v3, auditado antes de construir | Falta actor, causa, consecuencia o tiempo |
| 6 Objetos | Construir identidad, anclajes, geometría y capas | SVG/HTML con plano trasero, objeto, interior y frontal correctamente ordenados | Objeto flotante, desproporcionado o tapado por una sola capa |
| 7 Animación | Programar acción y consecuencia, no solo transformación decorativa | GSAP determinista y selectores reales para cada fase | Contacto aparente sin cambio físico o desplazamiento lateral no planeado |
| 8 Audio y texto | Sincronizar por SRT real y separar subtítulos de etiquetas | wordTimings, audio asociado cuando exista, márgenes y contraste | Palabras no visibles, subtítulos sobre etiquetas, Foley aleatorio |
| 9 Piloto | Construir 8–12 s de la acción más difícil en videos >15 s | MP4 real de piloto o `VISUAL_PENDIENTE` | Continuar producción sin comprobar el contacto difícil |
| 10 Revisión | Examinar inicio, máximo, contacto, fin y reproducción continua | Fotogramas y observaciones de defectos por tiempo | Declarar aprobado con solo JSON válido |
| 11 Montaje | Completar escenas y comprobar raccord, duración y ritmo | JSON total, continuidad de activos, cámara motivada y audio | Tamaños cambiantes, cortes que rompen acción, ciclos genéricos |
| 12 Entrega | Ejecutar auditores, resolver errores, identificar limitaciones | JSON, activos, reporte de validación y estado de revisión | Afirmar render/homologación no realizada |

## Control geométrico de objetos y embalajes

- Proyectar la abertura en coordenadas del mismo sistema que el objeto. El centro del objeto debe coincidir con el centro de su trayectoria durante ascenso y descenso, salvo una desviación motivada.
- Orden de profundidad sugerido: fondo → pared trasera → interior → objeto → protección → frente/solapas. Si el SVG es indivisible, crear capas delanteras reales o una máscara cuya silueta coincida con la abertura, **y comprobar el render**. No inventar clip triangular aproximado como sustituto de la apertura.
- El objeto debe permanecer dentro de las dimensiones físicas plausibles del contenedor durante el contacto. Una ampliación de cámara no debe escalar las etiquetas ni subtítulos fijos.
- Animación reversible: registrar centro `x` y posición `y` en inicio, máximo y fin; comparar fotogramas. El regreso debe usar el mismo eje si así lo exige la narración.
- No simular envoltura solo colocando una tarjeta de círculos delante del objeto: mostrar aproximación del material, adaptación a superficie y resultado protector. Si no es posible, simplificar la escena y declarar la limitación.

## Dirección de cámara

Cada plano requiere `target`, `purpose`, razón y verificación de márgenes. Plano general establece relación; medio muestra interacción; detalle explica un contacto; dolly sigue la atención; paneo sigue desplazamiento. Un zoom que corta una etiqueta, un sujeto o un subtítulo fracasa aunque el mecanismo se vea más grande. Preferir cámara estática cuando el detalle técnico exige leer trayectorias.

## Subtítulos y sonido

Los subtítulos usan tiempos reales de palabra cuando existen. Diferenciar palabra activa de palabras vecinas; no confundir cursiva/subrayado decorativo con legibilidad. Reservar zona superior o inferior según solicitud y mantener etiquetas alejadas. Audio de voz, efectos y música no pueden declararse sincronizados si no hay recurso inspeccionable. Foley únicamente en acciones observables.

## Estados de avance

- `PLAN_PENDIENTE`: falta storyboard válido o referencia de tiempo.
- `CODIGO_PENDIENTE`: falta implementar actores/acción causal.
- `VISUAL_PENDIENTE`: JSON válido pero no hay render inspeccionado.
- `CORRECCION_NECESARIA`: evidencia muestra oclusiones, saltos, mala física, títulos cortados o pérdida de identidad.
- `APROBADO`: todas las puertas con evidencia real de render y aprobación explícita del usuario/revisor.

Jamás cambiar `approved` a `true` mediante validación sintáctica. Cuando la herramienta de revisión o el audio estén ausentes, entregar un candidato honesto con defectos pendientes, sin afirmar cumplimiento visual.
