"""Convierte el conjunto (formato YOLO) a COCO, para entrenar con YOLOX o RTMDet (licencia Apache 2.0).

    python -m contador_ml.coco

Escribe data/conjunto/coco/train.json y val.json, que usan las mismas imágenes de
data/conjunto/images/. Ver «Cambiar a YOLOX o RTMDet» en ml/README.md.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2

from .comun import CLASES, CONJUNTO, imagenes


def yolo_a_coco(conjunto: Path, parte: str) -> dict:
    datos: dict = {
        "images": [],
        "annotations": [],
        "categories": [{"id": i + 1, "name": c} for i, c in enumerate(CLASES)],
    }
    for id_imagen, foto in enumerate(imagenes(conjunto / "images" / parte), start=1):
        alto, ancho = cv2.imread(str(foto)).shape[:2]
        datos["images"].append({"id": id_imagen, "file_name": f"images/{parte}/{foto.name}", "width": ancho, "height": alto})
        etiqueta = conjunto / "labels" / parte / f"{foto.stem}.txt"
        for linea in etiqueta.read_text().splitlines() if etiqueta.exists() else []:
            if not linea.strip():
                continue
            clase, cx, cy, w, h = linea.split()
            bw, bh = float(w) * ancho, float(h) * alto
            x, y = float(cx) * ancho - bw / 2, float(cy) * alto - bh / 2
            datos["annotations"].append(
                {
                    "id": len(datos["annotations"]) + 1,
                    "image_id": id_imagen,
                    "category_id": int(clase) + 1,
                    "bbox": [round(x, 2), round(y, 2), round(bw, 2), round(bh, 2)],
                    "area": round(bw * bh, 2),
                    "iscrowd": 0,
                }
            )
    return datos


def main(argv: list[str] | None = None) -> None:
    argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter).parse_args(argv)
    (CONJUNTO / "coco").mkdir(exist_ok=True)
    for parte in ("train", "val"):
        datos = yolo_a_coco(CONJUNTO, parte)
        (CONJUNTO / "coco" / f"{parte}.json").write_text(json.dumps(datos, ensure_ascii=False))
        print(f"{parte}: {len(datos['images'])} imágenes, {len(datos['annotations'])} alevinos")


if __name__ == "__main__":
    main()
