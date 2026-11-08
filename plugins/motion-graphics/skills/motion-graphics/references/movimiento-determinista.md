# Movimiento continuo y comprobación visual

Patrón experimental adaptado de las ideas de `Barty-Bart/motion-graphics` (licencia MIT): las posiciones y estados de cada fotograma deben depender del tiempo solicitado, no del orden en que el editor los reproduce. Implementación propia en `scripts/continuous-motion.mjs`; no copiar los ejemplos del repositorio como escenas genéricas.

## Cuándo usarlo

- Para recorridos de cámara entre planos, movimiento de objetos, elementos explicativos, indicadores y transiciones por continuidad.
- Para acciones con contactos: registrar posiciones `start`/`end`, tiempo de impacto, propiedad del objeto, plano de suelo y apoyo del personaje. El arco de un objeto **no** sustituye una mano articulada ni la cinemática inversa del kit de personajes.
- Con guiones, escoger primero los **verbos observables** (abre, gira, golpea, enciende, compara). No animar palabras abstractas como si fueran objetos sin relación.

## Contrato temporal

`springTrack(initial, keys)` y `cameraPath(keys)` devuelven funciones puras `f(t)`. Pueden muestrearse en orden arbitrario: `f(4)`, `f(1)`, `f(4)` debe devolver la misma posición. La velocidad de fotogramas del editor no cambia el resultado. Los valores devueltos se convierten durante la autoría en posiciones, matrices o fotogramas CSS/GSAP cuyo estado inicial sea reproducible.

**Compatibilidad importante:** Motion Studio sigue usando su propio reloj GSAP para `customScene`. No insertar un bucle de `requestAnimationFrame`, temporizadores ni un `window.seek()` ajeno esperando que el editor lo ejecute. Preferir keyframes GSAP con `ease:'none'` para trayectorias precalculadas, ancladas al reloj de la escena, o usar las APIs documentadas por el contrato de Motion Studio. No prometer que un resorte reproducido a mano será idéntico sin probar la captura real del editor.

## Tratamiento visual antes de código

Por bloque de voz definir: `acción → reacción → evidencia visible`. Concretar actor, objeto, soporte, escala, capas, dirección de luz, encuadre de entrada y salida, y elemento que sobrevive al siguiente plano. Si no hay razón narrativa para un corte, reutilizar el mismo mundo/cámara y hacer la transición entre dos estados. Mantener una idea visual principal por beat; las capas añaden profundidad, no ruido.

## Validación obligatoria de la prueba

1. Crear hoja de contactos con poses clave y momentos de mitad de transición; no inspeccionar solo inicio y final.
2. Llamar `inspectMotion(path, {end, fps, maxStep})` para detectar saltos en unidades del lienzo. Umbrales por trayectoria y plano, no un número universal.
3. Comprobar a mano contactos, apoyos, oclusión, continuidad de luz, encuadre y sincronización con las palabras reales.
4. Comprobar, dentro de Motion Studio cuando se disponga de su motor, que el mismo fotograma se ve igual al buscar adelante, atrás y al exportar.
5. Describir claramente qué pruebas fueron estructurales y cuáles visuales. Los tests Node **no** certifican fluidez percibida ni motion blur del renderizador.

La técnica de múltiples subfotogramas para motion blur depende del renderizador. Si Motion Studio no ofrece muestreo temporal, no fingir que existe; registrar esa limitación del motor.
