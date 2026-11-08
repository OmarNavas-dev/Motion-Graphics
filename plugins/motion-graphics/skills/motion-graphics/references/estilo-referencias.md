# Texto habitual y observaciones de las referencias
Esta especificacion sustituye la aproximacion de la version 1.1.1 (Arial 46px, top 4%, frase completa y recuadro en todas las palabras). Aplicar por defecto su sección de texto salvo cambio explícito del usuario. Las decisiones de dirección de arte se eligen para cada proyecto con direccion-adaptable.md.

Para dirección de arte, personajes, encuadres y animación seguir [direccion-adaptable.md](direccion-adaptable.md), que tiene prioridad. Lo que permanece habitual es el tratamiento de subtítulos de esta sección; el resto son ejemplos, no una estética universal.

## Texto narrado
Fuente confirmada en Santos y su reproductor: "MS Inter" (Inter), pesos 500 para palabras anteriores y 800 para la activa. A 720 de ancho: 32.4px (4.5% del ancho del lienzo), line-height 1.25, sin espaciado negativo. Centro en x=50%, y=11% del alto; ancho 88%, anclaje vertical al centro (translateY(-50%)). Es una zona fija fuera del grupo de camara, no un elemento del escenario.
Color activo #FFFFFF, anteriores #FFFFFF80; sombra 0 2px 14px rgba(0,0,0,.65). Sin banda negra para toda la narracion y sin mayusculas forzadas.
Usar MS Inter cuando este cargada por Motion Studio. Si hay archivos Inter disponibles, verificar su carga. El generador tiene Inter/Arial de respaldo: si usa respaldo no afirmar igualdad tipografica exacta. No inventar rutas de fuente ni incrustar fuentes enormes excediendo los limites JSON.
Las palabras FUTURAS permanecen ocultas (display:none). Mostrar progresivamente las pronunciadas, atenuando la anterior cuando aparece la siguiente. Mantener la ultima activa durante espacios breves entre palabras. Es normal que el grupo se recentre al crecer.
Agrupar hasta cinco palabras, cortar tras coma, punto, punto y coma, dos puntos, interrogacion, exclamacion o puntos suspensivos; tambien con pausa >=0.4s. Preferir una o dos lineas y revisar el ancho real. No imponer 27 caracteres si corta una frase innecesariamente.
La aparicion puede anticipar 0.02s el comienzo; conservar el grupo hasta 0.45s despues del final o hasta el siguiente grupo, sin superposiciones. Ocultar al salir de escena. Estas tolerancias son del efecto visual, no tiempos de transcripcion inventados.
Al aparecer una palabra, scale 1.10 a 1 en 0.14s, interpolacion lineal; sin rebote grande ni escribir letras una por una. Escalar tambien texto y marco juntos.
Recuadro SOLO para palabras marcadas box:true: cifras, fechas y palabras clave seleccionadas por significado. No marcar todos los articulos o todas las palabras. El archivo de tiempos acepta {text,start,end,box?:boolean}; decidir box durante la autoria, conservar tiempos reales.
Marco azul #4C8DFF, sin relleno, esquinas rectas. Grosor max(1.5px,5% del tamano de letra); padding horizontal 18% del tamano. Cuatro puntos cuadrados blancos con borde azul: lado 20% del tamano, borde max(1px,4%), sobresalen 10% en cada esquina. Mostrar solo mientras esa palabra es activa.
scripts/add-captions.mjs implementa este tratamiento dentro de customScene. Usa outline en lugar de borde de caja para no mover las lineas durante el cambio de palabra; es una equivalencia visual, no una copia byte a byte del reproductor React.

## Texto informativo dentro de la escena
Separar de los subtitulos: fechas, contadores, nombres, unidades, flechas y etiquetas acompanian el objeto y explican una idea concreta. Pueden entrar con un pop contenido al pronunciar el dato. Cifras grandes marfil/doradas sobre placas oscuras redondeadas, unidades menores. El video del naufrago usa ademas etiquetas monoespaciadas y paneles de estado: no convertirlas en el estilo principal de la narracion.
No repetir todo el audio en carteles ni inventar cantidades o hechos. Los efectos del texto no justifican heredar errores ortograficos, acentos rotos o caracteres faltantes observados en algunos MP4.

## Ilustracion y composicion
Animacion explicativa editorial 2D con sensacion de profundidad 2.5D: siluetas claras, personajes completos, gradientes, sombras de contacto, textura fina y luz dirigida. Fondo, ambiente, sujeto, objetos y efectos en capas. Mantener una identidad consistente de personajes y objetos.
En los videos religiosos predominan marrones, rojo profundo, negro calido, oro y luz de vela; en el mecanismo, azul nocturno y metal; en el naufrago, azules oceanicos y ciclos dia/noche. Adaptar la paleta al relato conservando contraste y jerarquia. No imponer oro o iglesias a todos los temas.
No convertir el estilo en tarjetas repetidas, formas flotantes o solo una imagen con zoom. Un personaje estilizado de geometria simple es valido si tiene silueta, rostro y accion legibles. Los JSON antiguos muestran estructuras tecnicas, no el techo de calidad de los MP4.
Reservar la zona de subtitulos desde la composicion. Usar planos generales para situar, planos medios para acciones y detalles para el dato o mecanismo. Mantener un punto focal por momento.

## Movimiento narrativo
Planificar cada escena como preparacion -> accion -> resultado, vinculado a las palabras reales que disparan esos momentos. Un objeto nombrado debe estar presente o revelarse oportunamente; no moverlo solo para llenar tiempo.
Camara: acercamientos suaves tipicos 1.00->1.05/1.10, paneos y alejamientos para recontextualizar; los detalles pueden usar un salto de escala mayor con corte motivado. Mantener subtitulos estables. Parallax sutil entre capas.
Acciones: manos y brazos articulados con objetos unidos; caminar con pasos alternos y desplazamiento; girar/abrir libros; transferencia de monedas; pistones, combustible y golpes con causa visible; barcos con balanceo leve y agua coherente. Evitar que manos o partes aparezcan por opacidad independiente.
Ambiente secundario: velas con fluctuacion suave, polvo, lluvia, agua, nubes, rayos o petalos segun contexto. No anadir todas las particulas a todas las escenas. Limitar ciclos repetidos a la duracion y acentos a momentos narrativos.
Entradas de objetos: fade/rise/pop suaves; rebotar levemente un cartel es distinto de rebotar cuerpos enteros sin motivo. El JSON del hijo prodigo muestra gestos de brazos, cabezas, pasos, monedas y fiesta; conservar esa variedad y mejorar su continuidad.
Transiciones: cortes para cambios claros o detalles, fundidos para continuidad, dip para cambio emocional y revelaciones/iris solo con motivo. Los JSON usan fade/cut/dip e iris; verificar que el contrato del Motion Studio destino admite cada nombre antes de emitirlo.
Para tension, modificar encuadre, contraste, luz y ritmo; para resolucion, abrir plano o calentar la luz. No depender solo de un filtro.

## Revision antes de entregar
Revisar primera palabra, palabra normal, palabra box, fin de grupo, pausa, salto de escena y busqueda hacia atras. Ninguna palabra futura visible; ningun subtitulo escalado por la camara; marco solo en palabras marcadas, sin salto de linea al encenderse.
Revisar inicio/medio/final de la accion y un cambio de plano por escena. Confirmar que el movimiento comunica causa y resultado. Comprobar anatomia, oclusiones, acentos y recursos.
Si no se pudo revisar visualmente o escuchar el audio, declararlo. Esta guia y los ejemplos no garantizan por si solos la calidad de un proyecto nuevo.

