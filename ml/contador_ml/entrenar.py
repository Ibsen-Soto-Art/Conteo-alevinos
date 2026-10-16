"""Paso 5: entrena el detector YOLO nano con Ultralytics.

    python -m contador_ml.entrenar                     # 100 épocas, imágenes de 320 px
    python -m contador_ml.entrenar --epocas 3 --lote 4 # prueba rápida

Lee data/conjunto/data.yaml (paso 4) y guarda el resultado en runs/<nombre>/weights/best.pt.

LICENCIA: Ultralytics es AGPL-3.0. Sirve para pruebas; antes de vender el servicio hay que
comprar su licencia comercial o cambiar a YOLOX o RTMDet (ver ml/README.md y la ADR 0002).
Este archivo y exportar.py son los únicos que usan Ultralytics.
"""

from __future__ import annotations

import argparse

from .comun import CONJUNTO, ML


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--modelo", default="yolo11n.pt", help="modelo base de Ultralytics (nano: rápido en el teléfono)")
    p.add_argument("--epocas", type=int, default=100)
    p.add_argument("--tam", type=int, default=320, help="tamaño de imagen; el mismo que procesa el teléfono")
    p.add_argument("--lote", type=int, default=16, help="imágenes por paso; bájelo si se acaba la memoria")
    p.add_argument("--dispositivo", default=None, help="'cpu', '0' (primera tarjeta NVIDIA) o vacío para elegir solo")
    p.add_argument("--nombre", default="alevinos")
    a = p.parse_args(argv)

    datos = CONJUNTO / "data.yaml"
    if not datos.exists():
        raise SystemExit("Falta data/conjunto/data.yaml: corra antes «python -m contador_ml.dividir».")

    from ultralytics import YOLO  # import aquí: es pesado y solo hace falta para entrenar

    modelo = YOLO(a.modelo)
    resultado = modelo.train(
        data=str(datos),
        epochs=a.epocas,
        imgsz=a.tam,
        batch=a.lote,
        device=a.dispositivo,
        project=str(ML / "runs"),
        name=a.nombre,
        # Los alevinos pasan en cualquier dirección: voltear arriba-abajo también es realista.
        flipud=0.5,
        fliplr=0.5,
        # Muchos alevinos pequeños por imagen.
        max_det=500,
    )
    print(f"\nListo. Pesos: {resultado.save_dir}/weights/best.pt")
    print("Siguiente: python -m contador_ml.exportar")


if __name__ == "__main__":
    main()
