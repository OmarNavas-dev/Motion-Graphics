# Producción comprobable: guion -> acciones -> imágenes -> correcciones
Leer junto a direccion-adaptable.md. No basta con describir «cinematográfico» en creativeBrief. La herramienta crea imágenes para revisarlas; no dibuja ni mejora el arte automáticamente y no asigna puntuaciones artísticas.

## Capacidades reales antes de prometer
Comprobar qué entorno permite leer archivos, ejecutar Node/Python, medir audio y abrir/renderizar HTML. No confundir una skill (instrucciones y archivos) con un servicio MCP de transcripción o render.
- SRT por palabra disponible: usar import-word-srt.mjs; no pedir una transcripción nueva.
- Lista de palabras JSON: usarla directamente, preservando tiempos.
- Solo audio: comprobar transcriptor disponible; transcribe.py necesita paquetes/modelo locales. El complemento no trae un modelo de voz ni un servicio alojado.
- Motion Studio disponible: review-project.mjs usa su exportador y navegador instalado; no instala dependencias.
- Sin repositorio pero con Python y Chromium/Playwright: `scripts/preview-frames.py` monta cada customScene con GSAP, captura fotogramas y avisa de selectores inexistentes y de timelines más largas que la escena. Es una comprobación de ejecución, no la exportación de Motion Studio.
- Sin repositorio: usar la vista HTML o captura real disponible en ese entorno, aplicando las mismas comprobaciones. No afirmar que review-project se ejecutó si no pudo hacerlo.
Estas limitaciones deben comunicarse concretamente. No abandonar ilustraciones que sí pueden trabajarse, ni pedir al usuario repetir material ya disponible. No reemplazar un fallo de transcripción con tiempos inventados.

## Antes de animar
Elegir una identidad por el tema y componer el fotograma de mayor información visible. Verificar silueta, pose, perspectiva, valor, foco, tamaño del personaje y zona de subtítulos a ancho de móvil.
Construir personajes y objetos con geometría suficiente para el plano. Si se ve una mano en detalle, dibujar palma, dedos, articulación y contacto; una mancha o icono genérico no cumple.
No generar primero 30 escenas con el mismo muñeco para luego intentar arreglarlas con filtros. Resolver dentro del trabajo tres momentos de riesgo: anatomía/contacto, acción principal, cambio de plano/revelación. Corregirlos y continuar con el guion completo sin pedir aprobaciones intermedias innecesarias.

## Arquitectura que evita personajes volando
Separar colocación, orientación y acción:
<g transform="translate(420 920) scale(1.2)">
  <g class="actor-action">
    <g transform="translate(-24 -160)">
      <g class="arm-action">...mano y objeto...</g>
    </g>
  </g>
</g>
La capa exterior fija no se anima. El script aplica x/y relativos al hijo actor-action. Un tween y:-30 sobre un grupo que ya tiene translate(...,920) puede sustituir su colocación, no moverlo 30px sobre el suelo.
Para extremidades, pivote en hombro/codo o coordenadas SVG explícitas. Mano, objeto y sombra de contacto deben concordar. Verificar la misma articulación al avanzar y retroceder.
No convertir la arquitectura en un nuevo aspecto universal: sirve igual para otra estética.

## Acciones por fases, no un traslado
Anotar para cada acción: preparación -> contacto/esfuerzo -> reacción -> asentamiento -> consecuencia.
El cuerpo no es una sola pieza que gira. Los cambios pertinentes afectan brazos, torso, cabeza, piernas u objeto según la acción.
Dar masa y aceleración adecuadas, con impulso y recuperación cuando corresponda. No copiar la regla de usar rebote/springs en todo: horror, textos, objetos pesados y mecanismos requieren tratamientos diferentes. Una pausa de suspense también es una decisión válida.
Calcular el final de repeat/stagger: inicio + duración*(repeat+1) + retraso máximo <= D. No acelerar el audio o la timeline para esconder animaciones demasiado largas.
Mantener subtítulos en una capa fuera de cámara. Derivar todo movimiento del tiempo reproducible, sin reloj, setInterval o azar.

## Ejercicios ejecutables
assets/motion-lab.json contiene contacto con reacción, puerta con bisagra y mecanismo con impulso. Es un laboratorio de componentes sin narración ni subtítulos, no un proyecto terminado ni una estética para todos los temas.
Estudiar jerarquía, pivote y relación entre piezas. Redibujar las formas para el relato y reprogramar el ritmo según su audio. No pegar estas tres escenas en cualquier historia.

## Capturar y comprobar
Ejemplo (rutas del entorno de ejecución actual):
node scripts/review-project.mjs proyecto.json --repo RUTA_MOTION_STUDIO --out revision-nueva --browser RUTA_NAVEGADOR --times 1.18,1.4,22.65
--times agrega instantes globales específicos de contacto/revelación; --scenes id1,id2 permite una revisión de trabajo parcial. La revisión final debe cubrir todo el proyecto.
Genera:
- PNG del 10%, 50% y 90% de cada escena, más instantes pedidos.
- review.html con imágenes a ancho de móvil.
- report.json con duración efectiva, errores de ejecución, texto fuera del lienzo, posiciones de actores, prueba de búsqueda temporal en una muestra y avisos de construcción.
Los avisos por pocas operaciones o transform no son prueba de mala calidad: revisar el caso. Un PNG determinista no certifica todo el video, ni una imagen certifica un movimiento.
La herramienta NO escucha ni verifica por sí sola la alineación de voz, anatomía, expresividad o calidad narrativa. Mantiene artisticReview pendiente aunque runtimePassed sea true.

## Revisión visual con evidencia
Abrir realmente los PNG de los momentos esenciales y una vista global del montaje; luego los momentos rápidos en secuencia densa con --times. No afirmar haber revisado imágenes sin abrirlas.
Por cada defecto registrar: escena, tiempo, evidencia, resultado esperado, cambio y resultado tras recapturar. Elegir los tres problemas de mayor impacto por iteración, corregirlos y comprobar de nuevo.
Revisar especialmente: personajes sin apoyo, tamaños absurdos, sombras incongruentes, manos sueltas, movimiento rígido, planos vacíos, oclusión del sujeto, mirada incorrecta, excesiva repetición y saltos entre poses.
La corrección debe verse en la nueva captura. No cerrar el defecto por modificar el código solamente. No autoaprobar con una nota numérica inventada.
Conservar los reportes y capturas como trabajo interno y entregar el único JSON final que pide el usuario. Si quedan defectos o no fue posible comprobar una parte, decir cuáles.

## Alineación y trazabilidad
El importador SRT preserva start/end y registra una huella del archivo, pero alignmentVerified=false: recibir un SRT no prueba que corresponda al MP3.
Comparar su duración y contenido con el audio suministrado. Si los tiempos parecen repartidos mecánicamente, señalar la sospecha y verificar con una herramienta disponible; no certificar ni descartar solo por el patrón.
Nunca cambiar los tiempos de voz durante una corrección de ilustración. Conservar el JSON original y guardar una versión nueva.


## Movimiento verificable (1.9)
Leer animacion-transversal.md. Los puntos de control de scene.sequence() viajan con el mismo codigo a Motion Studio 7.4 y se comprueban al avanzar y retroceder. Su ausencia no convierte un JSON historico en invalido. Su presencia exige que los estados coincidan con la ejecucion real. Ninguna cantidad de efectos sustituye la inspeccion visual. Los temas de la prueba transversal son casos internos de regresion; no limitan lo que puede crearse.
