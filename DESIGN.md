# Identidad visual — Motion Studio 6

La estética no es un tema fijo: cada video se adapta a su contenido y al estilo que el usuario elige.
Referencias del usuario: tipografía cinética rotunda, composiciones editoriales, capas
de papel e ilustración vectorial, jerarquía tipográfica, ritmo y contraste.

## Variantes de color

- **Educativo infantil**: papel marfil #FFF4D9, tinta #213A49, coral #D94834, verde #24AB9B.
- **Editorial y finanzas**: crema #F5F0E6, tinta #181C23, rojo #E84B33, azul #3159C9.
- **Tecnología**: azul petróleo #071B25, blanco #F3F6F1, turquesa #57DECE, lavanda #9A99F2.
- **Terror**: negro ciruela #120F13, marfil #F9EDEA, rojo #DC3941, gris #B9B3A8.
- **Documental**: papel #EEE9DF, tinta #20272B, rojo ladrillo #BF3F2F, azul pizarra #566B80.
- Hay otras variantes en `src/semantic-director.mjs`: minimal, watercolor, cinematic, energetic.

## Tipografía

- Titulares breves, 6–9 palabras, en **Arial Black/Impact** para voces directas;
  **Georgia** para narración editorial, cultural y dramática.
- Evitar transcribir oraciones completas en el titular, duplicar titulares como subtítulos
  o usar fuentes que dependan de Internet para funcionar en Windows.
- Texto principal fuerte (entre 49 y 77 px en 720×1280) y metadatos discretos.

## Movimiento

- Todo animado por tiempo de fotograma, sin CSS keyframes en Remotion.
- Entrada por palabras, ilustraciones por capas; una animación ambiental leve.
- Los movimientos siempre salen del contenido (células, barrera, presupuesto,
  sombra, red de nodos), nunca un «spinner» decorativo genérico.
- La composición HyperFrames utiliza GSAP pausado y clips temporizados.

## Qué no hacer

1. Repetir la misma órbita genérica en todos los temas.
2. Poner 25 palabras en un único titular.
3. Sustituir la narración, imágenes o personajes anteriores sin permiso.
4. Activar llamadas a APIs de pago automáticamente.
5. Renderizar con GPU ni concurrencia alta en equipos de 8 GB.
6. Reducir las imágenes importadas a cuadros pequeños dentro de una plantilla.
7. Prometer animación articulada de un personaje a partir de una foto plana.

## Límites

Los dibujos son vectores genéricos por categoría. No son imágenes generadas por
IA ni sustituyen las referencias de personajes del usuario. La exportación
HTML de HyperFrames incorpora imágenes y el MP3 completo dentro de 28 MB;
para diálogos separados y MP4 sincronizado se usa Remotion.
