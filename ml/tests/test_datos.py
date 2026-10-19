import json
import subprocess
import zipfile
from pathlib import Path

import cv2
import numpy as np
import pytest
import yaml

from contador_ml.coco import yolo_a_coco
from contador_ml.comun import leer_plantilla
from contador_ml.cvat import empaquetar, recibir
from contador_ml.dividir import armar, leer_metadatos, repartir
from contador_ml.evaluar import cuadrar, decodificar, emparejar, evaluar, informe
from contador_ml.extraer import extraer_video
from contador_ml.preetiquetar import detectar_cajas, preetiquetar

PLANTILLA = Path(__file__).resolve().parents[2] / "docs/guias/admin/plantilla-videos.csv"


def cuadro_con(manchas: list[tuple[int, int, int, int]], ancho: int = 640, alto: int = 360) -> np.ndarray:
    """Fondo iluminado (230) con rectángulos oscuros (30), como el canal con luz por debajo."""
    img = np.full((alto, ancho, 3), 230, dtype=np.uint8)
    for x, y, w, h in manchas:
        img[y : y + h, x : x + w] = 30
    return img


# ---------- plantilla ----------


def test_lee_la_plantilla_con_comas_o_punto_y_coma(tmp_path: Path):
    cabecera = PLANTILLA.read_text(encoding="utf-8").strip()
    fila = "20261020_cachama_pequeno_001.mp4,si,,2026-10-20,La Esperanza,Cachama,,Pequeño,150,2,buena,clara,lento,Moto G,25,abajo,,110,8,,,"
    (tmp_path / "a.csv").write_text(f"﻿{cabecera}\n{fila}\n", encoding="utf-8")
    (tmp_path / "b.csv").write_text("Archivo;Usar;Conteo_a_mano\nx.mp4;no;10\ny.mp4;sí;1.200\n;si;5\n", encoding="utf-8")

    [v] = leer_plantilla(tmp_path / "a.csv")
    assert (v.nombre, v.especie, v.tamano, v.conteo_a_mano, v.umbral, v.area_minima) == (
        "20261020_cachama_pequeno_001", "cachama", "pequeno", 150, 110, 8,
    )
    [y] = leer_plantilla(tmp_path / "b.csv")
    assert (y.archivo, y.conteo_a_mano, y.umbral) == ("y.mp4", 1200, 100)


def test_lee_el_tipo_y_la_especie_exacta(tmp_path: Path):
    (tmp_path / "c.csv").write_text(
        "archivo,tipo,especie,especie_exacta,tamano,conteo_a_mano\n"
        "a.mp4,,Bocachico,Prochilodus magdalenae,mediano,100\n"
        "b.mp4,Burbujas,,,,0\n",
        encoding="utf-8",
    )
    a, b = leer_plantilla(tmp_path / "c.csv")
    assert (a.tipo, a.especie, a.especie_exacta, a.negativo, a.grupo) == ("alevinos", "bocachico", "Prochilodus magdalenae", False, "bocachico")
    assert (b.tipo, b.especie, b.negativo, b.grupo) == ("burbujas", "", True, "burbujas")


# ---------- paso 1: cuadros ----------


def test_saca_un_cuadro_cada_medio_segundo_con_lado_de_640(tmp_path: Path):
    video = tmp_path / "v.mp4"
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=white:s=720x1280:r=30:d=2", "-c:v", "mpeg4", str(video)],
        check=True,
    )
    assert extraer_video(video, tmp_path / "cuadros") == 4
    primero = cv2.imread(str(sorted((tmp_path / "cuadros").glob("*.jpg"))[0]))
    assert primero.shape[:2] == (640, 360)


# ---------- paso 2: pre-etiquetas ----------


def test_marca_cada_mancha_oscura_y_deja_el_ruido():
    # Tres alevinos y un punto de ruido de 2 × 2 (más chico que el área mínima).
    img = cuadro_con([(100, 100, 24, 10), (300, 200, 20, 12), (500, 50, 16, 16), (600, 300, 2, 2)])
    cajas = sorted(detectar_cajas(img))
    assert len(cajas) == 3
    cx, cy, w, h = cajas[0]
    assert cx == pytest.approx(112 / 640) and cy == pytest.approx(105 / 360)
    assert w == pytest.approx(24 / 640) and h == pytest.approx(10 / 360)


