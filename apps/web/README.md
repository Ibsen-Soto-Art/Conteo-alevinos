# apps/web: app del dueño de finca

App para contar alevinos con el celular. Sigue las reglas de `docs/diseno.md`: una tarea por pantalla, botones grandes, sin teclado y **sin scroll**.

- **App** (`/`): Inicio → Qué pez → Prueba de 100 → Cuántos por bolsa → Contando → Bolsa lista → Resumen. «Prueba de 100» y «Contando» usan la cámara trasera y el motor en vivo. Con `?demo` en la dirección (`https://…:5173/?demo`) arranca con datos de ejemplo.
- **Laboratorio** (`/laboratorio`): página técnica para probar el motor con un video o la cámara, con umbral, área, línea, distancia y sentido. Solo para quien desarrolla.

El motor (`packages/counting-engine`) corre en un Web Worker; cada cuadro se reduce a 320 px de lado mayor antes de procesarlo.

## Prueba de «sin scroll»

```bash
pnpm e2e
```

Recorre todas las pantallas en 360×640, 390×844 y 412×915 y falla si alguna tiene scroll, deja algo fuera de la pantalla, corta el texto de un botón o tiene botones de menos de 56 px (72 px el principal).

También comprueba el conteo en vivo: antes de empezar, ffmpeg genera un video sintético con 10 manchas que cruzan la línea, y Chromium lo usa como cámara falsa.

Necesita ffmpeg instalado. La primera vez hay que bajar el navegador: `pnpm --filter @contador/web exec playwright install chromium`.

## Qué se guarda

En el teléfono (IndexedDB, sin internet): el lote con su prueba de 100, cada conteo y cada bolsa en cuanto se cierra. Una bolsa cerrada no se cambia: «Deshacer» la deja descartada y vuelve su número al contador. Si el teléfono se apaga contando, al abrir la app el conteo se cierra con lo que ya estaba guardado. No se guarda video. Con `?demo` no se guarda nada.

## Ajustes del motor

La app no muestra controles técnicos. Usa los ajustes que se dejaron en `/laboratorio` **en el mismo teléfono** (se guardan solos al moverlos); si nunca se abrió el laboratorio, usa los de fábrica.

## Arrancar en el computador

```bash
pnpm install
pnpm dev
```

Abre `https://localhost:5173`. La primera vez el navegador avisa que el certificado no es de confianza: es un certificado de desarrollo hecho en tu computador. Acepta («Avanzado» → «Continuar»).

## Abrir desde el celular (misma red wifi)

1. En la terminal donde corre `pnpm dev` aparece una línea `Network: https://192.168.x.x:5173/`. Usa la de tu red wifi.
2. Abre esa dirección en el celular, **con `https://`**. La cámara solo funciona en páginas seguras.
3. Acepta el aviso del certificado (Chrome: «Configuración avanzada» → «Acceder al sitio»; Safari: «Mostrar detalles» → «visitar este sitio web»).
4. Para el laboratorio, agrega `/laboratorio` a la dirección, toca «Usar cámara trasera» y da permiso.

Si el celular no abre la página, revisa que el cortafuegos del computador deje pasar el puerto 5173. En Fedora: `sudo firewall-cmd --add-port=5173/tcp`. Ese permiso dura hasta reiniciar.

## Laboratorio: qué muestra

- **Número grande:** alevinos contados (crudo, sin factor de calibración).
- **Línea amarilla:** línea de conteo. Se cuenta lo que la cruza en el sentido elegido.
- **Círculos celestes:** manchas detectadas en el cuadro.
- **Puntos naranjas con número:** alevinos seguidos que todavía no cruzan. `7×2` quiere decir que la pista 7 se ve como 2 alevinos pegados.
- **Puntos verdes:** alevinos ya contados.
- **Ver lo que detecta:** pinta de rojo lo que el umbral considera alevino; sirve para ajustar el umbral.

## Ajustes

| Ajuste | Para qué |
| --- | --- |
| Umbral de oscuridad | Súbelo si no detecta alevinos claros; bájalo si detecta sombras o reflejos |
| Área mínima | Súbela si cuenta burbujas o basura |
| Posición de la línea | Ponla donde los alevinos ya van separados y en fila |
| Distancia máxima | Súbela si pasan rápido y algunos no se cuentan |
| Sentido del flujo | Hacia dónde corre el agua en la imagen |

Con un video cargado se puede bajar la velocidad a 0,5× o 0,25× para que un teléfono lento procese todos los cuadros.

La página no guarda video: el archivo se lee en memoria y se descarta.
