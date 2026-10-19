# Grabar videos de entrenamiento en la finca

Estos videos sirven para dos cosas: **medir qué tan bien cuenta la app** (comparando con lo que usted contó a mano) y, más adelante, **enseñarle** a reconocer un alevino y a no contar lo que no lo es. Cada video vale solo si se sabe **exactamente cuántos alevinos pasaron** (o que no pasó ninguno, en los videos sin alevinos).

Por ahora la app se enfoca en **cachama, pangasius y bocachico**. Grabe sobre todo esas tres.

Los conteos normales de la app no guardan video. Estos videos se graban aparte, a propósito, con la cámara normal del celular.

## Qué necesita

- El canal con la luz LED de abajo y el soporte del celular, armados como para contar.
- El celular con la cámara limpia y batería cargada.
- Un balde o recipiente con agua para los alevinos ya contados.
- La plantilla [`plantilla-videos.csv`](plantilla-videos.csv) (se abre con Excel, Google Sheets o LibreOffice) o una hoja de papel con las mismas columnas.

## Antes de grabar

1. Lave el canal: sin hojas, barro ni burbujas pegadas.
2. Revise que estén las **4 marcas de cinta negra de 2 × 2 cm** en las esquinas y el **escalón a la salida** ([el canal](../../hardware/canal.md)). Con las marcas la app sabe cuánto mide un centímetro en el video.
3. Prenda la luz de abajo. El fondo debe verse blanco y parejo.
4. Ponga el celular en el soporte, **a la misma altura con la que se va a contar**, mirando derecho hacia abajo, con el teléfono **vertical**. Mida la altura del lente al agua en centímetros y anótela.
5. Si puede, abra la app en `/laboratorio`, toque **Usar cámara trasera** y revise que diga **«Canal: 4 marcas»** y que los alevinos se vean como manchas oscuras con círculos. Cierre el laboratorio antes de grabar.

## Cómo grabar

- Use la **cámara normal** del celular, en modo **Video**.
- Calidad **1080p** y **60 cuadros por segundo** si el celular deja elegir; si no, 30. No use cámara lenta ni 4K.
- **Sin zoom, sin flash** y sin mover el celular durante el video.
- Empiece a grabar **antes** de echar el primer alevino: los **primeros 5 segundos con el canal vacío** (la app aprende cómo se ve el canal sin peces). Pare **después** de que pase el último.
- Un video por grupo contado. Duración: entre **30 segundos y 3 minutos**.
- No ponga las manos ni otras cosas entre la cámara y el canal mientras graba.

## Cuántos alevinos por video y cómo contarlos

- Entre **100 y 300** alevinos por video. Con más es fácil equivocarse contando a mano.
- Cuente **de a 10** y pase cada grupo al balde. Cuente **dos veces**; si los dos conteos no dan igual, cuente una tercera vez. Si hay otra persona, que cuente ella también.
- Escriba el número **antes** de echarlos al canal.
- Échelos al canal como se haría al contar de verdad. Si se le cae alguno por fuera o se mete una mano, anótelo en **notas** o repita el video: el número a mano tiene que ser exactamente lo que llegó abajo.

Un alevino de más o de menos en el conteo a mano cambia la medida un 1 % en un video de 100. Por eso es tan importante contar bien.

## Qué variedad grabar

Grabe de todo, porque la app tiene que contar bien en cualquier día. Para cada una de las **tres especies** (cachama, pangasius y bocachico):

| Qué cambiar | Cómo | Cuántos videos |
| --- | --- | --- |
| **Talla** | pequeño (1 a 3 cm), mediano (3 a 5 cm) y grande (5 a 8 cm) | al menos 5 por talla |
| **Flujo** | **lento** (inclinación suave, de a pocos) y **rápido** (más inclinado o un chorro grande, como cuando hay prisa) | de cada talla, al menos 2 lentos y 2 rápidos |
| **Luz y agua** | buena y poca luz; agua clara y turbia | algunos de cada uno |
| **Celular** | si hay varios, grabe con cada uno | |

**Bocachico:** en la app es un solo perfil, «Bocachico (Prochilodus)». Si sabe cuál es (por ejemplo *Prochilodus magdalenae*), escríbalo en la columna `especie_exacta`; si no, déjela vacía.

**Otras especies** (tilapia, yaque, pintadillo, …): grábelas igual si las tiene, con su nombre en `especie`. Usan el perfil «Otra especie».

## Videos difíciles: de lado y devueltos

Son los que más errores causan. Grabe **algunos videos a propósito** con estas situaciones y escríbalo en **notas**:

