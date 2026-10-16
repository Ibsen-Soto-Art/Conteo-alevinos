"""Paso 1: saca cuadros de cada video de la plantilla con ffmpeg.

    python -m contador_ml.extraer --videos /ruta/videos-entrenamiento

Guarda un cuadro cada medio segundo (cambie con --cada) en data/cuadros/<video>/, con el
lado mayor de 640 px. No hace falta cada cuadro: dos seguidos son casi iguales.
"""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

from .comun import CUADROS, leer_plantilla


def extraer_video(video: Path, destino: Path, cada: float = 0.5, lado: int = 640) -> int:
    destino.mkdir(parents=True, exist_ok=True)
    escala = f"scale='if(gt(iw,ih),{lado},-2)':'if(gt(iw,ih),-2,{lado})'"
    subprocess.run(
        [
            "ffmpeg", "-loglevel", "error", "-y",
            "-i", str(video),
            "-vf", f"fps=1/{cada},{escala}",
            "-q:v", "2",
            str(destino / f"{video.stem}_%05d.jpg"),
        ],
        check=True,
    )
    return len(list(destino.glob("*.jpg")))


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--videos", type=Path, required=True, help="carpeta con los videos y videos.csv")
    p.add_argument("--plantilla", default="videos.csv")
    p.add_argument("--cada", type=float, default=0.5, help="segundos entre cuadros (por defecto 0,5)")
    p.add_argument("--lado", type=int, default=640, help="lado mayor de los cuadros en px")
    a = p.parse_args(argv)

    videos = leer_plantilla(a.videos / a.plantilla)
    total = 0
    for v in videos:
        ruta = a.videos / v.archivo
        if not ruta.exists():
            print(f"✗ {v.archivo}: no está en la carpeta")
            continue
        n = extraer_video(ruta, CUADROS / v.nombre, a.cada, a.lado)
        total += n
        print(f"✓ {v.archivo}: {n} cuadros")
    print(f"\n{total} cuadros en {CUADROS}")


if __name__ == "__main__":
    main()
