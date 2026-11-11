# Etapa 1: identidad y continuidad entre escenas (2.28)

## Problema observado

El proyecto puede conservar fondo, colores y tipografía, pero redibujar de manera independiente personajes, manos, máquinas, lámina de burbujas y cajas en cada escena. Eso produce saltos de silueta, proporciones, escala y materiales. Consistencia de paleta no es consistencia de identidad.

## Regla de producción

Antes del primer customScene, identificar los activos persistentes y crear continuity-plan.json con esquema motion-studio.continuity-plan/1. Cada asset lleva assetId estable, appearanceToken, modelToken y occurrences con sceneId y selector. El mismo personaje/objeto mantiene identidad cuando pasa de una escena a otra. Cambios de posición, pose y cámara no redefinen su cuerpo ni sus materiales. Si se transforma físicamente (p. ej. lámina plana se convierte en envoltorio), documentar transformationReason y mostrar el proceso o raccord.

Para los modelos que aparecen varias veces, usar scripts/shared-scene-assets.mjs durante la autoría: registrar una sola geometría SVG, instanciarla en las escenas y cambiar transformaciones externas. El generador añade data-dvj-asset, data-dvj-appearance y data-dvj-model. Cada instancia prefija los IDs internos de SVG por escena para evitar colisiones de gradientes, máscaras y clipPath. Para variantes articuladas, generar un rig con identidad estable o documentar explícitamente la transformación; no reconstruir de cero una figura diferente y atribuirle la misma identidad.

### Ejemplo de plan

    {
      "schema":"motion-studio.continuity-plan/1",
      "assets":[{
        "assetId":"rollo-plastico",
        "appearanceToken":"polimero-azul-v1",
        "modelToken":"hash-de-geometria-autorizada",
        "occurrences":[
          {"sceneId":"taller-1957","selector":".rollo"},
          {"sceneId":"embalaje","selector":".rollo"}
        ]
      }]
    }

modelToken debe proceder de la función register de shared-scene-assets, no inventarse. Las escenas cuyo objeto cambia genuinamente de naturaleza pueden usar otro assetId o una transformationReason clara y geometría compatible. Si no existe ningún activo persistente, justificar noPersistentAssetsReason sin usarlo para eludir una historia que sí repite sujetos.

## Revisión de continuidad

1. Inventariar personajes, objeto principal, equipo informático, material y escenario según su recurrencia real. Un personaje secundario no necesita repetirse si su papel termina.
2. Fijar silueta y proporciones de cada activo (hoja de modelo), materiales, escala relativa y puntos de anclaje. Conservar esos rasgos en cada aparición.
3. Ejecutar node scripts/audit-visual-continuity.mjs proyecto.json continuity-plan.json y node scripts/test-stage1-continuity.mjs.
4. Revisar una hoja de contactos con fotogramas de todas las apariciones de cada asset. Comparar visualmente rasgos y proporciones, no solo tokens.
5. Si hay drift, corregir la escena discrepante y regenerar el MP4. No aprobar etapa 1 hasta comprobar continuidad.

El auditor comprueba identidad declarada y presencia en HTML, no la igualdad perceptual. Un modelo no puede autoaprobar su propia estética. Para cualquier temática aplicar la misma regla a objetos persistentes, sin obligar a reutilizar geometría cuando la historia cambia legítimamente.
