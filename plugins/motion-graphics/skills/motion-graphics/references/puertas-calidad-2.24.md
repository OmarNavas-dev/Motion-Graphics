# Producción por seis puertas de calidad (2.24)

**Extensión 2.29:** leer [direccion-cinematografica-2.29.md](direccion-cinematografica-2.29.md). La puerta 1 ejecuta audit-cinematic-composition.mjs y la regresión test-stage1-cinematic.mjs. Rechazar cámara clonada sin razón y descripciones de acciones de relleno aunque los selectores y dibujos existan. Revisar un piloto difícil sin subtítulos antes de extender el montaje, si hay motor de render. Las advertencias requieren inspección; una aprobación estructural no certifica calidad perceptual.

**En 2.25 la puerta 1 incorpora una exigencia adicional:** seguir [composicion-especifica-2.25.md](composicion-especifica-2.25.md), entregar composition-plan.json y ejecutar audit-specific-composition.mjs. El gate necesita --composition-plan composition-plan.json. No se puede superar con solo reescribir objetivos.

Orden estricto: 1 composición específica → 2 acción causal → 3 ilustración y materiales → 4 cámara y raccord → 5 revisión visual comparativa → 6 auditoría final de planificación. La planificación detallada se prepara ANTES de construir, pero la puerta 6 verifica al final que lo ejecutado coincide con ella. Ninguna etapa posterior se trabaja, aprueba o anuncia como superada mientras una anterior siga en `blocked` o `pending`.

En cada etapa, conservar evidencia con el esquema `motion-studio.stage-evidence/1` en un JSON separado. Ejecutar `node scripts/gate-sequential-quality.mjs proyecto.json --evidence evidencia.json [--reference referencia.mp4] [--render video.mp4]`. El validador devuelve `blockedAt`, razones y próxima acción, con salida distinta de cero si está bloqueado. Es un filtro de estructura y trazabilidad, no una calificación estética automática. No usar cantidades fijas de objetos, texturas, encuadres o movimientos como sustituto de calidad.

1. **Composición no genérica.** Cada plano explica un acontecimiento específico mediante `objective` con sujeto, acción y cambio observable. Rechazar `Mostrar mediante una acción visible: ...`, títulos reetiquetados, activos intercambiables, duplicaciones y el mismo preset sin reautoría. Evidencia: desglose de referencias y capturas de la composición; `stages["1"].reviewerApproved` solo si fueron inspeccionadas.
2. **Acción causal ejecutable.** Identificar estado inicial, contacto o causa, cambio visible y estado final; crear elementos SVG/HTML concretos, movimientos en reloj GSAP y selectores que existan. Una acción exclusivamente `.camera`, captions, fades de títulos o transformaciones de toda la escena NO cumple. Evidencia de inicio, mitad y fin de las acciones principales, incluida búsqueda hacia atrás.
3. **Ilustración construida.** Revisar silueta, geometría, oclusión, materiales, iluminación, textura y perspectiva donde el tema lo necesita; no obligar a usar efectos decorativos en composiciones deliberadamente planas. Evidencia con fotogramas de alta resolución y notas de deficiencias corregidas. `reviewerApproved` no se infiere de la presencia de gradientes.
4. **Cámara y continuidad.** Comprobar el propósito de cada plano, su encuadre, movimiento, lectura, cortes y raccord. Un único zoom idéntico en todas las escenas se investiga, no se aprueba automáticamente. Registrar por qué se mantiene un plano fijo si es intencional. Comprobar trayectorias continuas y duración total.
5. **Comparación visual real.** Inspeccionar un MP4 exportado y fotogramas críticos de la referencia, con una tabla de problemas por escena/tiempo y acciones correctivas. Sin MP4 o referencia inspeccionable: `pending`, nunca `pass`. Métricas de similitud y validadores técnicos son ayudas, no sustituyen revisión visual. Registrar aprobación humana explícita, evidencia local y limitaciones.
6. **Auditoría de planificación ejecutada.** Comparar `plan.json`, `beats.json` y `mechanics.json` validados con las escenas y timings finales. Rechazar objetivos vacíos/genéricos y `direction.actions` que no representen lo que se ve. Reejecutar validadores de IDs, contrato 2.9, GSAP y revisión runtime. Solo se declara `ready` si las cinco puertas anteriores pasan y la sexta está documentada.

## Contrato de evidencia

```json
{
  "schema":"motion-studio.stage-evidence/1",
  "stages":{
    "1":{"reviewerApproved":false,"notes":"","artifacts":[]},
    "2":{"reviewerApproved":false,"notes":"","artifacts":[]},
    "3":{"reviewerApproved":false,"notes":"","artifacts":[]},
    "4":{"reviewerApproved":false,"notes":"","artifacts":[]},
    "5":{"reviewerApproved":false,"notes":"","artifacts":[]},
    "6":{"reviewerApproved":false,"notes":"","artifacts":[]}
  }
}
```

`artifacts` contiene rutas locales existentes a evidencias producidas en esta ejecución, no nombres inventados. `notes` describe observaciones concretas; `reviewerApproved` no se establece por el propio generador para eludir revisión. Todo cambio posterior a una etapa aprobada invalida como mínimo las aprobaciones dependientes; rehacer capturas y volver a pasar las puertas afectadas. Guardar el resultado del gate y el hash del JSON junto al informe.
