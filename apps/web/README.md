# apps/web: página de pruebas del motor

Página para probar el motor de conteo con un video del celular o con la cámara trasera. El motor (`packages/counting-engine`) corre en un Web Worker; la página reduce cada cuadro a 320 px de lado mayor, se lo envía y dibuja lo que detecta.

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
4. Toca «Usar cámara trasera» y da permiso.

Si el celular no abre la página, revisa que el cortafuegos del computador deje pasar el puerto 5173. En Fedora: `sudo firewall-cmd --add-port=5173/tcp`. Ese permiso dura hasta reiniciar.

## Qué muestra

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
