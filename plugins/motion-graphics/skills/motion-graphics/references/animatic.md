# Animatic con narración y revisión de empalmes

1. Medir la voz con FFprobe. Escribir el storyboard v3 con los acontecimientos, encuadres, estados de entrada y salida y tiempos del audio. Usar el mismo límite al milisegundo para el cierre de una escena y el inicio de la siguiente. Si existe una alineación por palabra, conservar sus tiempos globales y declarar el ancla de cada plano.
2. Agregar a cada escena `draft: {html, css, script}` con formas y movimiento suficientes para leer la acción. El script utiliza la misma API temporal GSAP de las escenas de Motion Studio. Usar recursos locales admitidos por el proyecto. El render de revisión no reproduce video B-roll embebido.
3. Declarar en `continuity` los empalmes que deben mantener un objeto visualmente continuo. `from` y `to` son IDs de escenas adyacentes. Cada objeto tiene un `id` y selectores únicos `exit` y `entry` en sus escenas respectivas. Dejar fuera los cambios intencionales de posición, tamaño o aspecto que no deban evaluarse como empalmes.

```json
{
  "continuity": [{
    "from": "escena-a",
    "to": "escena-b",
    "objects": [{"id": "anillo", "exit": ".anillo-salida", "entry": ".anillo-entrada"}]
  }]
}
```

4. Ejecutar desde la raíz del repositorio de Motion Studio, con las dependencias instaladas, FFmpeg, FFprobe y Chromium disponibles. Usar `--browser RUTA` si hace falta indicar el ejecutable. La carpeta de salida debe ser nueva y su carpeta padre debe existir.

```bash
npm run animatic -- --storyboard storyboard.json --script guion.txt --voice voz.m4a --out salida-animatic
```

Con alineación real, añadir `--words palabras.json` con el arreglo de tiempos globales o un objeto que lo contenga en `words`. Los subtítulos quedan desactivados si se omite. El MP4 incluye la voz. Para seguir editando el JSON en Motion Studio, importar también la voz original.

Para revisar un proyecto ya exportado, se acepta un archivo de planificación con solo `continuity`. Usar el JSON exacto que generó ese MP4.

```bash
npm run animatic -- --storyboard empalmes-plan.json --project proyecto.json --video render.mp4 --out salida-revision
```

5. Abrir el MP4 y `empalmes.json`. El informe incluye los dos fotogramas extraídos del MP4 y mide el desplazamiento del centro (fracción del lado menor del lienzo), el cambio relativo máximo de ancho o alto y la diferencia media RGB de las zonas del objeto (0–255). Cada objeto puede ajustar `tolerance: {position, scale, appearance}` si el plano lo requiere y se documenta el motivo. El código 2 indica salto o falta de evidencia de un objeto, el 1 indica fallo de ejecución. `not-declared` indica que el storyboard no pidió medir empalmes. Verificar en movimiento también la acción, la oclusión y la transición. La medición solo cubre los empalmes declarados y conserva el estado editorial de aprobación.
