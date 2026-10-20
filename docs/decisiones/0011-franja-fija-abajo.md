# 0011. La franja va fija abajo; si el agua sube, la app avisa

- Estado: Aceptada (reemplaza en la app del campesino el sentido automático de la ADR 0010)
- Fecha: 2026-10-20
- Decide: Frezzer

## Contexto

Con el sentido automático (ADR 0010) la app guardaba en el teléfono el último sentido decidido y empezaba el siguiente conteo con él. Si alguna vez decidía mal (una mano que subía al armar el montaje, el celular que se movió), el conteo siguiente empezaba con la franja arriba y había que salir y volver a entrar hasta que bajara. El campesino monta el celular siempre igual: no necesita que la app adivine.

## Decisión

- En la app del campesino el agua corre **siempre hacia abajo** en la pantalla y la franja va **fija abajo**, cerca de la salida. No se guarda ningún sentido en el teléfono.
- El motor sigue mirando hacia dónde avanzan las manchas (con memoria de unos 8 s). Si entre todas retrocedieron 1,5 largos del canal, muestra **«El agua sube: gire el celular»**; el aviso se apaga solo cuando vuelven a bajar. Un alevino que nada contra la corriente no basta para avisar.
- El sentido automático queda en el motor, apagado: `/laboratorio` lo puede encender para probar.
- `pnpm precision` mide igual que la app: sin `sentido` en la fila, hacia abajo.

## Alternativas descartadas

- Seguir averiguando el sentido sin guardarlo: igual podía decidir mal en los primeros segundos y mover la franja.
- Elegir el sentido con un botón: más pasos para el campesino.

## Consecuencias

- Con el celular al revés no se cuenta (la franja queda en la entrada), pero la app lo dice claro y en grande.
- El montaje importa: parte de arriba del celular hacia la entrada del canal (`docs/hardware/canal.md`).
