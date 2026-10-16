# 0007. La app solo facilita el conteo

- Estado: Aceptada
- Fecha: 2026-10-13
- Decide: Frezzer

## Contexto

Alrededor del conteo hay más tareas: comprobantes de venta, clientes, pedidos, envío de resultados por WhatsApp. Agregarlas haría la app más grande, más difícil de usar en la finca y más lenta de terminar, y cada finca ya maneja la venta a su manera.

## Decisión

La app **solo facilita el conteo**: lote, prueba de 100, conteo bolsa por bolsa, resumen e historial. **No** genera comprobantes, PDF ni QR, **no** maneja clientes ni pedidos y **no** envía nada por WhatsApp. La venta se maneja fuera de la app.

## Alternativas descartadas

- **Comprobante en PDF o QR al terminar:** útil para algunas fincas, pero agrega pantallas, datos del cliente y formatos legales.
- **Compartir por WhatsApp:** depende de señal y abre la puerta a pedir más integraciones.

## Consecuencias

- Una app pequeña, con una sola tarea por pantalla, que un campesino usa sin ayuda.
- Si una finca necesita el número para la venta, lo copia del resumen o del historial.
- Nuevas funciones (panel web del dueño, compuerta automática, facturación) entrarían como módulos aparte, sin tocar el motor ni la pantalla de conteo.
