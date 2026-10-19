# 0009. Contar sin esperar el fondo

- Estado: Aceptada (cambia el punto 4 de la ADR 0008)
- Fecha: 2026-10-19
- Decide: Frezzer

## Contexto

Con la ADR 0008, al abrir la cámara la app miraba 3 segundos el canal vacío antes de contar y, si veía algo moverse, mostraba «Espere: hay movimiento en el canal» y volvía a empezar. En finca el agua y los alevinos ya vienen corriendo: el aviso se quedaba esperando y no contaba hasta llegar al 100 %.

## Decisión

- Se cuenta **desde el primer cuadro**. Mientras no hay fondo, con el umbral fijo (lo oscuro sobre el canal iluminado) y el mismo filtro de forma del perfil.
- El fondo se aprende **al mismo tiempo**, sin necesitar el canal vacío: sube rápido hacia lo claro y baja muy despacio hacia lo oscuro. Lo que pasa (alevinos) no queda en el fondo; lo fijo (marcas, rayones) sí. A los ~3 s el motor cambia a contar contra el fondo, sin perder las pistas.
- No hay aviso en pantalla: el campesino no tiene que esperar ni hacer nada.

## Alternativas descartadas

- Mantener la espera con un tiempo máximo: igual se pierden los primeros alevinos.
- Quitar el fondo: se pierde lo que gana con canales rayados o con luz despareja.

## Consecuencias

- Los primeros ~3 s cuentan con el umbral fijo: en un canal con rayones o luz despareja pueden salir manchas que el filtro de forma y la regla de «quieto» deben descartar.
- Una mancha fija oscura que aparezca después (una hoja pegada) entra al fondo despacio, como antes.