def test_el_umbral_decide_que_es_alevino():
    img = cuadro_con([(100, 100, 24, 10)])
    img[100:110, 100:124] = 120  # una sombra clara
    assert detectar_cajas(img, umbral=100) == []
    assert len(detectar_cajas(img, umbral=140)) == 1


def test_preetiqueta_una_carpeta_en_formato_yolo(tmp_path: Path):
    (tmp_path / "cuadros/v1").mkdir(parents=True)
    cv2.imwrite(str(tmp_path / "cuadros/v1/v1_00001.jpg"), cuadro_con([(100, 100, 24, 10), (300, 200, 20, 12)]))
    cv2.imwrite(str(tmp_path / "cuadros/v1/v1_00002.jpg"), cuadro_con([]))
    assert preetiquetar(tmp_path / "cuadros", tmp_path / "previas") == (2, 2)
    lineas = (tmp_path / "previas/v1/v1_00001.txt").read_text().splitlines()
    assert len(lineas) == 2 and all(l.startswith("0 ") and len(l.split()) == 5 for l in lineas)
    assert (tmp_path / "previas/v1/v1_00002.txt").read_text() == ""


def test_los_videos_sin_alevinos_quedan_sin_cajas(tmp_path: Path):
    # En un video de burbujas, una mancha oscura es justo lo que el detector debe aprender a NO marcar.
    (tmp_path / "cuadros/burbujas").mkdir(parents=True)
    cv2.imwrite(str(tmp_path / "cuadros/burbujas/burbujas_00001.jpg"), cuadro_con([(100, 100, 16, 16)]))
    assert preetiquetar(tmp_path / "cuadros", tmp_path / "previas", sin_alevinos={"burbujas"}) == (1, 0)
    assert (tmp_path / "previas/burbujas/burbujas_00001.txt").read_text() == ""


# ---------- paso 3: CVAT ----------


def test_cvat_ida_y_vuelta(tmp_path: Path):
    cuadros, previas = tmp_path / "cuadros", tmp_path / "previas"
    for video in ("20261020_cachama_pequeno_001", "20261020_tilapia_grande_001"):
        (cuadros / video).mkdir(parents=True)
        cv2.imwrite(str(cuadros / video / f"{video}_00001.jpg"), cuadro_con([(100, 100, 24, 10)]))
    preetiquetar(cuadros, previas)

    imgs, etqs = empaquetar(cuadros, previas, tmp_path / "cvat")
    assert sorted(zipfile.ZipFile(imgs).namelist()) == ["20261020_cachama_pequeno_001_00001.jpg", "20261020_tilapia_grande_001_00001.jpg"]
    with zipfile.ZipFile(etqs) as z:
        assert {"obj.names", "obj.data", "train.txt"} <= set(z.namelist())
        assert z.read("obj.names").decode() == "alevino\n"
        assert len(z.read("obj_train_data/20261020_cachama_pequeno_001_00001.txt").decode().splitlines()) == 1

    # Lo que devuelve CVAT tiene el mismo formato: se simula que la persona borró una caja falsa.
    exportado = tmp_path / "exportado.zip"
    with zipfile.ZipFile(etqs) as z, zipfile.ZipFile(exportado, "w") as salida:
        for n in z.namelist():
            datos = b"" if n.endswith("tilapia_grande_001_00001.txt") else z.read(n)
            salida.writestr(n, datos)
    assert recibir(exportado, cuadros, tmp_path / "revisadas") == 2
    assert (tmp_path / "revisadas/20261020_tilapia_grande_001/20261020_tilapia_grande_001_00001.txt").read_text() == ""
    assert (tmp_path / "revisadas/20261020_cachama_pequeno_001/20261020_cachama_pequeno_001_00001.txt").read_text() != ""


# ---------- paso 4: dividir ----------


def test_reparte_por_video_y_por_especie():
    videos = [f"2026102{i}_cachama_pequeno_00{i}" for i in range(5)] + [f"2026102{i}_tilapia_grande_00{i}" for i in range(3)] + ["20261020_yaque_mediano_001"]
    entrenar, validar = repartir(videos)
    assert not set(entrenar) & set(validar)
    assert sorted(entrenar + validar) == sorted(videos)
    assert sum("cachama" in v for v in validar) == 1 and sum("tilapia" in v for v in validar) == 1
    # Una especie con un solo video queda para entrenar.
    assert "20261020_yaque_mediano_001" in entrenar
    assert repartir(videos) == (entrenar, validar)  # siempre igual


