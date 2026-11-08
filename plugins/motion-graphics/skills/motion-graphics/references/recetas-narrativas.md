# Recetas narrativas para videos cortos (de dato, cronología e hipótesis)

Derivadas de seis referencias verticales analizadas por fotogramas, subtítulos en pantalla y conteo de cortes (no por audio). Son estructuras de partida, no cuotas: distinguir siempre observado, inferido y desconocido.

## Observado en las seis referencias

- Una sola idea por video; duración de 47 a 62 s en cuatro de ellas y de 106 a 112 s en las dos largas.
- Gancho en el primer plano: un dato extraño o contraintuitivo, sin saludo ni presentación.
- Cada frase tiene su imagen: un objeto o escena por idea, sin relleno.
- Anclas numéricas visibles (años, edades, días, kilómetros, porcentajes) en placas o contadores.
- Subtítulo progresivo (palabra activa blanca, anteriores atenuadas) y cifras con recuadro.
- Entre 0 y 11 cortes de escena; el movimiento vive dentro de la escena (rótulos, contadores, cámara).
- Cierre breve: «Seguir» con logotipo o «PARTE 2» cuando el tema se divide.

## Receta A — Dato con prueba (estilo Un Cristiano Inquieto, 50–65 s)

1. **Gancho (0–4 s):** el dato más extraño, con su objeto en pantalla.
2. **Contexto (4–15 s):** quién, cuándo, dónde; una placa con año (`chip`).
3. **Prueba (15–40 s):** 2 o 3 evidencias, cada una con un objeto distinto (`parchment`+`waxSeal`, `openBook`, `closeUp`, `eye`).
4. **Giro (40–55 s):** la implicación que cambia la lectura del dato.
5. **Cierre (últimos 4–5 s):** `endCard`.

Kits: `nave`, `closeUp`, `parchment`, `waxSeal`, `stamp`, `openBook`, `eye`, `chip`, `petals`.

## Receta B — Cronología de supervivencia (estilo Datos Curiosos, 60–110 s)

Capítulos numerados (`chapterBadge`) con contador de días (`counter`) y un medidor (`meterBar`) que cambia en cada uno. Cierra con «PARTE 2» si el relato se divide. Kits: `skyCycle`, `ocean`, `boat`, `oceanFront`, `chapterBadge`, `counter`, `meterBar`, `endCard`.

## Receta C — Hipótesis con reloj (estilo ESPEZMAN, 45–60 s)

Un solo escenario fijo (`cellRoom`) y un personaje (`puppet`); la variación viene de rótulos: `stopwatch`, `heartRate`, símbolos de alerta. Kits: `cellRoom`, `puppet`, `stopwatch`, `heartRate`, `tag`.

## Receta D — Cómo empezó (mecánica, 60–110 s)

Parte de lo cotidiano y escala por problema y solución hasta el resultado. Kits mecánicos existentes (`mechanism-kit`, `materials-kit`, `fx-kit`) y `examples/laboratorio-mecanico.mjs`.

## Cómo anclar

Con palabras temporizadas reales, anclar cada placa y cada golpe a la palabra que lo nombra con `scripts/timing-anchors.mjs`. Sin tiempos reales no se afirma sincronización.
