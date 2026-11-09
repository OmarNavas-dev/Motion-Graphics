# P7 · Adaptadores de medios y segmentación

## Planificar antes de ejecutar

En ChatGPT el complemento puede producir solicitudes P7 con `scripts/plan-external-request.mjs --input request.json`. El plan no contiene claves ni envía contenido a terceros. En Motion Studio, `POST /api/external/plan` acepta el mismo objeto y devuelve la solicitud normalizada.

### Segmentación externa

```json
{"provider":"removebg","operation":"segment","asset":"user-assets/00000000-0000-4000-8000-000000000000.png","size":"preview"}
```

Después de revisar coste y destino, el sistema admite `POST /api/external/segment` con `{ "asset": "...", "size": "preview", "confirm": "ACEPTO CONSUMIR CREDITOS REMOVE_BG" }` y `REMOVE_BG_API_KEY` en `.env`. Solo acepta una imagen ya importada localmente, la envía a `https://api.remove.bg/v1.0/removebg`, valida una respuesta PNG con alfa y crea un nuevo `user-assets/<uuid>.png`. No sustituye ni elimina el original. `preview` puede consumir créditos, y `full` puede tener mayor coste.

La clave se usa únicamente en el servidor, nunca en JSON ni en el complemento. Sin clave o sin confirmación no se ejecuta una petición. No permitir URL arbitraria para la fuente ni redirecciones externas. Comprobar el resultado manualmente antes de declararlo segmentado de forma satisfactoria.

### Medios externos

`openverse` y `pixabay` aceptan `{ "provider":"openverse", "operation":"search", "query":"paisaje nocturno" }`. El servicio local ya permite buscar e importar recursos admitidos desde ambos proveedores, manteniendo la atribución. Para Pixabay se requiere `PIXABAY_API_KEY`. Revisar la licencia y los derechos antes de publicar el video.

### Higgsfield, solo preparación

```json
{"provider":"higgsfield","operation":"generate-video","model":"modelo-a-elegir","prompt":"Plano cercano de nubes avanzando en cámara lenta","duration":5,"aspectRatio":"16:9"}
```

El plan valida intención, duración y aspecto, pero devuelve `dispatchable:false`. **No se envían solicitudes pagadas** ni se inventa un endpoint de modelo. Antes de ejecutar habrá que seleccionar el modelo real, consultar su documentación API específica, verificar saldo/precio y obtener autorización. Una suscripción a Higgsfield no equivale necesariamente a créditos de API.

## Criterios de verificación

- Contrato idéntico entre complemento y Motion Studio; claves nunca expuestas.
- Pruebas con respuestas simuladas del proveedor, MIME, tamaño y validación de canal alfa.
- Rutas con consentimiento explícito; una petición sin autorización no debe facturar.
- Integración real en un entorno con credenciales y fondos **pendiente**, nunca certificada mediante mocks.
