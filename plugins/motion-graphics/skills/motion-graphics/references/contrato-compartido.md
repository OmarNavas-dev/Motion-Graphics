# Contrato de generación y renderizado

La revisión 1.8.1 corrige las colas de palabra menores de 20 ms al comienzo de
una escena. Los tiempos de ocultamiento y de pulso nunca deben ser negativos.
Conservar los tiempos globales originales; no desplazar la narración para
resolver un corte. Motion Studio 7.3.1 reconoce también el bloque canónico
anterior y normaliza ese caso durante la exportación.

El complemento construye la ilustración y la animación ejecutable. Motion Studio conserva ese código, controla el reloj y renderiza con HyperFrames. Las fichas de personajes y acciones no generan geometría por sí mismas.

Consultar `node scripts/capabilities.mjs` para conocer límites, FPS, campos y base temporal de la versión empaquetada. Cuando se dispone de Motion Studio, `GET /api/integrations` devuelve `sceneContract` con el mismo descriptor. No asumir acceso a un servidor local desde ChatGPT. Conservar los datos del proyecto y adaptar el código al contrato conocido, sin inventar capacidades.

El repositorio Motion Studio conserva la fuente publicada del complemento en `plugins/motion-graphics`. Antes de empaquetar cambios conjuntos, ejecutar `npm run test:ecosystem`; si cambió un módulo compartido, `npm run test:ecosystem -- --sync` actualiza las copias desde la fuente del sistema. Esta prueba debe entrar también en `npm test`.

La comprobación genera escenas mediante el ensamblador del complemento, las importa con el validador de Motion Studio, vuelve a guardarlas y exporta el HTML real. Verifica preservación de código, actores y tiempos, igualdad entre validadores y estabilidad de importaciones repetidas. Los informes mantienen separados contrato técnico, ejecución en navegador, inspección visual y MP4 verificado. Superar el contrato no aprueba los otros tres.

Para producción se requiere ejecutar el JSON final en el motor, inspeccionar los momentos de contacto y transformación y comprobar el MP4. Si el entorno bloquea alguna etapa, declararla pendiente. No certificar personajes, mecanismos ni acabado solo por la presencia de metadatos o por superar estas pruebas.

Motion Studio 7.3 permite además comparar las palabras de su MP4 con el mismo
JSON mediante `scripts/verify-render-captions.mjs` en el repositorio del sistema.
El revisor del complemento consulta `__motionStudioSceneTimelines` cuando está
disponible para auditar las escenas privadas; sus relojes numéricos no deben
confundirse con ausencia de animación. Preservar la pista por palabra aunque un
render técnico termine: su presencia en el MP4 requiere comprobación propia.
