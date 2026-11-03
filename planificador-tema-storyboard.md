# Planificador correcto: tema → narrativa → storyboard → motion graphics

El sistema solar funciona porque no empieza por una paleta. Empieza por una promesa concreta:

> Explicar el sistema solar en 30 segundos con tres datos memorables.

## Orden obligatorio

1. **Tema:** de qué habla el video.
2. **Audiencia:** qué debe entender o sentir.
3. **Promesa:** qué recordará al terminar.
4. **Narrativa:** inicio, desarrollo, comparación y cierre.
5. **Datos:** cifras verificables que sí aparecen en el guion.
6. **Storyboard:** una escena por idea, con duración y propósito.
7. **Dirección visual:** estilo, layout, color y movimiento derivados del tema.
8. **Motion graphics:** gráficos solo cuando explican la idea.
9. **Revisión:** validar continuidad, legibilidad, datos y aprobación.

## Diagnóstico del MP4 actual

El nuevo MP4 sí tiene un tema: sistema solar. Sus fotogramas muestran una secuencia coherente: título, Sol y luz, planetas rocosos, comparación de tamaños, datos rápidos y cierre. Su problema no es la ausencia de tema; es que el planificador/editor que produjo el primer demo editorial no estaba usando este flujo narrativo. Generó una demostración de estilo antes de definir contenido.

El archivo analizado es 720×1280, 24 FPS, H.264 y 30 segundos. El ejemplo `ejemplo-30s-sistema-solar.json` contiene 6 escenas `customScene` con datos, SVG y animaciones GSAP: esa debe ser la referencia de arquitectura para cualquier demo profesional.

## Contrato de salida del planificador

```json
{
  "topic": "Sistema solar",
  "audience": "público general",
  "promise": "entender tres escalas del sistema solar en 30 segundos",
  "facts": ["8 planetas", "8 min 20 s de luz solar", "Júpiter mide 11,2 Tierras"],
  "scenes": [
    {"purpose":"hook", "visual":"título + viaje", "duration":5},
    {"purpose":"fact", "visual":"Sol → Tierra + contador", "duration":5},
    {"purpose":"comparison", "visual":"órbitas + lista", "duration":5}
  ]
}
```

Sin este contrato, el sistema no debe afirmar que creó una pieza profesional: solo creó una plantilla visual.