- **Peces de lado:** el pangasius y la cachama grande a veces pasan de lado y se ven mucho más anchos. Deje pasar el flujo normal y anote «varios de lado».
- **Peces que se devuelven:** con poca corriente o sin escalón, algunos nadan hacia atrás y cruzan la franja dos veces. El conteo a mano es lo que **terminó en el balde de abajo**, no cuántas veces cruzaron.
- **Pegados:** eche un puñado de una vez para que pasen de a dos o tres juntos.

## Videos sin alevinos (negativos)

Sirven para comprobar que la app **no cuenta nada** cuando no hay alevinos. Grabe de 30 segundos a 1 minuto cada uno, con el canal y la luz igual que para contar:

| `tipo` | Qué hacer | Cuántos |
| --- | --- | --- |
| `vacio` | Solo agua corriendo por el canal limpio. | 5 |
| `burbujas` | Agua con burbujas: échela desde más alto o agite el balde. | 5 |
| `basura` | Agua con hojitas, pasto, pedacitos de alimento, ramitas o barro. | 5 |

En estos videos `conteo_a_mano` es **0**. En `especie` y `tamano` escriba los de los alevinos que se cuentan en ese canal; si los deja vacíos, se prueba con «Otra especie, mediano», el perfil más amplio. Si se le cuela un alevino, no lo use (`usar` = `no`) o cámbielo a `alevinos` con el número que pasó.

## Cómo nombrar los archivos

```
AAAAMMDD_especie_tamano_NNN.mp4     videos con alevinos
AAAAMMDD_tipo_NNN.mp4               videos sin alevinos
```

- `AAAAMMDD`: la fecha, por ejemplo `20261020` para el 20 de octubre de 2026.
- `especie`: `cachama`, `pangasius` o `bocachico` (u otra: `tilapia`, `yaque`, …).
- `tamano`: `pequeno`, `mediano` o `grande`.
- `tipo`: `vacio`, `burbujas` o `basura`.
- `NNN`: número del video de ese día, con tres cifras: `001`, `002`, …
- Todo en **minúsculas**, **sin tildes ni ñ** y **sin espacios**.

Ejemplos: `20261020_cachama_pequeno_001.mp4`, `20261020_pangasius_grande_014.mov`, `20261020_burbujas_003.mp4`.

El celular le pone otro nombre al grabar (por ejemplo `VID_20261020_093512.mp4`). Cámbielo al pasarlo al computador y escriba el nombre nuevo en la plantilla.

## Qué anotar de cada video (la plantilla)

Una fila por video en [`plantilla-videos.csv`](plantilla-videos.csv):

| Columna | Qué escribir | Ejemplo |
| --- | --- | --- |
| `archivo` | El nombre del archivo, igual que en la carpeta | `20261020_cachama_pequeno_001.mp4` |
| `usar` | `si`, o `no` si el video salió mal y no debe contarse | `si` |
| `tipo` | `alevinos`, `vacio`, `burbujas` o `basura`. Vacío = `alevinos` | `alevinos` |
| `fecha` | Fecha de grabación, AAAA-MM-DD | `2026-10-20` |
| `finca` | Nombre de la finca | `La Esperanza` |
| `especie` | `cachama`, `pangasius` o `bocachico` (u otra) | `bocachico` |
| `especie_exacta` | Opcional: el nombre científico, si lo sabe | `Prochilodus magdalenae` |
| `tamano` | `pequeno`, `mediano` o `grande` | `pequeno` |
| `conteo_a_mano` | Cuántos alevinos pasaron, contados a mano (0 en los videos sin alevinos) | `150` |
| `talla_cm` | Largo aproximado de un alevino, en cm (si lo sabe) | `2` |
| `luz` | `buena`, `regular` o `poca` | `buena` |
| `agua` | `clara` o `turbia` | `clara` |
| `flujo` | `lento` o `rapido` | `lento` |
| `celular` | Marca y modelo | `Samsung A15` |
| `altura_cm` | Del lente del celular al agua | `25` |
| `sentido` | Hacia dónde corre el agua en la imagen: `abajo`, `arriba`, `derecha` o `izquierda` | `abajo` |
| `notas` | Lo que pasó: «se cayó uno», «varios de lado», «se devolvieron», … | |

Las últimas columnas (`umbral`, `area_minima`, `linea`, `franja_ancho`, `distancia`) son para quien programa: son los ajustes del motor que se probaron en `/laboratorio` con ese montaje. Si van vacías se usan los de fábrica.

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
- Echar los alevinos sin dejar los primeros segundos de canal vacío.
- Despegar o mover una marca de cinta entre videos.
- Olvidar escribir el nombre del archivo en la plantilla, o escribirlo distinto al de la carpeta.
