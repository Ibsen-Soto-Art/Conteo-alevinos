# El canal de conteo

El montaje es parte del sistema: con un buen canal la app cuenta mejor que con cualquier ajuste del programa.

```
        entrada (del tanque)
   ┌──■────────────────────■──┐   ■ = marca de cinta negra 2 × 2 cm
   │                          │
   │   ↓ agua y alevinos ↓    │   celular arriba, mirando hacia abajo
   │                          │
   │ ─ ─ ─ franja de conteo ─ │   (la pone la app, cerca de la salida)
   │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
   └──■────────────────────■──┘
        salida → escalón → bolsa
```

## Partes

- **Canal de acrílico** blanco lechoso o transparente, de paredes lisas.
- **Luz LED por debajo**, pareja en todo el canal. La cámara ve cada alevino como una sombra oscura sobre el fondo iluminado.
- **Soporte del celular** fijo, mirando **derecho hacia abajo**, con el celular **vertical**. La altura no se cambia durante el conteo.
- **4 marcas** de cinta negra y **escalón a la salida** (abajo).

## Las 4 marcas: cuántos píxeles mide un centímetro

Pegue **4 cuadrados de cinta aislante negra de 2 × 2 cm**, uno en cada **esquina** del canal, sobre el acrílico iluminado y dentro de lo que ve la cámara.

- Corte la cinta con regla: que los cuadrados midan **exactamente 2 cm** de lado. Un error de 2 mm cambia la medida un 10 %.
- Péguelos planos, sin arrugas ni burbujas, con los lados paralelos a las paredes del canal.
- No los ponga donde pasan los alevinos: van en las esquinas, fuera del camino del agua si se puede.

Con las marcas, la app:

1. Sabe **dónde está el canal** y procesa solo esa zona, con más detalle.
2. Calcula **cuántos píxeles mide un centímetro** y usa los largos en cm del perfil de la especie.

Si no encuentra las 4 marcas, la app sigue funcionando: busca la zona iluminada y aprende el tamaño de los alevinos con la Prueba de 100. En `/laboratorio` se ve si las encontró y la medida en píxeles por centímetro.

Las marcas son fijas: la app las aprende como parte del fondo y nunca las cuenta como alevinos.

## Escalón a la salida: que no se devuelvan

Los peces tienden a **nadar contra la corriente**. Si pueden, se devuelven por el canal y cruzan la franja de conteo varias veces. La app resta los que se devuelven (conteo neto), pero es mejor que no pase:

- Ponga a la salida del canal un **pequeño escalón o caída** de 1 a 3 cm hacia la bolsa o el embudo. Un alevino que cae no puede nadar de vuelta hacia arriba.
- La app pone la **franja de conteo cerca de la salida**, donde ya es difícil devolverse.

## Inclinación y velocidad del agua

- Si el canal está **muy inclinado**, los alevinos pasan tan rápido que la cámara no alcanza a verlos en suficientes cuadros y se pierden.
- En la pantalla **Contando**, sobre la imagen de la cámara, la app muestra el flujo: **«Flujo bien»** (verde), **«Flujo rápido»** (ámbar) o **«Muy rápido: baje la inclinación»** (rojo). Ajuste la inclinación hasta verlo en verde.
- Eche los alevinos de a pocos: un chorro grande hace que pasen pegados.

## Más luz, menos borroso

Con poca luz, la cámara deja el obturador abierto más tiempo y los alevinos rápidos salen **borrosos** (una mancha alargada y pálida), y la app los mide mal. **Más luz LED** por debajo hace que la cámara use un obturador más corto y la imagen salga nítida. Si la app dice «Poca luz», suba la luz o tape el sol directo sobre el canal.
