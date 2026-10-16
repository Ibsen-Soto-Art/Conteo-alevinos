# 0006. Acceso sin internet con licencia firmada que vence

- Estado: **Propuesta** (no implementada; va en una fase posterior con el servidor, ADR 0004)
- Fecha: 2026-10-13
- Decide: Frezzer (pendiente el plazo definitivo)

## Contexto

El administrador debe poder dar y quitar el acceso al servicio, pero el dueño cuenta sin señal durante días. Si la app preguntara al servidor antes de cada conteo, no funcionaría en la finca.

## Decisión propuesta

- Al iniciar sesión con señal, el servidor entrega una **licencia firmada** (token con clave **Ed25519**, librería `jose`, emitido por una Edge Function) con fecha de vencimiento, plan y teléfonos permitidos. La app la guarda.
- La app **verifica la firma sin internet** y cuenta mientras la licencia esté vigente. Cada vez que ve señal la **renueva** en segundo plano y sube el historial.
- Si pasan **30 días sin conexión** (ajustable por cuenta) o vence la suscripción, la app **no deja empezar conteos nuevos**, pero conserva el historial.
- La app **recuerda la última hora vista** y bloquea si el reloj del teléfono retrocede.
- Aviso 7 días antes de vencer.

## Alternativas descartadas

- **Pedir permiso al servidor en cada conteo:** imposible sin señal.
- **Acceso sin control (app libre):** no permite cobrar ni suspender.
- **Licencia sin firma (solo una fecha guardada):** cualquiera la cambia.

## Consecuencias

- Una suspensión **no es instantánea** en un teléfono sin señal: se aplica en la siguiente conexión o al vencer el plazo. Un plazo más corto da más control; uno más largo, más comodidad.
- La clave privada solo vive en el servidor; editar la licencia la invalida.
- Pregunta abierta: plazo definitivo sin conexión antes de bloquear (30 días por ahora).
