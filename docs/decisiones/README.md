# Decisiones de arquitectura (ADR)

Cada archivo guarda **una** decisión: qué se decidió, por qué y qué se descartó. Se numeran en orden y no se borran: si una decisión cambia, se escribe una ADR nueva que **reemplaza** a la anterior, y la anterior se marca «Reemplazada por 00NN».

| ADR | Decisión | Estado |
| --- | --- | --- |
| [0001](0001-pwa-offline-first.md) | App web instalable (PWA) que funciona sin internet | Aceptada |
| [0002](0002-conteo-en-el-telefono.md) | El conteo se hace en el teléfono, sin servidor | Aceptada |
| [0003](0003-sin-video-de-respaldo.md) | No se guarda video de los conteos | Aceptada |
| [0004](0004-supabase-como-backend-v1.md) | Supabase como servidor en la primera versión | Propuesta |
| [0005](0005-solo-dos-roles.md) | Solo dos roles: dueño de finca y administrador | Aceptada |
| [0006](0006-licencia-sin-conexion.md) | Acceso sin internet con licencia firmada que vence | Propuesta |
| [0007](0007-solo-conteo.md) | La app solo facilita el conteo | Aceptada |
| [0008](0008-motor-clasico-con-perfiles.md) | Motor clásico con perfiles de especie, fondo aprendido y franja de conteo neto | Aceptada |
| [0009](0009-contar-sin-esperar-el-fondo.md) | Contar sin esperar el fondo | Aceptada |
| [0010](0010-sentido-del-agua-automatico.md) | La app averigua sola hacia dónde corre el agua | Reemplazada por 0011 en la app |
| [0011](0011-franja-fija-abajo.md) | La franja va fija abajo; si el agua sube, la app avisa | Aceptada |

## Formato

```markdown
# 00NN. Título corto

- Estado: Propuesta | Aceptada | Reemplazada por 00NN
- Fecha: AAAA-MM-DD
- Decide: quién

## Contexto
Qué problema hay y qué lo hace difícil.

## Decisión
Qué se hace.

## Alternativas descartadas
Qué más se pensó y por qué no.

## Consecuencias
Qué se gana, qué se pierde y qué queda pendiente.
```
