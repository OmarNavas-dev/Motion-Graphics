# Alcance de la comprobación 2.0

Se ejecutaron 37 pruebas Node, incluidas las 26 anteriores. Pasaron conservación de subtítulos, contacto, fases, cinemática, apoyos de marcha, anclajes a palabras, rechazo de ambigüedades, presupuesto de población, detección de excesos y comparación de píxeles.

Se ensamblaron seis estudios originales silenciosos de 6 segundos cada uno mediante examples/reference-families.mjs. Pasaron los validadores Python y Node. En Chromium con GSAP real se capturaron 90 muestras, comprobando cada imagen tras saltos temporales; runtimePassed:true, sin errores. Se abrieron las imágenes de dormitorio, curva, criatura, población, ADN y marcha. La comparación permite únicamente un nivel de redondeo por canal de color, y registra el valor observado. No hay tolerancia de desplazamiento geométrico declarada.

En una prueba de uso independiente se creó una escena nueva de 8 segundos: una persona sentada se levanta, da dos pasos y mira una gráfica. Ambos validadores pasaron y se revisaron 51 capturas a 6 muestras/s. Una auditoría de 801 poses no encontró penetración del suelo y comprobó el apoyo fijo. Esta prueba usó la habilidad y sus recursos sin modificar el complemento.

reference-analysis.py se ejecutó sobre un MP4 adjunto y produjo fotogramas con tiempos y hoja de contactos. compare-frames.py produjo una comparación emparejada. El error de píxeles no se utilizó como certificado artístico.

Estas comprobaciones son de autoría, contrato empaquetado y DOM/GSAP. No se tuvo acceso al repositorio vigente de Motion Studio para verificar su exportador ni se exportó MP4. Los estudios son silenciosos: no prueban alineación de una voz nueva ni el tratamiento de sonido. Las pruebas anteriores de captions se conservaron; cada proyecto narrado necesita sus palabras y audio reales. No se ha demostrado igualdad artística con las referencias ni generación automática de cualquier video imaginable. La revisión visual de cada encargo sigue siendo necesaria.
