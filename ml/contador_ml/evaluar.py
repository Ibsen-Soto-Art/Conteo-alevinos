"""Paso 7: mide el detector exportado por especie, en las fotos de validación.

    python -m contador_ml.evaluar                          # el último modelos/*.onnx, fotos de val
    python -m contador_ml.evaluar --modelo modelos/alevinos-20261020-1015.onnx --umbral 0.3

Corre el .onnx con ONNX Runtime (el mismo archivo que irá al teléfono; no usa Ultralytics) en
cada foto de data/conjunto/images/val y compara sus cajas con las etiquetas revisadas:

- **aciertos**: cajas del detector que coinciden con un alevino etiquetado (IoU ≥ 0,5);
- **de más**: cajas del detector donde no hay alevino (burbujas, basura, sombras);
- **de menos**: alevinos etiquetados que el detector no vio.

Agrupa por especie, por especie exacta (data/conjunto/videos.csv, del paso 4) y aparte los
videos sin alevinos (vacío, burbujas, basura), donde toda caja es un error. Guarda el informe en
runs/evaluacion-AAAAMMDD-HHMM.md.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable

import cv2
import numpy as np

from .comun import CONJUNTO, ML, TIPOS_NEGATIVOS, imagenes
from .dividir import especie_de, leer_metadatos

Caja = tuple[float, float, float, float]  # centro x, centro y, ancho, alto (0 a 1)
Prediccion = tuple[float, float, float, float, float]  # caja y confianza


def iou(a: Caja, b: Caja) -> float:
    """Intersección sobre unión de dos cajas (centro, ancho, alto)."""
    ax0, ay0, ax1, ay1 = a[0] - a[2] / 2, a[1] - a[3] / 2, a[0] + a[2] / 2, a[1] + a[3] / 2
    bx0, by0, bx1, by1 = b[0] - b[2] / 2, b[1] - b[3] / 2, b[0] + b[2] / 2, b[1] + b[3] / 2
    inter = max(0.0, min(ax1, bx1) - max(ax0, bx0)) * max(0.0, min(ay1, by1) - max(ay0, by0))
    union = a[2] * a[3] + b[2] * b[3] - inter
    return inter / union if union > 0 else 0.0


def emparejar(predicciones: list[Prediccion], reales: list[Caja], umbral_iou: float = 0.5) -> tuple[int, int, int]:
    """(aciertos, de más, de menos): cada caja real se empareja con a lo sumo una predicción,
    empezando por las más confiables."""
    libres = list(reales)
    aciertos = 0
    for p in sorted(predicciones, key=lambda p: -p[4]):
        mejor = max(range(len(libres)), key=lambda i: iou(p[:4], libres[i]), default=None)
        if mejor is not None and iou(p[:4], libres[mejor]) >= umbral_iou:
            libres.pop(mejor)
            aciertos += 1
    return aciertos, len(predicciones) - aciertos, len(libres)


def leer_etiquetas(ruta: Path) -> list[Caja]:
    if not ruta.exists():
        return []
    return [tuple(map(float, l.split()[1:5])) for l in ruta.read_text().splitlines() if l.strip()]  # type: ignore[misc]


# ---------- el modelo ONNX (salida de YOLO de Ultralytics: 1 × (4 + clases) × N) ----------


def cuadrar(imagen_bgr: np.ndarray, tam: int) -> tuple[np.ndarray, float, int, int]:
    """La imagen en un cuadrado de `tam` sin deformarla (bandas grises), en RGB de 0 a 1,
    con la forma 1 × 3 × tam × tam. Devuelve también la escala y el corrimiento."""
    alto, ancho = imagen_bgr.shape[:2]
    escala = min(tam / alto, tam / ancho)
    nuevo_an, nuevo_al = round(ancho * escala), round(alto * escala)
    dx, dy = (tam - nuevo_an) // 2, (tam - nuevo_al) // 2
    lienzo = np.full((tam, tam, 3), 114, dtype=np.uint8)
    lienzo[dy : dy + nuevo_al, dx : dx + nuevo_an] = cv2.resize(imagen_bgr, (nuevo_an, nuevo_al))
    tensor = lienzo[:, :, ::-1].transpose(2, 0, 1)[None].astype(np.float32) / 255
    return tensor, escala, dx, dy


def decodificar(
    salida: np.ndarray, imagen: tuple[int, int], escala: float, dx: int, dy: int, umbral: float = 0.25, umbral_nms: float = 0.5
) -> list[Prediccion]:
    """Cajas de la salida del modelo, en la imagen original (0 a 1), sin repetidas (NMS)."""
    alto, ancho = imagen
    filas = salida[0].T  # N × (4 + clases)
    confianza = filas[:, 4:].max(axis=1)
    filas, confianza = filas[confianza >= umbral], confianza[confianza >= umbral]
    cajas: list[Prediccion] = []
    for (cx, cy, w, h), c in zip(filas[:, :4], confianza):
        cajas.append((float((cx - dx) / escala / ancho), float((cy - dy) / escala / alto), float(w / escala / ancho), float(h / escala / alto), float(c)))
    elegidas: list[Prediccion] = []
    for caja in sorted(cajas, key=lambda c: -c[4]):
        if all(iou(caja[:4], e[:4]) < umbral_nms for e in elegidas):
            elegidas.append(caja)
    return elegidas


def predictor_onnx(modelo: Path, umbral: float) -> Callable[[np.ndarray], list[Prediccion]]:
    import onnxruntime as ort  # solo hace falta para correr el modelo de verdad

    sesion = ort.InferenceSession(str(modelo), providers=["CPUExecutionProvider"])
    entrada = sesion.get_inputs()[0]
    tam = int(entrada.shape[2])

    def predecir(imagen_bgr: np.ndarray) -> list[Prediccion]:
        tensor, escala, dx, dy = cuadrar(imagen_bgr, tam)
        [salida] = sesion.run(None, {entrada.name: tensor})[:1]
        return decodificar(salida, imagen_bgr.shape[:2], escala, dx, dy, umbral)

    return predecir


# ---------- medir y resumir ----------


@dataclass
class Fila:
    grupo: str
    imagenes: int = 0
    etiquetados: int = 0
    detectados: int = 0
    aciertos: int = 0
    de_mas: int = 0
    de_menos: int = 0
    # Fotos con alguna caja donde no había alevino.
    fotos_con_falsas: int = 0
    videos: set[str] = field(default_factory=set)

    def sumar(self, video: str, etiquetados: int, detectados: int, aciertos: int, de_mas: int, de_menos: int) -> None:
        self.videos.add(video)
        self.imagenes += 1
        self.etiquetados += etiquetados
        self.detectados += detectados
        self.aciertos += aciertos
        self.de_mas += de_mas
        self.de_menos += de_menos
        self.fotos_con_falsas += de_mas > 0

    @property
    def error_conteo(self) -> float | None:
        """(detectados − etiquetados) ÷ etiquetados: lo que pasaría si se contara con estas cajas."""
        return (self.detectados - self.etiquetados) / self.etiquetados if self.etiquetados else None


@dataclass
class Evaluacion:
    especies: dict[str, Fila]
    exactas: dict[str, Fila]
    negativos: dict[str, Fila]
    total: Fila


def evaluar(conjunto: Path, predecir: Callable[[np.ndarray], list[Prediccion]], parte: str = "val", umbral_iou: float = 0.5) -> Evaluacion:
    metadatos = leer_metadatos(conjunto)
    ev = Evaluacion({}, {}, {}, Fila("Total"))
    fotos = imagenes(conjunto / "images" / parte)
    if not fotos:
        raise SystemExit(f"No hay fotos en {conjunto / 'images' / parte}: corra antes «python -m contador_ml.dividir».")
    for foto in fotos:
        video = foto.stem.rsplit("_", 1)[0]
        m = metadatos.get(video, {})
        tipo = m.get("tipo") or "alevinos"
        reales = leer_etiquetas(conjunto / "labels" / parte / f"{foto.stem}.txt")
        pred = predecir(cv2.imread(str(foto)))
        a, mas, menos = emparejar(pred, reales, umbral_iou)
        datos = (video, len(reales), len(pred), a, mas, menos)
        if tipo in TIPOS_NEGATIVOS:
            ev.negativos.setdefault(tipo, Fila(tipo)).sumar(*datos)
            continue
        especie = m.get("especie") or especie_de(video)
        ev.especies.setdefault(especie, Fila(especie)).sumar(*datos)
        if m.get("especie_exacta"):
            clave = f"{especie} · {m['especie_exacta']}"
            ev.exactas.setdefault(clave, Fila(clave)).sumar(*datos)
        ev.total.sumar(*datos)
    return ev


def _porcentaje(x: float | None) -> str:
    return "—" if x is None else f"{x * 100:+.1f} %".replace(".", ",").replace("+0,0", "0,0")


def _tabla(titulo: str, filas: list[Fila]) -> list[str]:
    lineas = [
        f"| {titulo} | Videos | Fotos | Alevinos | Detectados | Aciertos | De más | De menos | Error de conteo |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for f in filas:
        lineas.append(
            f"| {f.grupo} | {len(f.videos)} | {f.imagenes} | {f.etiquetados} | {f.detectados} | {f.aciertos} | +{f.de_mas} | -{f.de_menos} | {_porcentaje(f.error_conteo)} |"
        )
    return lineas


def informe(ev: Evaluacion, modelo: str = "", umbral: float = 0.25) -> str:
    partes = [
        f"# Evaluación del detector {modelo}".rstrip(),
        "",
        f"Fotos de validación (videos que el detector no vio al aprender). Confianza mínima {umbral}; "
        "una caja acierta si se sobrepone a un alevino etiquetado (IoU ≥ 0,5). «De más»: cajas sin alevino; "
        "«De menos»: alevinos sin caja; «Error de conteo»: (detectados − alevinos) ÷ alevinos.",
        "",
        "## Por especie",
        "",
        *_tabla("Especie", [*sorted(ev.especies.values(), key=lambda f: f.grupo), Fila("**Total**", **{k: v for k, v in vars(ev.total).items() if k != "grupo"})]),
    ]
    if ev.exactas:
        partes += ["", "## Por especie exacta", "", *_tabla("Especie exacta", sorted(ev.exactas.values(), key=lambda f: f.grupo))]
    if ev.negativos:
        partes += [
            "",
            "## Sin alevinos",
            "",
            "Canal vacío, solo burbujas o solo basura: toda caja es un error (meta: 0).",
            "",
            "| Tipo | Videos | Fotos | Cajas falsas | Fotos con cajas falsas |",
            "| --- | ---: | ---: | ---: | ---: |",
        ]
        for f in sorted(ev.negativos.values(), key=lambda f: f.grupo):
            partes.append(f"| {f.grupo} | {len(f.videos)} | {f.imagenes} | {f.de_mas} | {f.fotos_con_falsas} |")
    return "\n".join(partes) + "\n"


def ultimo_modelo(carpeta: Path) -> Path:
    modelos = sorted(carpeta.glob("*.onnx"), key=lambda p: p.stat().st_mtime)
    if not modelos:
        raise SystemExit("No hay ningún modelos/*.onnx: exporte antes con «python -m contador_ml.exportar».")
    return modelos[-1]


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--modelo", type=Path, default=None, help="el .onnx (por defecto el último de modelos/)")
    p.add_argument("--umbral", type=float, default=0.25, help="confianza mínima de una caja")
    p.add_argument("--parte", default="val", choices=["val", "train"])
    a = p.parse_args(argv)

    modelo = a.modelo or ultimo_modelo(ML / "modelos")
    ev = evaluar(CONJUNTO, predictor_onnx(modelo, a.umbral), a.parte)
    texto = informe(ev, modelo.name, a.umbral)
    print(texto)
    destino = ML / "runs" / f"evaluacion-{datetime.now():%Y%m%d-%H%M}.md"
    destino.parent.mkdir(exist_ok=True)
    destino.write_text(texto, encoding="utf-8")
    print(f"Informe guardado en {destino}")


if __name__ == "__main__":
    main()
