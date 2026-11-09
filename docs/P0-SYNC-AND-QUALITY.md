# P0 — Sincronización del complemento y puerta de calidad

Motion Studio 7.4 y Motion Graphics 2.9.2 comparten el contrato de escenas. La carpeta
`plugins/motion-graphics/` de este repositorio es la **fuente canónica de publicación**.
No tratar como equivalente otra instalación que muestre el mismo número de versión:
comparar también el contenido.

## Qué se recuperó del complemento instalado

- Su flujo principal de autoría y documentos prácticos 2.9 sobre estilos, fuentes y contrato.
- Su validador `validate-2-9-contract.mjs` y las pruebas de esa interfaz.
- Sus manifestos y mensajes de inicio; solo se elevó la versión a 2.9.2.

Se conservaron de `main` los **26 documentos originales completos**, las **21 fichas
completas de estilo**, el validador ampliado de narración, las utilidades GSAP y el
contrato del sistema. Las guías resumidas no reemplazan las fuentes completas.

## Verificación de una entrega

1. Ejecutar `npm ci`, `npm test`, `npm run plugin:check`,
   `npm run test:ecosystem`, `npm run lint` y `npm run studio:build`.
2. Ejecutar `npm run accept:five:render` en un entorno con Chromium, FFmpeg
   y FFprobe. Este comando falla ante un MP4 ausente, duración o resolución
   incorrecta, audio obligatorio perdido, hojas de contacto incompletas,
   falta total de movimiento o bucle declarado con empalme rechazado.
3. Empaquetar `plugins/motion-graphics/` conservando sus rutas relativas
   y publicar **en el plugin existente** (sin duplicarlo) con versión 2.9.2.
4. Descargar o recuperar la publicación y extraerla a una carpeta temporal.
   Ejecutar:

   ```bash
   node scripts/check-plugin-package.mjs --compare /ruta/al/plugin-extraido
   ```

   Debe emitir `passed:true` y ninguna diferencia. Sin acceso a la versión
   publicada, la compilación local solo comprueba su propia fuente, no demuestra
   que ChatGPT esté actualizado.

## Semántica de las pruebas

- `npm run integration:status` informa los 33 objetivos pendientes sin ocultarlos.
- `npm run integration:gate` es la puerta de paridad **final**, actualmente roja
  por definición hasta cerrar el inventario; no se usa para impedir mejoras
  parciales sobre `main`.
- El trabajo de render de GitHub Actions **no** tiene `continue-on-error`.
  Un defecto técnico medible bloquea el workflow. Advertencias heurísticas de
  ritmo y la aprobación estética humana se informan aparte: nunca se convierten
  silenciosamente en una aprobación artística.
- Las pruebas no verifican aún todas las capacidades de los cuatro repositorios.
  La matriz normativa sigue en `docs/reference-parity.json`.
