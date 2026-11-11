# Etapa 1: composiciones específicas

**Ampliación 2.27:** consultar [direccion-universal-etapa1-2.27.md](direccion-universal-etapa1-2.27.md) para temas narrativos, abstractos, científicos o de datos. El nuevo plan admite essentialElements y exige visualMode, layoutIntent y visualQuestion. No forzar escenarios realistas cuando el significado requiere un diagrama o una metáfora.

**Actualización 2.26:** leer también [eventos-y-escenarios-2.26.md](eventos-y-escenarios-2.26.md). El plan necesita visualEvents y cada ficha necesita essentialActors, shotPurpose, visualEvidence y placeholderPrimary. El número de escenas depende de acontecimientos, no de oraciones.

Esto cambia la generación de escenas y añade una prueba, no solo un detector.

1. Dividir el guion por acontecimientos observables (lugar, sujeto, causa, acción, resultado), no automáticamente por frases de la voz.
2. Analizar los fotogramas de referencia: protagonista, composición, escala, materiales, profundidad y continuidad. Separar observaciones de inferencias.
3. Antes de construir HTML/SVG, crear composition-plan.json con una ficha por escena según el esquema motion-studio.composition-plan/1. Cada ficha lleva: sceneId, setting, subject, cause, physicalAction, visibleResult, visualMotif, nextContinuity, objects (name y selector), states (timeLabel y visibleState).
4. Dibujar primero el fotograma clave de cada acontecimiento con geometría propia. Producir sus estados inicial/final. Evitar reutilizar tarjetas, retículas, círculos y composiciones heroicas idénticas por inercia.
5. Prueba sin texto: si los fotogramas consecutivos serían intercambiables al ocultar captions y títulos, rediseñar.
6. Ejecutar node scripts/audit-specific-composition.mjs proyecto.json composition-plan.json y corregir errores. Después revisar el render y ejecutar el gate secuencial con --composition-plan composition-plan.json.

Ejemplo de ficha del plano de sellado:

    {
      "sceneId": "burbuja-02",
      "setting": "Taller industrial con mesa de sellado y rodillos",
      "subject": "Dos láminas plásticas transparentes independientes",
      "cause": "Los inventores buscan formar una textura decorativa",
      "physicalAction": "Los rodillos aproximan y presionan las dos láminas",
      "visibleResult": "Aparecen cavidades selladas con aire entre las capas",
      "visualMotif": "Sección transversal con cámara de aire y sellos",
      "nextContinuity": "Una burbuja permanece al pasar al plano macro",
      "objects": [{"name":"lámina superior","selector":".top-film"},{"name":"rodillos","selector":".seal-rollers"}],
      "states": [{"timeLabel":"inicio","visibleState":"Láminas separadas con aire libre"},{"timeLabel":"final","visibleState":"Láminas unidas con cavidades herméticas"}]
    }

El archivo raíz requiere las claves schema y scenes. Este ejemplo es una ficha, no una plantilla visual. Cada selector debe existir en HTML de la escena.

La auditoría es necesaria pero insuficiente: la puerta 1 permanece bloqueada hasta inspeccionar fotogramas reales, documentar hallazgos y aprobar visualmente.