def test_arma_el_conjunto_sin_mezclar_videos(tmp_path: Path):
    cuadros, etiquetas = tmp_path / "cuadros", tmp_path / "etiquetas"
    for i in range(4):
        video = f"2026102{i}_cachama_pequeno_00{i}"
        for j in range(3):
            (cuadros / video).mkdir(parents=True, exist_ok=True)
            (etiquetas / video).mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(cuadros / video / f"{video}_0000{j}.jpg"), cuadro_con([(10, 10, 20, 10)]))
            (etiquetas / video / f"{video}_0000{j}.txt").write_text("0 0.5 0.5 0.1 0.1\n")
    destino = tmp_path / "conjunto"
    c = armar(cuadros, etiquetas, destino)
    assert c == {"train": 9, "val": 3, "videos_train": 3, "videos_val": 1}

    videos_de = lambda parte: {p.stem.rsplit("_", 1)[0] for p in (destino / "images" / parte).glob("*.jpg")}
    assert not videos_de("train") & videos_de("val")
    assert len(list((destino / "labels/val").glob("*.txt"))) == 3
    datos = yaml.safe_load((destino / "data.yaml").read_text())
    assert datos["train"] == "images/train" and datos["val"] == "images/val" and datos["names"] == {0: "alevino"}


def test_guarda_tipo_especie_y_especie_exacta_y_reparte_tambien_los_negativos(tmp_path: Path):
    from contador_ml.comun import Video

    cuadros, etiquetas = tmp_path / "cuadros", tmp_path / "etiquetas"
    metadatos = {}
    nombres = [f"2026102{i}_bocachico_mediano_00{i}" for i in range(4)] + [f"2026102{i}_burbujas_00{i}" for i in range(2)]
    for i, video in enumerate(nombres):
        (cuadros / video).mkdir(parents=True)
        (etiquetas / video).mkdir(parents=True)
        cv2.imwrite(str(cuadros / video / f"{video}_00001.jpg"), cuadro_con([]))
        negativo = "burbujas" in video
        (etiquetas / video / f"{video}_00001.txt").write_text("" if negativo else "0 0.5 0.5 0.1 0.1\n")
        metadatos[video] = Video(
            archivo=f"{video}.mp4", especie="" if negativo else "bocachico", tamano="" if negativo else "mediano",
            conteo_a_mano=0 if negativo else 10, umbral=100, area_minima=6,
            tipo="burbujas" if negativo else "alevinos", especie_exacta="" if negativo or i % 2 else "Prochilodus magdalenae",
        )
    destino = tmp_path / "conjunto"
    armar(cuadros, etiquetas, destino, metadatos=metadatos)
    filas = leer_metadatos(destino)
    assert set(filas) == set(nombres)
    assert filas["20261020_bocachico_mediano_000"] == {
        "video": "20261020_bocachico_mediano_000", "parte": filas["20261020_bocachico_mediano_000"]["parte"], "tipo": "alevinos",
        "especie": "bocachico", "especie_exacta": "Prochilodus magdalenae", "tamano": "mediano", "cuadros": "1",
    }
    # Uno de los dos videos de burbujas queda para comprobar, con su etiqueta vacía.
    burbujas_val = [v for v, f in filas.items() if f["tipo"] == "burbujas" and f["parte"] == "val"]
    assert len(burbujas_val) == 1
    assert (destino / "labels/val" / f"{burbujas_val[0]}_00001.txt").read_text() == ""


# ---------- COCO (YOLOX / RTMDet) ----------


def test_convierte_a_coco_con_cajas_en_pixeles(tmp_path: Path):
    (tmp_path / "images/val").mkdir(parents=True)
    (tmp_path / "labels/val").mkdir(parents=True)
    cv2.imwrite(str(tmp_path / "images/val/a.jpg"), cuadro_con([], 640, 360))
    (tmp_path / "labels/val/a.txt").write_text("0 0.5 0.5 0.25 0.1\n")
    coco = yolo_a_coco(tmp_path, "val")
    assert coco["images"] == [{"id": 1, "file_name": "images/val/a.jpg", "width": 640, "height": 360}]
    assert coco["categories"] == [{"id": 1, "name": "alevino"}]
    [anotacion] = coco["annotations"]
    assert anotacion["bbox"] == [240.0, 162.0, 160.0, 36.0]
    assert anotacion["category_id"] == 1 and anotacion["area"] == 5760.0
    json.dumps(coco)


# ---------- paso 7: evaluar por especie ----------


