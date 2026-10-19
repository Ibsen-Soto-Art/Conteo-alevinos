"""Paso 4: arma el conjunto de entrenamiento y de validación.

    python -m contador_ml.dividir --videos /ruta/videos-entrenamiento   # con las etiquetas revisadas en CVAT
    python -m contador_ml.dividir --sin-revisar                         # solo para probar, con las pre-etiquetas

Se separa **por video**, no por cuadro: dos cuadros del mismo video se parecen tanto que, si
uno queda en entrenamiento y otro en validación, el modelo parece mejor de lo que es. De cada
especie (y de cada tipo de video sin alevinos: vacío, burbujas, basura) se deja ~20 % de los
videos para validar.

Resultado: data/conjunto/{images,labels}/{train,val}/ y data/conjunto/data.yaml, el formato
YOLO que entiende Ultralytics (y que contador_ml.coco convierte para YOLOX o RTMDet). Una sola
clase, «alevino»; los cuadros sin alevinos van con su .txt vacío (imágenes de fondo).
Además data/conjunto/videos.csv: de cada video, en qué parte quedó, su tipo, especie, especie
exacta y tamaño, para medir el error por especie (contador_ml.evaluar).
"""

from __future__ import annotations

import argparse
import csv
import random
import shutil
from pathlib import Path
from typing import Callable

import yaml

from .comun import CLASES, CONJUNTO, CUADROS, PREVIAS, REVISADAS, Video, imagenes, leer_plantilla

COLUMNAS_METADATOS = ["video", "parte", "tipo", "especie", "especie_exacta", "tamano", "cuadros"]


def especie_de(video: str) -> str:
    """De «20261020_cachama_pequeno_001» sale «cachama» (y de «20261020_burbujas_001», «burbujas»)."""
    partes = video.split("_")
    return partes[1] if len(partes) > 1 else "sin_especie"


def repartir(
    videos: list[str], fraccion_val: float = 0.2, semilla: int = 7, grupo_de: Callable[[str], str] = especie_de
) -> tuple[list[str], list[str]]:
    """Reparte videos (no cuadros) entre entrenamiento y validación, por grupo (especie o tipo)."""
    por_especie: dict[str, list[str]] = {}
    for v in sorted(videos):
        por_especie.setdefault(grupo_de(v), []).append(v)
    azar = random.Random(semilla)
    entrenar, validar = [], []
    for grupo in por_especie.values():
        azar.shuffle(grupo)
        n_val = round(len(grupo) * fraccion_val)
        if len(grupo) >= 2:
            n_val = max(1, n_val)
        validar += grupo[:n_val]
        entrenar += grupo[n_val:]
    return sorted(entrenar), sorted(validar)


def armar(
    cuadros: Path, etiquetas: Path, destino: Path, fraccion_val: float = 0.2, metadatos: dict[str, Video] | None = None
) -> dict[str, int]:
    """`metadatos`: de la plantilla, por nombre de video. Sin ellos, la especie sale del nombre."""
    metadatos = metadatos or {}
    if destino.exists():
        shutil.rmtree(destino)
    con_etiqueta = [f for f in imagenes(cuadros) if (etiquetas / f.relative_to(cuadros).with_suffix(".txt")).exists()]
    if not con_etiqueta:
        raise SystemExit(f"No hay cuadros con etiquetas en {etiquetas}.")
    videos = sorted({f.parent.name for f in con_etiqueta})
    grupo_de = lambda v: metadatos[v].grupo if v in metadatos else especie_de(v)  # noqa: E731
    entrenar, validar = repartir(videos, fraccion_val, grupo_de=grupo_de)
    conjunto_de = {v: "train" for v in entrenar} | {v: "val" for v in validar}
    cuenta = {"train": 0, "val": 0}
    for f in con_etiqueta:
        parte = conjunto_de[f.parent.name]
        for tipo, origen, ext in (("images", f, f.suffix), ("labels", etiquetas / f.relative_to(cuadros).with_suffix(".txt"), ".txt")):
            d = destino / tipo / parte
            d.mkdir(parents=True, exist_ok=True)
            shutil.copy2(origen, d / f"{f.stem}{ext}")
        cuenta[parte] += 1
    escribir_metadatos(destino / "videos.csv", videos, conjunto_de, metadatos, con_etiqueta)
    (destino / "data.yaml").write_text(
        yaml.safe_dump(
            {"path": str(destino.resolve()), "train": "images/train", "val": "images/val", "names": dict(enumerate(CLASES))},
            allow_unicode=True,
            sort_keys=False,
        )
    )
    return cuenta | {"videos_train": len(entrenar), "videos_val": len(validar)}


def escribir_metadatos(ruta: Path, videos: list[str], conjunto_de: dict[str, str], metadatos: dict[str, Video], cuadros: list[Path]) -> None:
    """Una fila por video: parte, tipo, especie, especie exacta, tamaño y cuántos cuadros tiene."""
    with ruta.open("w", newline="", encoding="utf-8") as f:
        escritor = csv.writer(f)
        escritor.writerow(COLUMNAS_METADATOS)
        for v in videos:
            m = metadatos.get(v)
            partes = v.split("_")
            escritor.writerow([
                v,
                conjunto_de[v],
                m.tipo if m else "alevinos",
                m.especie if m else especie_de(v),
                m.especie_exacta if m else "",
                m.tamano if m else (partes[2] if len(partes) > 3 else ""),
                sum(c.parent.name == v for c in cuadros),
            ])


def leer_metadatos(conjunto: Path) -> dict[str, dict[str, str]]:
    """Lee data/conjunto/videos.csv: por nombre de video, sus datos."""
    ruta = conjunto / "videos.csv"
    if not ruta.exists():
        return {}
    with ruta.open(encoding="utf-8") as f:
        return {fila["video"]: fila for fila in csv.DictReader(f)}


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--sin-revisar", action="store_true", help="usar las pre-etiquetas (sin revisar) para probar")
    p.add_argument("--validacion", type=float, default=0.2, help="fracción de videos para validar")
    p.add_argument("--videos", type=Path, help="carpeta con videos.csv: tipo, especie y especie exacta de cada video")
    p.add_argument("--plantilla", default="videos.csv")
    a = p.parse_args(argv)
    metadatos = {v.nombre: v for v in leer_plantilla(a.videos / a.plantilla)} if a.videos else {}
    if not a.videos:
        print("⚠ Sin --videos, la especie sale del nombre del archivo y no se guarda la especie exacta.")
    etiquetas = PREVIAS if a.sin_revisar else REVISADAS
    if a.sin_revisar:
        print("⚠ Usando pre-etiquetas sin revisar: sirve para probar, no para el modelo de verdad.")
    c = armar(CUADROS, etiquetas, CONJUNTO, a.validacion, metadatos)
    print(f"Entrenamiento: {c['train']} cuadros de {c['videos_train']} videos")
    print(f"Validación:    {c['val']} cuadros de {c['videos_val']} videos")
    print(f"Listo: {CONJUNTO / 'data.yaml'}")


if __name__ == "__main__":
    main()
