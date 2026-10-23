# 0012. El fondo aprende cuánto varía cada punto (ondas y reflejos)

- Estado: Aceptada (cambia el fondo de las ADR 0008 y 0009)
- Fecha: 2026-10-22
- Decide: Frezzer

## Contexto

En campo el canal es de **acero galvanizado** (opaco): no se puede poner luz por debajo y se trabaja de noche con luz desde arriba. El agua que corre hace ondas (manchas claras y oscuras que bajan) y la lámpara deja un reflejo brillante. El fondo guardaba un solo valor por punto: todo lo 35 niveles más oscuro era «algo», y una onda oscila más que eso. Con solo agua, la app ya marcaba 8 (videos del 2026-10-22). En una prueba sintética con ondas, 240 cuadros de solo agua contaban 250 y el motor tardaba ~250 ms por cuadro por las cientos de manchas falsas.

## Decisión

- El fondo guarda, por punto, cómo se ve el canal vacío **y cuánto varía** (su dispersión). Un punto es «algo» si es más oscuro que el contraste (35) **y** que 3 veces su variación, con un tope de 80: un alevino así de oscuro se ve aunque haya ondas. Donde el canal está quieto, la sensibilidad es la de antes.
- La variación se aprende solo con lo que no es «algo»: un alevino que pasa no la sube.
- El fondo se usa desde el cuadro 10 (⅓ s), adaptándose más rápido hasta los 3 s. Antes se contaba 3 s con el umbral fijo («todo lo oscuro»), que es donde más contaban las ondas.

## Consecuencias

- Solo agua con ondas y reflejo: 0. Alevinos entre las ondas: 6 de 6. Canal tranquilo: igual que antes (`test/noche.test.ts`). ~10 ms por cuadro en vez de ~250.
- Un alevino **poco oscuro** (menos de 80 niveles más oscuro que el fondo) justo en una zona de ondas fuertes puede no verse: hace falta buena luz sobre el canal para que los alevinos contrasten.
