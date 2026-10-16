"""Paso 6: exporta el detector entrenado a ONNX, el formato que corre en el teléfono.

    python -m contador_ml.exportar                 # el último best.pt de runs/
    python -m contador_ml.exportar --pesos runs/alevinos2/weights/best.pt

Guarda modelos/alevinos-AAAAMMDD-HHMM.onnx y, al lado, un .json con lo que la app necesita
saber (tamaño de entrada, clases) y de dónde salió. Comprueba el archivo con ONNX Runtime.
"""

from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime
from pathlib import Path

import numpy as np

from .comun import CLASES, ML


def ultimo_best(runs: Path) -> Path:
    candidatos = sorted(runs.glob("*/weights/best.pt"), key=lambda p: p.stat().st_mtime)
    if not candidatos:
        raise SystemExit("No hay ningún runs/*/weights/best.pt: entrene antes con «python -m contador_ml.entrenar».")
    return candidatos[-1]


def comprobar_onnx(ruta: Path, tam: int) -> list[tuple[int, ...]]:
    """Corre el modelo con una imagen vacía y devuelve la forma de sus salidas."""
    import onnxruntime as ort

    sesion = ort.InferenceSession(str(ruta), providers=["CPUExecutionProvider"])
    entrada = sesion.get_inputs()[0]
    salidas = sesion.run(None, {entrada.name: np.zeros((1, 3, tam, tam), dtype=np.float32)})
    return [tuple(s.shape) for s in salidas]


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--pesos", type=Path, default=None)
    p.add_argument("--tam", type=int, default=320, help="tamaño de entrada; el mismo del entrenamiento")
    a = p.parse_args(argv)

    from ultralytics import YOLO

    pesos = a.pesos or ultimo_best(ML / "runs")
    exportado = Path(YOLO(str(pesos)).export(format="onnx", imgsz=a.tam, opset=17, simplify=True, dynamic=False))

    destino_dir = ML / "modelos"
    destino_dir.mkdir(exist_ok=True)
    nombre = f"alevinos-{datetime.now():%Y%m%d-%H%M}"
    destino = destino_dir / f"{nombre}.onnx"
    shutil.copy2(exportado, destino)

    formas = comprobar_onnx(destino, a.tam)
    ficha = {
        "modelo": destino.name,
        "entrada": [1, 3, a.tam, a.tam],
        "salidas": [list(f) for f in formas],
        "clases": CLASES,
        "origen": str(pesos),
        "fecha": datetime.now().isoformat(timespec="seconds"),
        "licencia": "AGPL-3.0 (entrenado con Ultralytics): no usar en el servicio cobrado sin licencia comercial",
    }
    (destino_dir / f"{nombre}.json").write_text(json.dumps(ficha, ensure_ascii=False, indent=2))
    print(f"Listo: {destino} ({destino.stat().st_size / 1e6:.1f} MB), salidas {formas}")


if __name__ == "__main__":
    main()
