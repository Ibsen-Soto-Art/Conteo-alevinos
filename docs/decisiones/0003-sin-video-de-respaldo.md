# 0003. No se guarda video de los conteos

- Estado: Aceptada
- Fecha: 2026-10-13
- Decide: Frezzer

## Contexto

Guardar el video de cada conteo serviría como respaldo ante un reclamo, pero un conteo puede durar horas: el video llenaría la memoria del teléfono, gastaría batería y no se podría subir sin buena señal. Además, el dueño de la finca no lo ha pedido y prefiere no tener video de su operación guardado.

Para mejorar el motor sí hacen falta videos, pero grabados a propósito, con conteo a mano conocido.

## Decisión

- Los **conteos no guardan video**: solo números y datos (lote, bolsas, cantidades, horas, versión del motor).
- Los **videos de entrenamiento se graban aparte**, a propósito, siguiendo la guía `docs/guias/admin/grabar-videos-de-entrenamiento.md`. Más adelante, con un **modo grabación** en la app, visible solo para el administrador o para fincas autorizadas, que guarda especie, talla, fecha, teléfono y el conteo a mano de cada clip.

## Alternativas descartadas

- **Guardar todo el video:** memoria, batería y datos que un teléfono de finca no tiene.
- **Guardar fragmentos o fotos de cada bolsa:** sigue siendo video de la operación del dueño, con poco valor para entrenar porque no se sabe el conteo exacto de cada fragmento.

## Consecuencias

- La confianza en el número se apoya en la **calibración por lote** (el dueño ve con sus ojos qué tan bien cuenta ese día) y en las **pruebas de precisión** antes de cada versión, no en un video de respaldo.
- Una bolsa mal contada no se puede revisar después: si hubo un error, se descarta y se cuenta de nuevo.
- Los videos de entrenamiento no van al repositorio (`.gitignore`) y tienen su propio lugar de almacenamiento.
