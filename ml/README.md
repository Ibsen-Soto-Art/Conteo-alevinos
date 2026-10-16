# ml/: enseñarle a la app a ver alevinos

Aquí se prepara un **detector**: un archivo (`.onnx`) que, más adelante, la app usará en el teléfono para encontrar cada alevino en la imagen, incluso cuando la luz o el agua no ayudan al motor clásico. Todo esto se hace en un **computador**, no en el teléfono.

La idea, en pocas palabras:

1. Se sacan **fotos** (cuadros) de los videos grabados en la finca.
2. El computador marca **solo** cada alevino con una caja (pre-etiquetas), con el mismo método del motor clásico.
3. Una persona **revisa** esas cajas en CVAT: borra las que sobran y agrega las que faltan.
4. Se separan las fotos en dos grupos: unas para **aprender** y otras para **comprobar**.
5. El computador **entrena** el detector (YOLO nano).
6. Se **exporta** a ONNX, el formato que corre en el teléfono.

> ⚖️ **Licencia.** Este entrenamiento usa **Ultralytics YOLO**, que tiene licencia **AGPL-3.0**. Sirve para pruebas. Antes de **vender el servicio**, hay que comprar la licencia comercial de Ultralytics o cambiar a un detector con licencia **Apache 2.0** (YOLOX o RTMDet). Ver [Cambiar a YOLOX o RTMDet](#cambiar-a-yolox-o-rtmdet) y la ADR [0002](../docs/decisiones/0002-conteo-en-el-telefono.md).

## Antes de empezar

### Lo que necesita

- Los videos grabados según [la guía de grabación](../docs/guias/admin/grabar-videos-de-entrenamiento.md) y la plantilla llena (`videos.csv`) en una carpeta. En los ejemplos: `~/videos-entrenamiento`.
- **ffmpeg** (para sacar los cuadros): `sudo dnf install ffmpeg` (Fedora), `sudo apt install ffmpeg` (Ubuntu); en Windows, desde <https://ffmpeg.org/download.html>.
- **Python 3.12** (las librerías de entrenamiento todavía no siempre funcionan con versiones más nuevas).
- Para entrenar de verdad conviene una tarjeta **NVIDIA**. Sin ella también funciona, pero tarda horas en vez de minutos; otra opción es Google Colab.

### Crear el entorno de Python (una sola vez)

Un «entorno virtual» es una carpeta con su propio Python y sus librerías, para no mezclar con nada más del computador. La forma más sencilla de tener Python 3.12 es con **uv**:

```bash
# 1. Instalar uv (Linux o Mac; en Windows ver https://docs.astral.sh/uv/)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. Crear el entorno con Python 3.12 dentro de ml/ (uv descarga Python 3.12 si no lo tiene)
cd ml
uv venv --python 3.12 .venv

# 3. Activarlo (hay que hacerlo cada vez que abra una terminal nueva)
source .venv/bin/activate          # Windows: .venv\Scripts\activate
```

Si prefiere no usar uv: instale Python 3.12 desde <https://www.python.org/downloads/> y cree el entorno con `python3.12 -m venv .venv`.

Con el entorno activado (la terminal muestra `(.venv)` al principio):

```bash
# 4. PyTorch: elija UNA de las dos líneas
uv pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu    # sin tarjeta NVIDIA
uv pip install torch torchvision                                                    # con tarjeta NVIDIA

# 5. El resto
uv pip install -r requirements.txt
```

(Sin uv, cambie `uv pip` por `pip`.)

Todos los comandos de abajo se corren **dentro de `ml/` y con el entorno activado**.

## Paso 1: sacar cuadros de los videos

```bash
python -m contador_ml.extraer --videos ~/videos-entrenamiento
```

Lee la plantilla `videos.csv`, salta los videos con `usar = no` y guarda **un cuadro cada medio segundo** en `data/cuadros/<video>/`. No hace falta cada cuadro: dos seguidos son casi iguales. Con `--cada 0.25` saca más.

## Paso 2: pre-etiquetar (el computador marca los alevinos)

```bash
python -m contador_ml.preetiquetar --videos ~/videos-entrenamiento
```

Marca con una caja cada mancha oscura, con el umbral y el área mínima de cada video (columnas `umbral` y `area_minima` de la plantilla; si están vacías, los de fábrica). Escribe un archivo `.txt` por cuadro en `data/etiquetas_previas/`, en formato YOLO: una línea por alevino con `clase centro_x centro_y ancho alto`, todo de 0 a 1.

Estas cajas **no son perfectas**: dos alevinos pegados quedan en una sola caja, una burbuja puede salir como alevino. Por eso se revisan.

## Paso 3: revisar en CVAT

[CVAT](https://www.cvat.ai) es una página para dibujar y corregir cajas sobre fotos. Se puede usar gratis en <https://app.cvat.ai> (con cuenta) o instalada en el computador.

**Preparar los archivos:**

```bash
python -m contador_ml.cvat empaquetar
```

Crea en `data/cvat/`:
- `imagenes.zip`: todos los cuadros.
- `preetiquetas.zip`: las cajas del paso 2, en el formato «YOLO 1.1» que entiende CVAT.

**En CVAT:**

1. Entre a <https://app.cvat.ai> y cree una cuenta (**Create an account**).
2. Arriba, **Projects** → **+** → **Create a new project**. Nombre: `alevinos`. En **Labels** toque **Add label**, escriba `alevino` (exactamente así, en minúscula), elija **Rectangle** como tipo y toque **Continue**. Toque **Submit & Open**.
3. Dentro del proyecto, **+** → **Create a new task**. Nombre: por ejemplo `finca-2026-10`. En **Select files** suba `imagenes.zip`. Toque **Submit & Open**.
   - Si son muchas fotos, en **Advanced configuration** ponga **Segment size** en `200`: CVAT reparte el trabajo en partes («jobs») de 200 fotos.
4. En la tarea, **Actions** → **Upload annotations**. Formato **YOLO 1.1**, archivo `preetiquetas.zip`, **OK**. Las cajas del paso 2 aparecen sobre las fotos.
5. Abra el trabajo (el enlace **Job #...**). Para cada foto:
   - **Borre** las cajas que no son alevinos (burbujas, hojas, sombras): clic en la caja y tecla **Supr** (Delete).
   - **Separe** las cajas que tienen dos o más alevinos pegados: borre la caja grande y dibuje una por alevino.
   - **Agregue** los alevinos sin caja: tecla **N**, y arrastre un rectángulo ajustado al alevino.
   - Ajuste bordes arrastrando las esquinas: la caja debe tocar la punta de la cabeza y de la cola.
   - Pase a la siguiente foto con la tecla **F** (la anterior con **D**). Guarde seguido con **Ctrl+S**.
6. Al terminar todas: en el trabajo, **Menu** → **Change job state** → **completed**.
7. Vuelva a la tarea: **Actions** → **Export task dataset** → formato **YOLO 1.1**, sin **Save images**, **OK**. Cuando esté listo, descárguelo desde **Requests** (arriba). Queda un archivo como `task_finca-2026-10_dataset.zip`.

**Traer lo revisado:**

```bash
python -m contador_ml.cvat recibir ~/Descargas/task_finca-2026-10_dataset.zip
```

Copia las cajas revisadas a `data/etiquetas_revisadas/`, en la carpeta de cada video.

Consejos para revisar bien:
- Revise **todas** las fotos de un video, no solo algunas: el modelo aprende tanto de los alevinos como de lo que **no** es alevino.
- Si un alevino se ve solo a medias en el borde de la foto, márquelo igual.
- Si no está seguro de si es un alevino, mire las fotos de antes y después.

> También se puede revisar en **Label Studio** (<https://labelstud.io>): cree un proyecto con la plantilla **Object Detection with Bounding Boxes** y la etiqueta `alevino`, importe las fotos, corrija, y exporte en formato **YOLO**. Ese zip se trae con el mismo comando `recibir` si trae `obj_train_data/` y `train.txt`; si no, copie los `.txt` a `data/etiquetas_revisadas/<video>/` a mano.

## Paso 4: separar fotos para aprender y para comprobar

```bash
python -m contador_ml.dividir
```

Arma `data/conjunto/` con dos grupos:
- **train** (≈ 80 %): las fotos con las que el detector aprende.
- **val** (≈ 20 %): fotos que **no** ve al aprender, para comprobar si de verdad aprendió.

Separa **por video**, no por foto: dos fotos del mismo video son casi iguales, y si una queda en cada grupo el resultado parece mejor de lo que es. De cada especie deja al menos un video para comprobar (si tiene dos o más).

Para probar todo el camino antes de revisar en CVAT: `python -m contador_ml.dividir --sin-revisar` (usa las pre-etiquetas; no sirve para el modelo de verdad).

## Paso 5: entrenar

```bash
python -m contador_ml.entrenar
```

Entrena **YOLO nano** (el más pequeño, para que corra rápido en el teléfono) durante 100 épocas, con imágenes de 320 px, el mismo tamaño que procesa el teléfono. Una **época** es una pasada por todas las fotos de entrenamiento.

- Con tarjeta NVIDIA tarda minutos; sin ella, horas.
- Si sale un error de memoria, baje el lote: `--lote 8` (o 4).
- Para una prueba rápida: `python -m contador_ml.entrenar --epocas 3 --lote 4`.

El resultado queda en `runs/alevinos/` (o `alevinos2`, `alevinos3`... si entrena varias veces):
- `weights/best.pt`: el mejor detector del entrenamiento.
- `results.png`: cómo fue mejorando. La curva **mAP50** debe subir y quedar alta (cerca de 0,9 o más para un buen detector).
- `val_batch0_pred.jpg`: fotos de comprobación con lo que detectó. Mírelas: ahí se ve si se le escapan alevinos o si marca cosas que no son.

## Paso 6: exportar a ONNX

```bash
python -m contador_ml.exportar
```

Toma el último `best.pt` y lo convierte a **ONNX**, el formato que la app correrá en el teléfono con ONNX Runtime Web. Queda en `modelos/alevinos-AAAAMMDD-HHMM.onnx` (pesa unos 10 MB), con un `.json` al lado que dice el tamaño de entrada, las clases, de dónde salió y su licencia. El comando lo prueba antes de terminar.

Los modelos, los cuadros y los entrenamientos **no van al repositorio** (pesan mucho; `.gitignore` los excluye): guárdelos en un disco o en la nube. Conectar el modelo a la app es un paso posterior (ADR 0002).

## Cambiar a YOLOX o RTMDet

Antes de cobrar por el servicio hay que salir de la licencia AGPL de Ultralytics (o comprar la comercial). Todo lo de los pasos 1 a 4 sirve igual: solo cambian el entrenamiento y la exportación.

1. Corra los pasos 1 a 4 igual que siempre.
2. Convierta el conjunto al formato **COCO**, que usan YOLOX y RTMDet:

   ```bash
   python -m contador_ml.coco
   ```

   Escribe `data/conjunto/coco/train.json` y `val.json`, que apuntan a las mismas imágenes de `data/conjunto/images/`.
3. Entrene con uno de los dos (licencia Apache 2.0):
   - **YOLOX** (<https://github.com/Megvii-BaseDetection/YOLOX>): modelo `yolox_nano`, una clase (`alevino`), con los JSON de arriba. Exporta a ONNX con su script `tools/export_onnx.py`.
   - **RTMDet** de MMDetection (<https://github.com/open-mmlab/mmdetection>): configuración `rtmdet_tiny`, `num_classes=1`, `metainfo=dict(classes=("alevino",))`, con los JSON de arriba. Exporta a ONNX con MMDeploy.
4. Use el mismo tamaño de entrada (320) y guarde el `.onnx` en `modelos/` con su `.json`, cambiando `"licencia"` a `Apache-2.0`.

Cada detector entrega la salida del ONNX con una forma distinta: cuando la app use el modelo, el lector de la salida va en un adaptador por detector, sin tocar el resto del motor.

## Qué hay en esta carpeta

| Archivo | Para qué |
| --- | --- |
| `contador_ml/extraer.py` | Paso 1: cuadros de los videos |
| `contador_ml/preetiquetar.py` | Paso 2: cajas automáticas con el método del motor clásico |
| `contador_ml/cvat.py` | Paso 3: llevar a CVAT y traer lo revisado |
| `contador_ml/dividir.py` | Paso 4: separar por video en train y val |
| `contador_ml/entrenar.py` | Paso 5: entrenar YOLO nano (Ultralytics, AGPL) |
| `contador_ml/exportar.py` | Paso 6: exportar a ONNX y comprobarlo |
| `contador_ml/coco.py` | Convertir a COCO para YOLOX o RTMDet |
| `requirements*.txt` | Librerías: `-datos` (pasos 1 a 4), completo (entrenar), `-pruebas` |
| `tests/` | Pruebas de los pasos 1 a 4 (`python -m pytest tests`); las corre la CI |
| `data/`, `runs/`, `modelos/` | Se crean al usarlo; no van al repositorio |
