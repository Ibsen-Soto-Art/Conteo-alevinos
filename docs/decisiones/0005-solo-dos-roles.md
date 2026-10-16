# 0005. Solo dos roles: dueño de finca y administrador

- Estado: Aceptada
- Fecha: 2026-10-13
- Decide: Frezzer

## Contexto

El conteo de alevinos es un servicio que se ofrece a varias fincas. Se pensó en más roles (encargado de contar, cliente comprador), pero cada rol más agrega pantallas, permisos y casos que explicar a usuarios con poco tiempo y, a veces, poca lectura.

## Decisión

Solo **dos roles**:

- **Dueño de finca:** el cliente del servicio. Registra lotes, hace la prueba de 100, cuenta bolsa por bolsa y ve su historial, todo sin señal mientras su licencia esté vigente.
- **Administrador de la plataforma:** quien ofrece el servicio. Aprueba cuentas, define plan, vencimiento y número de teléfonos, suspende o reactiva, y publica modelos. **No ve** el detalle de los conteos de cada finca.

Si el dueño quiere que otras personas cuenten, usan **su misma cuenta** en los teléfonos que permita su plan.

## Alternativas descartadas

- **Rol de encargado:** el dueño tendría que crear usuarios y dar permisos; complica la app y el soporte.
- **Rol de cliente comprador:** la venta se maneja fuera de la app (ADR 0007).

## Consecuencias

- La app del teléfono es una sola, sin menús de permisos.
- No se sabe qué persona contó cada bolsa, solo qué teléfono (si hace falta, se registra el teléfono).
- El panel del administrador es una app aparte, solo en línea.
