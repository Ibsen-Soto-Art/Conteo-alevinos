# Diseño de la app para el campesino: recomendaciones

Prototipo de las 7 pantallas: https://claude.ai/artifact/SsKgz3A9GudUjkpdCfNcWd

## Qué encontré

La página de pruebas actual sirve para el laboratorio, pero un campesino no la podría usar:

- Muestra controles técnicos: umbral, área mínima, distancia y sentido del flujo.
- Pone muchas cosas en una sola pantalla.
- El número no es lo principal.

La app real tiene que poder usarse:

- al sol, con las manos mojadas y con prisa;
- por alguien que no lee mucho;
- en un celular barato y pequeño.

## Recomendaciones

1. **Una tarea por pantalla.** Cada pantalla hace una sola pregunta o muestra una sola cosa: qué pez, prueba de 100, cuántos por bolsa, contando, bolsa lista, resumen.
2. **Un botón principal por pantalla**, siempre abajo, al alcance del pulgar, de al menos 72 px de alto y del mismo color en toda la app (verde azulado). Los secundarios van en blanco con borde.
3. **Nada de escribir.** Todo se elige tocando:
   - especies en botones grandes con dibujo;
   - tamaño en tres botones (pequeño, mediano, grande);
   - meta con botones de + y −, más atajos (500, 1.000, 1.500, 2.000).
4. **Palabras del campo, no técnicas:**
   - "Prueba de 100" en vez de "Calibración";
   - "Cerrar bolsa" y "Siguiente bolsa";
   - "Luz bien" y "Poca luz";
   - trato de "usted".

   Los ajustes técnicos (umbral, línea) los hace la app sola o los toca solo el administrador en una pantalla escondida.
5. **El número manda.** En la pantalla de conteo el número mide unos 130 px y se lee a 2 metros. Debajo van una barra de avance hacia la meta y "Faltan 258".
6. **Colores con significado, siempre con ícono y palabra:**
   - verde azulado: acción;
   - verde: bolsa lista;
   - ámbar: falta poco para la meta;
   - rojo: problema (poca luz, canal fuera de cuadro).

   Nunca solo color, porque hay personas que no distinguen rojo y verde.
7. **Avisar sin mirar.** Vibración y sonido al llegar a la meta y al cerrar cada bolsa. La pantalla no se apaga mientras cuenta.
8. **Perdonar errores.** El botón "Deshacer" sirve unos segundos después de cerrar una bolsa. "Volver" siempre está arriba a la izquierda.
9. **Sin scroll.** Cada pantalla ocupa exactamente el alto del celular:
   - la raíz con `height: 100dvh` y `overflow: hidden`;
   - la parte central con `flex: 1` que se encoge;
   - tamaños de letra con `clamp()` para que se adapten;
   - la cámara arriba con alto proporcional (unos 25 % de la pantalla);
   - las listas largas (historial) por páginas de 6 a 12, nunca con scroll.

   Diseñar y probar en **360 × 640** (celular pequeño) además de 390 × 844.
10. **Solo vertical**, sin girar la pantalla, y modo de alto contraste para el sol.
11. **Letra Atkinson Hyperlegible**: se hizo para personas con baja visión, distingue bien 1, l, 0 y O, y es gratuita.
12. **Probar con 3 a 5 campesinos reales** antes de terminar: darles el celular sin explicar y ver dónde se traban.

## Prompt para Claude Code

Pégale esto a Claude Code antes de seguir con el paso b:

> Antes de seguir con el paso b, quiero cambiar el enfoque del diseño. La app la va a usar un campesino: al sol, con las manos mojadas, con prisa y a veces con poca lectura. Lee docs/diseno-recomendaciones.md (lo copio en el repo) y sigue estas reglas en todo lo que construyas:
>
> 1. Separa la página de pruebas actual en dos: `/laboratorio`, con todos los controles técnicos (umbral, área, línea, distancia, sentido), solo para mí; y la app del campesino con este flujo, una pantalla por paso: Inicio → Qué pez (especie y tamaño con botones grandes) → Prueba de 100 → Cuántos por bolsa (+/− y atajos 500, 1.000, 1.500, 2.000, o sin meta) → Contando → Bolsa lista → Resumen.
> 2. Ninguna pantalla puede tener scroll en el celular. Raíz con `height: 100dvh` y `overflow: hidden`, la zona central con flex que se encoja, tamaños de letra con `clamp()`. Pruébalo en 360×640, 390×844 y 412×915, y agrega una prueba con Playwright que falle si alguna pantalla tiene scroll vertical en esos tamaños.
> 3. Un botón principal por pantalla, abajo, de al menos 72 px de alto. Todos los toques de al menos 56 px. Nada de escribir con el teclado.
> 4. Palabras simples y trato de usted: "Prueba de 100" (no "calibración"), "Cerrar bolsa", "Siguiente bolsa", "Luz bien" o "Poca luz".
> 5. En "Contando" el número va enorme (cerca de 130 px), con barra de avance hacia la meta y "Faltan N". Al llegar a la meta: vibración, sonido y pantalla verde de "Bolsa lista" con "Siguiente bolsa", "Deshacer" y "Terminar". La pantalla no se apaga mientras cuenta (Wake Lock).
> 6. Colores: acción #0B6E69, fondo #F3F6F5, texto #0F2A30, éxito #1E7A3C, aviso ámbar y problema rojo, siempre con ícono y palabra, nunca solo color. Letra Atkinson Hyperlegible, guardada en la app para que funcione sin internet.
> 7. Solo orientación vertical.
>
> Usa como referencia visual el prototipo que te describo arriba. Sigue con CSS simple por ahora. Haz primero el esqueleto de las 7 pantallas con datos de ejemplo y la prueba de "sin scroll"; luego conecta el motor y el paso b (prueba de 100 y bolsas guardadas con Dexie). Muéstrame cómo verlo en mi celular al terminar cada parte.
