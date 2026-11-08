# Integración de las cuatro referencias: alcance verificable

**Estado: NO COMPLETA. No pedir al usuario una prueba de aceptación final.** El repositorio conserva aquí la lista completa de capacidades identificadas y la evidencia de implementación por módulo. `npm run integration:status` informa los huecos y `npm run integration:gate` devuelve un fallo hasta que la integración sea verificablemente completa.

Fuentes revisadas: [Barty-Bart](https://github.com/Barty-Bart/motion-graphics), [whaleyxbt](https://github.com/whaleyxbt/claude-motion), [ItsssssJack](https://github.com/ItsssssJack/claude-video-2) y [charlie947](https://github.com/charlie947/motion-graphics-skills). Los cuatro publican licencias MIT para código, pero recursos específicos (fuentes, videos, efectos, modelos, medios externos) requieren verificar licencias aparte.

El inventario `reference-parity.json` es normativo: `verified` requiere implementación **y pruebas**; `partial` significa que existe una porción real; `missing` indica trabajo por implementar; `external` significa dependencia de software externo, GPU, credenciales o licencias; `notApplicable` solo si se documenta una exclusión razonada.

**Aclaración:** 219/219 pruebas y 5/5 MP4 anteriores solo verificaron el alcance anterior, no equivalencia global. Ninguna prueba superficial, README, interfaz o receta demuestra integración plena. La meta incluye ciclo continuo de generación, render, inspección, corrección, nuevo render y evidencia artística. Las pruebas internas se seguirán usando para evitar regresiones; una prueba de aceptación del usuario no se considerará pertinente hasta que este inventario esté resuelto.
