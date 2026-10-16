# Grabar videos de entrenamiento en la finca

Estos videos sirven para dos cosas: **medir qué tan bien cuenta la app** (comparando con lo que usted contó a mano) y, más adelante, **enseñarle** a reconocer cada especie y tamaño. Cada video vale solo si se sabe **exactamente cuántos alevinos pasaron**.

Los conteos normales de la app no guardan video. Estos videos se graban aparte, a propósito, con la cámara normal del celular.

## Qué necesita

- El canal con la luz LED de abajo y el soporte del celular, armados como para contar.
- El celular con la cámara limpia y batería cargada.
- Un balde o recipiente con agua para los alevinos ya contados.
- La plantilla [`plantilla-videos.csv`](plantilla-videos.csv) (se abre con Excel, Google Sheets o LibreOffice) o una hoja de papel con las mismas columnas.

## Antes de grabar

1. Lave el canal: sin hojas, barro ni burbujas pegadas.
2. Prenda la luz de abajo. El fondo debe verse blanco y parejo.
3. Ponga el celular en el soporte, **a la misma altura con la que se va a contar**, mirando derecho hacia abajo, con el teléfono **vertical**. Mida la altura del lente al agua en centímetros y anótela.
4. Si puede, abra la app en `/laboratorio`, toque **Usar cámara trasera** y revise que los alevinos se vean como manchas oscuras con círculos. Cierre el laboratorio antes de grabar.

## Cómo grabar

- Use la **cámara normal** del celular, en modo **Video**.
- Calidad **1080p** y **30 cuadros por segundo** (si el celular deja elegir). No use cámara lenta ni 4K.
- **Sin zoom, sin flash** y sin mover el celular durante el video.
- Empiece a grabar **antes** de echar el primer alevino y pare **después** de que pase el último.
- Un video por grupo contado. Duración: entre **30 segundos y 3 minutos**.
- No ponga las manos ni otras cosas entre la cámara y el canal mientras graba.

## Cuántos alevinos por video y cómo contarlos

- Entre **100 y 300** alevinos por video. Con más es fácil equivocarse contando a mano.
- Cuente **de a 10** y pase cada grupo al balde. Cuente **dos veces**; si los dos conteos no dan igual, cuente una tercera vez. Si hay otra persona, que cuente ella también.
- Escriba el número **antes** de echarlos al canal.
- Échelos al canal como se haría al contar de verdad. Si se le cae alguno por fuera, si se devuelve uno o si se mete una mano, anótelo en **notas** o repita el video: el número a mano tiene que ser exactamente lo que cruzó.

Un alevino de más o de menos en el conteo a mano cambia la medida un 1 % en un video de 100. Por eso es tan importante contar bien.

## Qué variedad grabar

Grabe de todo, porque la app tiene que contar bien en cualquier día:

- **Cada especie y tamaño** que maneja la finca: cachama, tilapia, bocachico, yaque, pintadillo y pangasius; pequeño, mediano y grande.
- **Al menos 5 videos** por cada especie y tamaño.
- Con **buena luz** y con **poca luz**; con agua **clara** y **turbia**.
- Echándolos **despacio** y **rápido** (como pasa de verdad cuando hay prisa).
- Si hay **varios celulares**, grabe con cada uno.

## Cómo nombrar los archivos

```
AAAAMMDD_especie_tamano_NNN.mp4
```

- `AAAAMMDD`: la fecha, por ejemplo `20261020` para el 20 de octubre de 2026.
- `especie`: `cachama`, `tilapia`, `bocachico`, `yaque`, `pintadillo` o `pangasius`.
- `tamano`: `pequeno`, `mediano` o `grande`.
- `NNN`: número del video de ese día, con tres cifras: `001`, `002`, …
- Todo en **minúsculas**, **sin tildes ni ñ** y **sin espacios**.

Ejemplos: `20261020_cachama_pequeno_001.mp4`, `20261020_tilapia_grande_014.mov`.

El celular le pone otro nombre al grabar (por ejemplo `VID_20261020_093512.mp4`). Cámbielo al pasarlo al computador y escriba el nombre nuevo en la plantilla.

## Qué anotar de cada video (la plantilla)

Una fila por video en [`plantilla-videos.csv`](plantilla-videos.csv):

| Columna | Qué escribir | Ejemplo |
| --- | --- | --- |
| `archivo` | El nombre del archivo, igual que en la carpeta | `20261020_cachama_pequeno_001.mp4` |
| `usar` | `si`, o `no` si el video salió mal y no debe contarse | `si` |
| `fecha` | Fecha de grabación, AAAA-MM-DD | `2026-10-20` |
| `finca` | Nombre de la finca | `La Esperanza` |
| `especie` | `cachama`, `tilapia`, `bocachico`, `yaque`, `pintadillo` o `pangasius` | `cachama` |
| `tamano` | `pequeno`, `mediano` o `grande` | `pequeno` |
| `conteo_a_mano` | Cuántos alevinos pasaron, contados a mano | `150` |
| `talla_cm` | Largo aproximado de un alevino, en cm (si lo sabe) | `2` |
| `luz` | `buena`, `regular` o `poca` | `buena` |
| `agua` | `clara` o `turbia` | `clara` |
| `flujo` | `despacio` o `rapido` | `despacio` |
| `celular` | Marca y modelo | `Samsung A15` |
| `altura_cm` | Del lente del celular al agua | `25` |
| `sentido` | Hacia dónde corre el agua en la imagen: `abajo`, `arriba`, `derecha` o `izquierda` | `abajo` |
| `notas` | Lo que pasó: «se cayó uno», «burbujas al final», … | |

Las cuatro últimas columnas (`umbral`, `area_minima`, `linea`, `distancia`) son para quien programa: son los ajustes del motor que se probaron en `/laboratorio` con ese montaje. Si van vacías se usan los de fábrica.

Si guarda la plantilla desde Excel en español y queda separada con punto y coma (`;`) en vez de comas, no importa: el script de precisión entiende las dos.

## Dónde guardar los videos

- En el computador, en una carpeta con todos los videos y la plantilla llena, con el nombre `videos.csv`.
- **Nunca en el repositorio de código:** los videos pesan mucho (el repositorio los ignora: `*.mp4`, `*.mov`).
- Para medir la precisión, esa carpeta se copia (o se indica) en `tests/precision/videos/`; ver [tests/precision/README.md](../../../tests/precision/README.md).
- Haga una copia en un disco externo o en la nube: grabar estos videos cuesta trabajo.

## Errores comunes

- Mover el celular o el soporte durante el video.
- Contar a mano mientras pasan por el canal (se cuenta **antes**, en el balde).
- Dejar el zoom puesto o grabar en cámara lenta.
- Cambiar la altura del celular entre videos sin anotarla.
- Olvidar escribir el nombre del archivo en la plantilla, o escribirlo distinto al de la carpeta.
