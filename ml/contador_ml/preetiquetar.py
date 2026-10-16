"""Paso 2: marca automáticamente cada alevino con el mismo método del motor clásico.

    python -m contador_ml.preetiquetar --videos /ruta/videos-entrenamiento

Con luz por debajo del canal cada alevino es una mancha oscura: umbral, manchas conectadas
y área mínima, como packages/counting-engine. Escribe una caja por mancha en formato YOLO
(data/etiquetas_previas/<video>/<cuadro>.txt). Son **pre-etiquetas**: una persona las
revisa en CVAT (paso 3) antes de entrenar.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np

from .comun import AREA_MINIMA_MOTOR, CUADROS, LADO_MOTOR, PREVIAS, UMBRAL, imagenes, leer_plantilla


def detectar_cajas(imagen_bgr: np.ndarray, umbral: float = UMBRAL, area_minima_motor: float = AREA_MINIMA_MOTOR) -> list[tuple[float, float, float, float]]:
    """Cajas (centro x, centro y, ancho, alto) normalizadas de 0 a 1, una por mancha oscura.

    `area_minima_motor` está en píxeles de un cuadro de 320 px (como en la app); aquí se
    escala al tamaño real de la imagen.
    """
    alto, ancho = imagen_bgr.shape[:2]
    gris = cv2.cvtColor(imagen_bgr, cv2.COLOR_BGR2GRAY)
    mascara = (gris < umbral).astype(np.uint8)
    # Vecinos en cruz, como el detector del motor.
    n, _, stats, _ = cv2.connectedComponentsWithStats(mascara, connectivity=4)
    escala = (max(alto, ancho) / LADO_MOTOR) ** 2
    cajas = []
    for x, y, w, h, area in stats[1:n]:
        if area < area_minima_motor * escala:
            continue
        cajas.append(((x + w / 2) / ancho, (y + h / 2) / alto, w / ancho, h / alto))
    return cajas


def escribir_yolo(ruta: Path, cajas: list[tuple[float, float, float, float]], clase: int = 0) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text("".join(f"{clase} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}\n" for cx, cy, w, h in cajas))


def preetiquetar(cuadros: Path, destino: Path, ajustes: dict[str, tuple[float, float]] | None = None) -> tuple[int, int]:
    """Escribe un .txt por cuadro. `ajustes`: (umbral, área mínima) por video. Devuelve (cuadros, cajas)."""
    ajustes = ajustes or {}
    fotos = imagenes(cuadros)
    total = 0
    for foto in fotos:
        umbral, area = ajustes.get(foto.parent.name, (UMBRAL, AREA_MINIMA_MOTOR))
        cajas = detectar_cajas(cv2.imread(str(foto)), umbral, area)
        escribir_yolo(destino / foto.relative_to(cuadros).with_suffix(".txt"), cajas)
        total += len(cajas)
    return len(fotos), total


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--videos", type=Path, help="carpeta con videos.csv, para usar el umbral y área de cada video")
    p.add_argument("--plantilla", default="videos.csv")
    a = p.parse_args(argv)

    ajustes = {}
    if a.videos:
        ajustes = {v.nombre: (v.umbral, v.area_minima) for v in leer_plantilla(a.videos / a.plantilla)}

    fotos, cajas = preetiquetar(CUADROS, PREVIAS, ajustes)
    print(f"{fotos} cuadros, {cajas} alevinos marcados en {PREVIAS}")


if __name__ == "__main__":
    main()