def test_empareja_cajas_y_separa_lo_de_mas_y_lo_de_menos():
    reales = [(0.2, 0.2, 0.1, 0.1), (0.6, 0.6, 0.1, 0.1)]
    pred = [(0.21, 0.2, 0.1, 0.1, 0.9), (0.2, 0.21, 0.1, 0.1, 0.5), (0.9, 0.9, 0.05, 0.05, 0.8)]
    # Acierta el primero; la segunda caja sobre el mismo alevino y la de la esquina sobran; falta el de (0.6, 0.6).
    assert emparejar(pred, reales) == (1, 2, 1)
    assert emparejar([], reales) == (0, 0, 2)
    assert emparejar(pred, []) == (0, 3, 0)


def test_decodifica_la_salida_de_yolo_en_la_imagen_original():
    imagen = np.zeros((640, 360, 3), dtype=np.uint8)  # vertical, como el celular
    tensor, escala, dx, dy = cuadrar(imagen, 320)
    assert tensor.shape == (1, 3, 320, 320) and (escala, dx, dy) == (0.5, 70, 0)
    # Un alevino en el centro de la imagen original (180, 320), de 20 × 60 px; otro casi igual (repetido) y uno flojo.
    salida = np.array([[[70 + 90, 70 + 91, 100], [160, 160, 50], [10, 10, 10], [30, 30, 30], [0.9, 0.6, 0.1]]], dtype=np.float32)
    [caja] = decodificar(salida, imagen.shape[:2], escala, dx, dy, umbral=0.25)
    assert caja[:4] == pytest.approx((0.5, 0.5, 20 / 360, 60 / 640))
    assert caja[4] == pytest.approx(0.9)


def test_evalua_por_especie_por_especie_exacta_y_los_negativos_aparte(tmp_path: Path):
    from contador_ml.comun import Video

    cuadros, etiquetas = tmp_path / "cuadros", tmp_path / "etiquetas"
    metadatos = {}
    videos = {"20261020_cachama_pequeno_001": "alevinos", "20261020_bocachico_mediano_001": "alevinos", "20261020_burbujas_001": "burbujas"}
    for video, tipo in videos.items():
        (cuadros / video).mkdir(parents=True)
        (etiquetas / video).mkdir(parents=True)
        cv2.imwrite(str(cuadros / video / f"{video}_00001.jpg"), cuadro_con([]))
        (etiquetas / video / f"{video}_00001.txt").write_text("" if tipo == "burbujas" else "0 0.2 0.2 0.1 0.1\n0 0.6 0.6 0.1 0.1\n")
        especie = "" if tipo == "burbujas" else video.split("_")[1]
        metadatos[video] = Video(f"{video}.mp4", especie, "", 0, 100, 6, tipo=tipo, especie_exacta="Prochilodus magdalenae" if especie == "bocachico" else "")
    destino = tmp_path / "conjunto"
    armar(cuadros, etiquetas, destino, fraccion_val=0.0, metadatos=metadatos)  # todo en train: se evalúa en train

    # Un detector de mentiras: ve bien el primer alevino, se le escapa el segundo y marca una burbuja.
    predecir = lambda img: [(0.2, 0.2, 0.1, 0.1, 0.9), (0.9, 0.1, 0.05, 0.05, 0.7)]
    ev = evaluar(destino, predecir, parte="train")
    cachama = ev.especies["cachama"]
    assert (cachama.imagenes, cachama.etiquetados, cachama.detectados, cachama.aciertos, cachama.de_mas, cachama.de_menos) == (1, 2, 2, 1, 1, 1)
    assert cachama.error_conteo == 0.0  # en el número se compensan; por eso se mide de más y de menos
    assert set(ev.exactas) == {"bocachico · Prochilodus magdalenae"}
    assert ev.negativos["burbujas"].de_mas == 2 and ev.negativos["burbujas"].fotos_con_falsas == 1
    assert (ev.total.etiquetados, ev.total.aciertos) == (4, 2)  # los negativos no entran al total

    texto = informe(ev, "prueba.onnx")
    assert "| cachama | 1 | 1 | 2 | 2 | 1 | +1 | -1 | 0,0 % |" in texto
    assert "| **Total** | 2 | 2 | 4 | 4 | 2 | +2 | -2 | 0,0 % |" in texto
    assert "## Por especie exacta" in texto and "| burbujas | 1 | 1 | 2 | 1 |" in texto
