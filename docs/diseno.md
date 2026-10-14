# Diseño de la app

La app la usa un campesino: al sol, con las manos mojadas, con prisa y a veces con poca lectura. Tiene que ser muy fácil e intuitiva, y **en el celular ninguna pantalla puede tener scroll**.

Estas reglas mandan sobre cualquier otra preferencia de estilo. Si una pantalla nueva no las puede cumplir, se pregunta antes de romperlas.

## Reglas

1. **Una sola tarea por pantalla** y un solo botón principal, abajo, al alcance del pulgar, de al menos **72 px** de alto. Todo lo que se toca mide al menos **56 px**.
2. **Nada de escribir con el teclado:** todo se elige tocando botones grandes.
3. **Palabras simples y trato de usted:** «Prueba de 100» (no «calibración»), «Cerrar bolsa», «Siguiente bolsa», «Luz bien» o «Poca luz».
4. **Sin scroll:** la raíz mide `height: 100dvh` con `overflow: hidden`; la zona central es flex y se encoge; las letras usan `clamp()`. Las listas largas van por páginas, nunca con scroll.
5. **Colores:**

   | Uso | Color |
   | --- | --- |
   | Acción | `#0B6E69` |
   | Fondo | `#F3F6F5` |
   | Texto | `#0F2A30` |
   | Bordes | `#C9D9D7` |
   | Éxito | `#1E7A3C` |
   | Aviso | ámbar |
   | Problema | rojo |

   El estado se muestra **siempre con ícono y palabra**, nunca solo con color.
6. **Letra Atkinson Hyperlegible**, guardada dentro de la app para que funcione sin internet.
7. **Solo orientación vertical.** La pantalla no se apaga mientras cuenta (Wake Lock). Vibración y sonido al llegar a la meta.

## Pantallas

En este orden:

1. **Inicio:** arriba el nombre de la finca y el aviso «Todo guardado». En el centro un botón enorme «Contar alevinos» con dibujo de pez. Debajo dos botones: «Conteos» y «Ayuda». Abajo una tarjeta con el último conteo.
2. **Qué pez** (paso 1 de 3): barra de avance y botón Volver. «¿Qué pez va a contar?» con 6 botones grandes (Cachama, Tilapia, Bocachico, Yaque, Pintadillo, Pangasius) y «¿De qué tamaño?» con 3 botones (Pequeño, Mediano, Grande). Botón «Siguiente».
3. **Prueba de 100** (paso 2 de 3): tres pasos numerados («Cuente 100 alevinos a mano», «Échelos al canal», «Mire cuántos contó la app»). Un círculo grande con el número en vivo, por ejemplo «97 de 100». Resultado en verde «Prueba buena», o en rojo si el factor sale de 0,90 a 1,10, con qué revisar. Botones «Repetir» y «Siguiente».
4. **Cuántos por bolsa** (paso 3 de 3): número grande con botones − y + de 100 en 100. Atajos 500, 1.000, 1.500 y 2.000, y la opción «Sin meta: yo cierro cada bolsa». Botón «Empezar a contar».
5. **Contando:** arriba la cámara (unos 25 % de la pantalla) con la línea de conteo, el aviso «Luz bien» y «Bolsa 3». En el centro el número enorme (cerca de 130 px), «de 1.000», la barra de avance, «Faltan N» y «Total hoy». Cuando falten 50, todo se pone ámbar. Abajo «Pausar» y «Cerrar bolsa».
6. **Bolsa lista:** pantalla verde completa con chulo, «¡Bolsa 3 lista!», el número y «Cierre la compuerta y ponga una bolsa nueva». Botones «Siguiente bolsa», «Deshacer» (unos segundos) y «Terminar».
7. **Resumen:** «Conteo terminado», total y número de bolsas en grande, una cuadrícula con cada bolsa y «Listo, volver al inicio».

## Volver a cero

En «Prueba de 100» y en «Contando» hay un botón secundario (blanco con borde, al menos 56 px) «Volver a cero», con flecha circular, para cuando pasa algo que no es un alevino (una mano, una burbuja) o uno de más. Siempre pide confirmación con un cuadro grande «¿Volver a cero?» con «Sí, volver a cero» y «No», de al menos 72 px. Si el conteo ya está en 0 se ve apagado.

- En la prueba: el conteo vuelve a 0 y se reinicia el rastreador del motor; el pez y el tamaño no cambian.
- En Contando: solo la bolsa abierta vuelve a 0; las bolsas cerradas y su total no cambian.

## Laboratorio

La página de pruebas con los controles técnicos (umbral, área, línea, distancia, sentido) vive en `/laboratorio` y es solo para quien desarrolla. El campesino nunca ve esos controles. El laboratorio no sigue la regla de «sin scroll».

## Cómo se verifica

Una prueba con Playwright recorre todas las pantallas en 360×640, 390×844 y 412×915 y falla si alguna tiene scroll vertical o deja algo fuera de la pantalla (`pnpm --filter @contador/web e2e`).
