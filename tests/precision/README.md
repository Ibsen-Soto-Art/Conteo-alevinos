# Precisión del motor

Pasa el motor de conteo por videos grabados en la finca, con conteo a mano conocido, y entrega el **error por video y por especie**. Es la prueba más importante del proyecto: un cambio que empeora el conteo no se publica.

Mide igual que la app, con el mismo código del motor (`packages/counting-engine`):

1. Combina los primeros 8 cuadros a 640 px y busca el canal y sus **4 marcas** de 2 × 2 cm (`canal.ts`, `geometria.ts`).
2. Recorta el canal a 480 px de lado mayor y lo pasa **cuadro por cuadro, sin saltarse ninguno**, con el mismo paso a gris y los mismos ajustes (`ajustes.ts`).
3. Usa el **perfil** de la especie y el tamaño de la fila (`packages/domain/src/perfiles.ts`; «Otra especie» si no es cachama, pangasius ni bocachico), la escala de las marcas y el **fondo** aprendido en los primeros segundos.

No hay Prueba de 100: el tamaño en píxeles sale de las marcas (o, sin marcas, lo aprende el motor). El error es el del motor **sin** factor de calibración: (app − a mano) ÷ a mano.

Un video con alevinos sin `tamano` se mide **sin perfil** (la app siempre cuenta con uno) y la terminal lo avisa. Los videos sin alevinos (`tipo` = `vacio`, `burbujas` o `basura`) usan la especie y el tamaño de la fila, o «Otra especie, mediano», el perfil más amplio, si van vacíos.

## Qué necesita

- **ffmpeg** instalado (`sudo dnf install ffmpeg` en Fedora, `sudo apt install ffmpeg` en Ubuntu).
- Los videos grabados según [la guía](../../docs/guias/admin/grabar-videos-de-entrenamiento.md).
- La plantilla llena: copie [`plantilla-videos.csv`](../../docs/guias/admin/plantilla-videos.csv) junto a los videos con el nombre `videos.csv`. Puede estar separada con comas o con punto y coma.

## Cómo correrlo

Ponga los videos y `videos.csv` en `tests/precision/videos/` (esa carpeta no se sube al repositorio) y, desde la raíz:

```bash
pnpm precision
```

O indique otra carpeta (por ejemplo un disco externo):

```bash
pnpm precision /media/usb/videos-entrenamiento
pnpm precision /media/usb/videos-entrenamiento --meta 1      # meta de campo: 1 %
```

| Opción | Qué hace |
| --- | --- |
| `carpeta` | Carpeta con los videos y la plantilla. Por defecto `tests/precision/videos`. |
| `--meta N` | Error permitido en %. Por defecto 2 (prototipo). |
| `--plantilla nombre.csv` | Nombre de la plantilla en la carpeta. Por defecto `videos.csv`. |
| `--salida carpeta` | Dónde guardar el informe. Por defecto `tests/precision/resultados`. |

## Qué entrega

En la terminal, y guardado en `tests/precision/resultados/AAAA-MM-DD-HH-MM.md` y `.csv`:

- **Por especie** (solo videos con alevinos): videos, total a mano, total de la app, **error total**, **de más** (lo que sobró en los videos que contaron de más), **de menos** (lo que faltó en los que contaron de menos), **error medio** (promedio sin signo del error de cada video), el peor video y si cumple la meta. Dentro de un mismo video, lo contado de más y de menos se compensa y no se puede separar.
- **Por especie exacta:** lo mismo, solo para los videos con `especie_exacta` (por ejemplo los distintos *Prochilodus*).
- **Sin alevinos:** por tipo (`vacio`, `burbujas`, `basura`), cuántos contó la app en total y el peor video. La meta es **0**.
- **Por video:** a mano, app, diferencia, error, si cumple la meta y cómo encontró el canal (`4 marcas · 9,8 px/cm` o `sin marcas`).
- **No medidos:** videos de la plantilla que no están en la carpeta o que ffmpeg no pudo leer.

El `.csv` trae una fila por video con luz, agua, flujo, celular, tipo, especie exacta, perfil y canal, para filtrar en una hoja de cálculo (por ejemplo, ver si el error sube con poca luz).

Si alguna especie pasa la meta, o si contó algo en un video sin alevinos, el comando termina con error (código 1).

Ejemplo:

```
## Por especie

| Especie   | Videos | A mano | App | Error total | De más | De menos | Error medio | Peor video                                 | Meta |
| --------- | -----: | -----: | --: | ----------: | -----: | -------: | ----------: | ------------------------------------------ | ---- |
| bocachico |      1 |      4 |   4 |       0,0 % |     +0 |       -0 |       0,0 % | 20261020_cachama_mediano_001.mp4 (0,0 %)   | ✓    |
| cachama   |      1 |     10 |   8 |     -20,0 % |     +0 |       -2 |      20,0 % | 20261020_cachama_grande_001.mp4 (-20,0 %)  | ✗    |
| **Total** |      2 |     14 |  12 |     -14,3 % |     +0 |       -2 |      10,0 % | 20261020_cachama_grande_001.mp4 (-20,0 %)  | ✗    |

## Sin alevinos

| Tipo     | Videos | Contados | Peor video                    | Meta |
| -------- | -----: | -------: | ----------------------------- | ---- |
| burbujas |      1 |        0 | 20261020_burbujas_001.mp4 (0) | ✓    |
```

## Ajustes por video

Las columnas `sentido`, `umbral`, `area_minima`, `linea`, `franja_ancho` y `distancia` de la plantilla cambian los ajustes del motor para ese video (los mismos de `/laboratorio`). Vacías: los de fábrica.

Sin `sentido`, el agua baja en la imagen y la franja va abajo, fija, igual que en la app del campesino (ADR 0011). Si el video está grabado con el celular al revés, escriba `arriba` en `sentido`.

## Pruebas del script

`pnpm --filter @contador/precision test` genera con ffmpeg videos sintéticos del canal (mesa oscura, canal iluminado con las 4 marcas, 4 s vacío y alevinos de 4 × 0,7 cm): uno vertical, otro guardado acostado con marca de rotación como los de celular, uno con solo burbujas y basura, y otro con alevinos mezclados con burbujas y basura. Comprueba que encuentra las marcas, que cuenta exacto (0 en el de burbujas y basura) y que arma el informe. Corren también en la CI.
