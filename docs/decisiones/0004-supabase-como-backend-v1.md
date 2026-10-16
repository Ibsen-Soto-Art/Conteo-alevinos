# 0004. Supabase como servidor en la primera versión

- Estado: **Propuesta** (aún no confirmada; no hay código de servidor todavía)
- Fecha: 2026-10-13
- Decide: Frezzer (pendiente)

## Contexto

La app cuenta sin internet, pero hace falta un servidor para: cuentas y acceso (dueños y administrador), emitir y renovar licencias, guardar una copia del historial de cada finca, distribuir modelos y perfiles de especie, y recibir los videos de entrenamiento. Lo mantiene una persona o un equipo pequeño, así que conviene no administrar servidores.

## Decisión propuesta

Usar **Supabase** en la v1: PostgreSQL con **reglas por fila** (cada dueño solo ve su finca; el administrador ve cuentas y no el detalle de los conteos), autenticación, almacenamiento de archivos (modelos y videos) y Edge Functions (emitir y renovar licencias firmadas).

## Alternativas descartadas

- **Servidor propio (Node.js con Fastify y PostgreSQL):** más control, pero hay que administrar servidor, respaldos, seguridad y autenticación desde cero.
- **Firebase:** base de datos documental, más difícil para reportes y reglas por finca; más atado a un proveedor.
- **Sin servidor (solo teléfono):** no permite controlar el acceso ni respaldar el historial.

## Consecuencias

- Backend listo rápido; es **PostgreSQL estándar**, así que se puede migrar a un servidor propio si hace falta.
- Si más adelante se necesita lógica propia (facturación, integraciones), se agrega un servicio Node.js sobre la misma base.
- Hasta que se confirme, la app no tiene inicio de sesión ni sincronización: todo vive en el teléfono.
