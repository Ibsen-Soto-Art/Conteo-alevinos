"""Paso 4: arma el conjunto de entrenamiento y de validación.

    python -m contador_ml.dividir                # con las etiquetas revisadas en CVAT
    python -m contador_ml.dividir --sin-revisar  # solo para probar, con las pre-etiquetas

Se separa **por video**, no por cuadro: dos cuadros del mismo video se parecen tanto que, si
uno queda en entrenamiento y otro en validación, el modelo parece mejor de lo que es. De cada
especie se deja ~20 % de los videos para validar.

Resultado: data/conjunto/{images,labels}/{train,val}/ y data/conjunto/data.yaml, el formato
YOLO que entiende Ultralytics (y que contador_ml.coco convierte para YOLOX o RTMDet).
"""

from __future__ import annotations

import argparse
import random
import shutil
from pathlib import Path

import yaml

from .comun import CLASES, CONJUNTO, CUADROS, PREVIAS, REVISADAS, imagenes


def especie_de(video: str) -> str:
    """De «20261020_cachama_pequeno_001» sale «cachama»."""
    partes = video.split("_")
    return partes[1] if len(partes) > 1 else "sin_especie"


def repartir(videos: list[str], fraccion_val: float = 0.2, semilla: int = 7) -> tuple[list[str], list[str]]:
    """Reparte videos (no cuadros) entre entrenamiento y validación, por especie."""
    por_especie: dict[str, list[str]] = {}
    for v in sorted(videos):
        por_especie.setdefault(especie_de(v), []).append(v)
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


def armar(cuadros: Path, etiquetas: Path, destino: Path, fraccion_val: float = 0.2) -> dict[str, int]:
    if destino.exists():
        shutil.rmtree(destino)
    con_etiqueta = [f for f in imagenes(cuadros) if (etiquetas / f.relative_to(cuadros).with_suffix(".txt")).exists()]
    if not con_etiqueta:
        raise SystemExit(f"No hay cuadros con etiquetas en {etiquetas}.")
    videos = sorted({f.parent.name for f in con_etiqueta})
    entrenar, validar = repartir(videos, fraccion_val)
    conjunto_de = {v: "train" for v in entrenar} | {v: "val" for v in validar}
    cuenta = {"train": 0, "val": 0}
    for f in con_etiqueta:
        parte = conjunto_de[f.parent.name]
        for tipo, origen, ext in (("images", f, f.suffix), ("labels", etiquetas / f.relative_to(cuadros).with_suffix(".txt"), ".txt")):
            d = destino / tipo / parte
            d.mkdir(parents=True, exist_ok=True)
            shutil.copy2(origen, d / f"{f.stem}{ext}")
        cuenta[parte] += 1
    (destino / "data.yaml").write_text(
        yaml.safe_dump(
            {"path": str(destino.resolve()), "train": "images/train", "val": "images/val", "names": dict(enumerate(CLASES))},
            allow_unicode=True,
            sort_keys=False,
        )
    )
    return cuenta | {"videos_train": len(entrenar), "videos_val": len(validar)}


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--sin-revisar", action="store_true", help="usar las pre-etiquetas (sin revisar) para probar")
    p.add_argument("--validacion", type=float, default=0.2, help="fracción de videos para validar")
    a = p.parse_args(argv)
    etiquetas = PREVIAS if a.sin_revisar else REVISADAS
    if a.sin_revisar:
        print("⚠ Usando pre-etiquetas sin revisar: sirve para probar, no para el modelo de verdad.")
    c = armar(CUADROS, etiquetas, CONJUNTO, a.validacion)
    print(f"Entrenamiento: {c['train']} cuadros de {c['videos_train']} videos")
    print(f"Validación:    {c['val']} cuadros de {c['videos_val']} videos")
    print(f"Listo: {CONJUNTO / 'data.yaml'}")


if __name__ == "__main__":
    main()
