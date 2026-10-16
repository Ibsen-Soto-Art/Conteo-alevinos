# Precisión del motor

Pasa el motor de conteo por videos grabados en la finca, con conteo a mano conocido, y entrega el **error por video y por especie**. Es la prueba más importante del proyecto: un cambio que empeora el conteo no se publica.

Mide igual que la app: cada cuadro reducido a 320 px de lado mayor, el mismo paso a gris, los mismos ajustes (`packages/counting-engine/src/ajustes.ts`) y sin saltarse cuadros. El error es el del motor **sin** factor de calibración: (app − a mano) ÷ a mano.

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

- **Por especie:** videos, total a mano, total de la app, **error total**, **error medio** (promedio sin signo del error de cada video: cuánto se equivoca un video cualquiera), el peor video y si cumple la meta.
- **Por video:** a mano, app, diferencia, error y si cumple la meta.
- **No medidos:** videos de la plantilla que no están en la carpeta o que ffmpeg no pudo leer.

El `.csv` trae una fila por video con luz, agua, flujo y celular, para filtrar en una hoja de cálculo (por ejemplo, ver si el error sube con poca luz).

Si alguna especie pasa la meta, el comando termina con error (código 1).

Ejemplo:

```
## Por especie

| Especie   | Videos | A mano | App | Error total | Error medio | Peor video                                | Meta |
| --------- | -----: | -----: | --: | ----------: | ----------: | ----------------------------------------- | ---- |
| cachama   |      1 |     10 |   8 |    -20,0 % |      20,0 % | 20261020_cachama_grande_001.mp4 (-20,0 %) | ✗    |
| tilapia   |      1 |     12 |  12 |      0,0 % |       0,0 % | 20261020_tilapia_pequeno_001.mp4 (0,0 %)  | ✓    |
| **Total** |      2 |     22 |  20 |     -9,1 % |       10,0 % | 20261020_cachama_grande_001.mp4 (-20,0 %) | ✗    |
```

## Ajustes por video

Las columnas `sentido`, `umbral`, `area_minima`, `linea` y `distancia` de la plantilla cambian los ajustes del motor para ese video (los mismos de `/laboratorio`). Vacías: los de fábrica.

## Pruebas del script

`pnpm --filter @contador/precision test` genera con ffmpeg videos sintéticos con un número conocido de manchas (uno vertical y otro guardado acostado con marca de rotación, como los de celular) y comprueba que el script cuenta exacto y arma el informe. Corren también en la CI.
