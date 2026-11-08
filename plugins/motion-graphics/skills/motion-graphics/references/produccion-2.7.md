# Pipeline visual activo, versión 2.7

Se incorporan implementaciones SVG+GSAP independientes de 16 familias (`scripts/kits/effects-16-kit.mjs`), cinemática 2D (`scripts/kinematic-motion.mjs`) y comparación de fotogramas (`scripts/compare-video-motion.py`). Se inspiran en ideas de los cuatro repositorios estudiados, sin copiar sus assets ni sus marcas.

## Dieciséis efectos ejecutables

`buildEffectScene(effectId,{id,duration,accent,background,label})` devuelve escenas `customScene.html/css/script` válidas. El catálogo es una **biblioteca de patrones**; escoger por función narrativa, no añadirlo indiscriminadamente. `examples/build-effects-gallery.mjs` crea `assets/effects-16-validation.json`, una galería de 16 escenas independientes que sirve para probar importación, GSAP y render. No equivale a un relato cinematográfico ni prueba continuidad entre personajes.

## Cinemática y contacto

`twoBoneIK` calcula brazos y piernas de dos segmentos, `reachToObject` mantiene anclaje de mano con objeto y detecta inalcanzables, `gait2D` alterna apoyos deterministas en mundo e `inspectGait` detecta resbalones. Dibujar el personaje completo con puppet/rig, incluyendo volumen, ropa, oclusiones, torso, rostro, orientación, poses y desplazamientos; los puntos de IK no dibujan anatomía por sí solos.

## Comparación temporal de referencia

Ejecutar `python3 scripts/compare-video-motion.py render.mp4 --reference referencia.mp4 --fps 6`. El informe calcula cambio promedio de píxeles, principales cambios, quietudes y correlación de ritmo normalizada. **No mide narrativa, anatomía, fidelidad artística, sonido ni estilo**, y no convierte ritmos diferentes en defectos automáticamente. El video de referencia puede tener otra duración; la correlación solo sirve como señal de revisión. Abrir fotogramas del render exportado y escuchar voz.

## Verificación integral

1. `node examples/build-effects-gallery.mjs` para recrear 16 escenas de diagnóstico.
2. `node scripts/validate-project.mjs assets/effects-16-validation.json` y `node --test tests/*.test.mjs`.
3. Importar la galería en Motion Studio, pulsar **Comprobar ejecución y tiempos**, exportar y observar una por una.
4. Ejecutar comparación de video y hoja de contactos, corregir defectos, repetir.
5. Después probar 10–15 segundos de un relato real con 2–3 acciones y continuidad de objetos. La galería no sustituye esta prueba.

No hay un motor autónomo de aprendizaje/corrección visual: existen detectores técnicos y métricas que deben alimentar decisiones de rediseño. El renderizador de Motion Studio sigue separado del complemento y la exportación solo puede certificarse en ese host.
