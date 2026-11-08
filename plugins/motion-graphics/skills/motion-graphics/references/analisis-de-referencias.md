# Análisis de las referencias de estilo
Se inspeccionaron los dos JSON completos, metadatos de los cinco MP4, 12 fotogramas distribuidos por cada video (60 en total) y dos secuencias densas de 12 fotogramas para texto y accion. El analisis temporal usa secuencias de imagenes y codigo del reproductor de Santos; no se realizo una escucha completa ni una comparacion automatica de sincronizacion de voz.

## Qué corrige respecto a la versión anterior
La regla de Arial negrita de 46px situada al 4% no representa estas nuevas referencias. El JSON Santos especifica caption y=11, width=88, size=4.5, texto activo blanco, anteriores blanco al 50% y stroke azul. Su reproductor confirma Inter 500/800, aparicion progresiva, pulso 1.10->1 en 0.14s y cuatro puntos de esquina. El recuadro es selectivo mediante box:true. Estos valores tienen evidencia en el JSON y el codigo; las decisiones generales de direccion se infieren de las imagenes.

## Referencias y aportes
| Archivo | Duración | Aporte |
|---|---:|---|
| Datoscuriososoficcial | 106.13 s | Escenario oceanico continuo, barco y personajes reconocibles, paso dia/noche, cambios meteorologicos, contadores, medidores y etiquetas vinculadas a la historia. Sus etiquetas monoespaciadas son una variante informativa; no el subtitulo principal. |
| As_empez | 112.40 s | Explicacion mecanica por etapas: martillo, pilote, grua, corte interno del motor, combustible y golpe. Planos de detalle y flechas convierten el movimiento en explicacion. Texto superior progresivo gris/blanco y marcos azules selectivos. |
| Un_Cristiano_Inquieto (2) | 62.03 s | Espacio religioso con profundidad, vitrales, velas, sarcofagos y cuerpos enmarcados. Alterna vista general con primeros planos; polvo, petalos y luz acompañan el relato. Numeros y edades en placas oscuras con texto marfil. |
| Un_Cristiano_Inquieto (1) | 53.57 s | Cruces y cielo dramatico, halo, libros y documentos, acercamientos y cambio de temperatura de color. Contiene caracteres de acentos deteriorados que no deben heredarse. |
| Un_Cristiano_Inquieto | 60.77 s | Ojo como foco narrativo: acercamiento a la pupila, reflejos, lupa, fotos y cuadros explicativos; vincula cada revelacion con un nuevo nivel de detalle. Incluye recursos fotograficos: adoptar su composicion, manteniendo visuales en codigo mientras ese sea el contrato. |

## Los dos proyectos
El hijo prodigo HTML contiene 20 escenas y 147 s, showText:false y wordTimings vacio: aporta animacion SVG de personajes, camara, gestos, viaje, entrega y celebracion; no aporta una pista propia de subtitulos sincronizados. No usar sus tiempos como transcripcion real.
Santos contiene 13 escenas y 67.67 s, con capas authored y subtitulos temporizados. Aporta jerarquia de capas parent, personajes en marco, camara suave, grado de color, velas y particulas. Los tiempos proceden del archivo; su precision respecto a un audio original no se ha certificado.
Los MP4 son la referencia de acabado; los JSON sirven para entender construccion y parametros. El video de Santos y el JSON no son el mismo montaje ni tienen exactamente el mismo contenido: no confundir correspondencia de estilo con identidad de proyecto.

## Regla para próximos proyectos
Mantener siempre el mismo sistema tipografico y su comportamiento. Variar ilustraciones, acciones, paleta, encuadres y efectos segun el guion. Cada escena debe mostrar lo narrado y evolucionar con una accion; los zooms, las particulas y las transiciones son apoyo.
La especificacion aplicada al complemento esta en references/estilo-referencias.md. Se sustituyo el generador de titulos para incorporar aparicion progresiva, pesos diferenciados, pulso corto y recuadro selectivo con cuatro puntos. La fuente exacta depende de disponer de Inter cargada; Arial es solo respaldo.

