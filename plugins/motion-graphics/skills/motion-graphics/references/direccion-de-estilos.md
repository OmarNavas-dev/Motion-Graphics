# Dirección visual adaptable: una sola gramática por proyecto

Estudiado de `ItsssssJack/claude-video-2` (estilos, especificaciones y revisión),
`whaleyxbt/claude-motion` (guion de beats, easing y disciplina editorial), y
`Barty-Bart/motion-graphics` (continuidad de objetos y cámara). Estos repositorios
son referencias técnicas MIT; este complemento NO trae sus renders ni sus engines.

## Fase previa obligatoria

1. Elegir una **gramática visual** según el contenido y las referencias aportadas.
   El usuario puede escoger una estética; si no, justificar la elección por el
   fenómeno, audiencia y canal. No aplicar un único estilo oscuro a todo.
2. Definir tokens reutilizables: fondo, tinta, acento con función semántica,
   tipografías, grosor de contornos, materiales, luz, márgenes, curvas de easing,
   amplitud de gestos, ritmo y elementos prohibidos.
3. Crear una tabla de acciones desde el guion: causa → transformación física →
   consecuencia → evidencia visible. Cada acción necesita sujetos, contactos,
   anclas y estados observables; no generar un SVG finalizado y después moverlo.
4. Decidir cuáles de las 21 familias de look pueden aportar vocabulario, no copiar
   su pieza de ejemplo. Seleccionar una sola dirección y mantenerla en cada plano.

## Familias de referencia de Claude Video 2.0

Estilos escénicos: `paper-world`, `ink-line`, `weather-widget`, `data-story`,
`swiss-kinetic`, `particle-field`, `growing-city`, `explainer-diagram`,
`time-travel`, `editor-ui`, `motion-app-ui`, `design-app-ui`, `audio-app-ui`.

Estilos de código: `swiss-grid`, `editorial-paper`, `midnight-grid`,
`paper-cut`, `risograph`, `blueprint`, `graphite-ui`, `poster-pop`.

**No equivalen a un plugin de formatos fijos**: `paper-world` favorece hojas,
profundidad y parallax para relatos; `explainer-diagram` favorece un protagonista
que viaja entre estaciones y activa sus reacciones; `data-story` une números,
indicadores y la gráfica a una misma fuente; `blueprint` dibuja piezas, juntas y
un despiece con correspondencia geométrica. El resto sirve para inspirar una
dirección cuando la historia y la referencia lo pidan.

## Números de partida, no cuotas rígidas

| Propiedad | Guía | Adaptación |
|---|---|---|
| Entrada de texto/objeto | 0.5–0.8 s con `power3.out` | No siempre debe entrar algo |
| Salida | 0.25–0.45 s con `power2.in` | Puede no haber salida |
| Traslado de cámara | 0.6–1.2 s con `power2.inOut` | Seguir la acción o quedarse quieta |
| Lectura | ≥1 s para frase corta | Mayor para densidad o audiencia infantil |
| Stagger de letras/palabras | 0.07–0.10 s | Solo cuando el texto sea narrativo |
| Márgenes | Revisar también a escala de teléfono | Tener en cuenta la zona real de captions |

Para una pieza contemplativa, aumentar descansos. Para procesos rápidos, concentrar
beats. Nunca repartir el audio en fragmentos arbitrarios de 5 s, ni hacer que cada
frase aparezca con el mismo efecto.

## Continuidade y cámara

- Cada escena parte del estado de salida anterior cuando representa el mismo lugar.
- Identificar **ancla persistente** (mano, gota, lava, señal, libro, luz), o un
  corte explícitamente motivado. La cámara sigue un fenómeno, no la narración abstracta.
- Planos a distinta escala conservan proporción, orientación y punto de referencia.
- Los cortes no tienen que desaparecer: la continuidad puede ser por forma, color,
  dirección, objeto, sonido o causa observable.
- El SVG puede tener muchos grupos; que existan grupos NO prueba jerarquía física.
  Definir anclas, parents, articulaciones, capas de oclusión y dependencia.

## Calidad y honestidad

- Aceptar un plano solo después de revisar imágenes de entrada, contacto, momento
  medio y salida; detectar solapes, jerarquía, legibilidad, siluetas y cambios bruscos.
- Un héroe visual por beat; más efectos no compensan geometría pobre.
- Mantener números tomados de fuentes reales. No inventar marcas, estadísticas,
  logos, testimonios o datos por completar una composición.
- Si hay recursos reales (fotos/video), tratarlos como opcionales y autorizados;
  el uso de modelos externos y créditos requiere permiso, y el JSON no promete
  guardar archivos binarios que Motion Studio no admita.
- Los filtros visuales, motion blur con subfotogramas, 3D/WebGL, chroma y separación
  SAM2 solo pueden usarse cuando el motor y las dependencias reales los soporten.
  No incluirlos en el JSON como si su soporte estuviese confirmado.
