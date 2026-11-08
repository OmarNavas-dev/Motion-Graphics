# Integración Motion Studio 7.4 + Motion Graphics 2.7

Esta rama integra los módulos de autoría del complemento Motion Graphics 2.7 con el código de Motion Studio 7.4. Mantiene las funciones propias de la versión 7.4, como anclajes de narración y exportación HyperFrames/Remotion.

## Añadido

- 16 generadores de escenas SVG/GSAP y galería importable `plugins/motion-graphics/skills/motion-graphics/assets/effects-16-validation.json`.
- Dirección creativa LOOK/MOVES, planificación del guion y auditoría estática de composición.
- Interpolación de formas, cinemática inversa para dos articulaciones, trayectoria con apoyo fijo de pies, contacto mano-objeto y verificación de deslizamientos.
- Comparador temporal entre un MP4 de referencia y el exportado, sin confundir energía de píxeles con criterio artístico.
- Preflight ligero de escenas HTML/GSAP en `src/custom-scene-preflight.mjs`: detecta selectores simples ausentes y IDs duplicados dentro de la escena o entre escenas **antes** de abrir la etapa de render. Los selectores CSS compuestos se verifican en el navegador.

## Ensayo local

```
npm ci
npm test
npm run lint
npm run studio:build
```

Para verificar efectos, importar `effects-16-validation.json` desde el editor, ejecutar la revisión, aprobar explícitamente las escenas y exportar con HyperFrames. La galería dura 41,2 segundos, no tiene voz, y está diseñada para diagnosticar las 16 familias por separado, no para contar un relato.

## Límites pendientes de prueba

- El MP4 real depende de Chrome, HyperFrames y FFmpeg en el equipo que ejecute Motion Studio. Superar las pruebas Node no prueba esos tres componentes.
- La inspección de píxeles no sustituye la comprobación visual de personajes, contactos, direcciones de cámara y cohesión narrativa.
- No se activó música automática, efectos remotos ni APIs de pago.
- El renderizador no se transforma en una IA generativa. Los SVG y guiones deben seguir diseñándose con calidad editorial y revisarse en video.

## Regresión histórica

La revisión estática informa un solo error útil por selector ausente (`v03: .world`, por ejemplo), evitando esperar a que se repita en múltiples muestras de tiempo. No altera los JSON válidos ni sus tiempos; la comprobación del navegador sigue siendo la fuente final de errores de ejecución.
