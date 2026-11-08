# Motion Studio 7.3.1 y Motion Graphics 1.8.1

Se corrige el caso donde un corte deja menos de 20 milisegundos de una palabra
al comienzo de la escena siguiente. La anticipación del texto podía crear un
ocultamiento y un pulso negativos. En el incidente reproducido, «caja» permanecía
visible durante «Lo que había fallado como» en la escena 13.

El generador limita esos tiempos a cero y conserva el reloj global de las
palabras. El motor aplica la misma reparación al bloque canónico antiguo, para
que los JSON ya creados puedan reproducirse y exportarse. La validación de
palabras sigue activa.

Las pruebas de regresión incluyen un remanente de 10 ms, conservación de los
tiempos y acciones originales, e idempotencia. La comprobación del contrato
compartido incluye la ejecución del bloque legado defectuoso en navegador.

Para cargar el código nuevo hay que reiniciar el servidor de Motion Studio.
Actualizar solo la pestaña del editor no reinicia el servidor Node.
