# 0002. El conteo se hace en el teléfono, sin servidor

- Estado: Aceptada
- Fecha: 2026-10-13
- Decide: Frezzer

## Contexto

Un conteo son miles de alevinos pasando por un canal, y no hay señal. Mandar el video a un servidor para contar no es posible en la finca, y aunque hubiera señal, subir video en vivo sería lento y caro. El error tiene que ser menor a 2 % en el prototipo y a 1 % en campo.

## Decisión

- El **motor de conteo corre en el teléfono**, dentro de un Web Worker, en el paquete independiente `packages/counting-engine` (no conoce React ni el navegador: recibe cuadros en gris).
- **Primera versión, clásica, sin entrenamiento:** el canal tiene luz LED por debajo, así que cada alevino es una sombra; umbral, manchas conectadas, rastreador por cercanía (con predicción por velocidad) y cruce de línea. Las manchas grandes cuentan por área.
- **Después, modelo de visión:** un detector pequeño (tipo YOLO nano) exportado a ONNX y ejecutado con ONNX Runtime Web (WebGPU si hay, WASM si no), con perfiles por especie y talla. Se entrena en un computador con Python (`ml/`).
- **Calibración por lote** (prueba de 100) para corregir el error constante del día y el montaje.
- **Cada cambio del motor se mide** contra videos de finca con conteo a mano (`tests/precision`); si el error pasa la meta, no se publica.

## Alternativas descartadas

- **Contar en un servidor:** sin señal no funciona, y con señal sería lento y costoso.
- **Empezar directo con un modelo entrenado:** sin videos de finca no hay con qué entrenar ni medir; el motor clásico funciona desde el día uno con el montaje de luz por debajo y deja grabar esos videos.
- **Sensor físico (barrera infrarroja):** hardware extra por finca y falla con alevinos pegados.

## Consecuencias

- Funciona sin internet y sin costo de servidor por conteo; sumar fincas casi no carga el servidor.
- El montaje (canal, luz, soporte a altura fija) es parte del sistema: sin buena luz el motor clásico falla, por eso la app avisa «Poca luz».
- Hay que probar en teléfonos de gama baja y mantener una colección de videos de prueba por especie y talla.

## Preguntas abiertas

- **Licencia de Ultralytics YOLO (AGPL-3.0).** Para pruebas se entrena con Ultralytics. Usar un modelo entrenado con YOLO en un **servicio que se cobra** podría obligar a publicar el código bajo AGPL o a comprar la licencia comercial de Ultralytics. Antes de vender el servicio hay que decidir entre: comprar la licencia comercial, o cambiar a un detector con licencia **Apache 2.0** (YOLOX o RTMDet). La carpeta `ml/` queda preparada para ese cambio (la app solo recibe un archivo ONNX). Se cierra con una ADR nueva.
- Modelos de teléfono más comunes entre los piscicultores (define el tamaño del modelo).
- Talla mínima y máxima de alevinos a contar.
- Si la calibración necesita 200 alevinos en vez de 100 para llegar a 1 % (se decidirá con los datos del piloto).
