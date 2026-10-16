"""Cosas que usan todos los pasos: carpetas, la plantilla de videos y los ajustes del motor."""

from __future__ import annotations

import csv
import io
import unicodedata
from dataclasses import dataclass
from pathlib import Path

ML = Path(__file__).resolve().parent.parent
DATOS = ML / "data"
CUADROS = DATOS / "cuadros"
PREVIAS = DATOS / "etiquetas_previas"
REVISADAS = DATOS / "etiquetas_revisadas"
CONJUNTO = DATOS / "conjunto"
CVAT = DATOS / "cvat"

# Una sola clase: para contar basta saber dónde hay un alevino.
CLASES = ["alevino"]
EXTENSIONES_IMAGEN = (".jpg", ".jpeg", ".png")

# Ajustes de fábrica del motor (packages/counting-engine/src/ajustes.ts), medidos en un
# cuadro de 320 px de lado mayor.
LADO_MOTOR = 320
UMBRAL = 100
AREA_MINIMA_MOTOR = 6


def normalizar(texto: str) -> str:
    """«Tamaño» → «tamano», «Sí» → «si»."""
    sin_tildes = unicodedata.normalize("NFD", texto)
    return "".join(c for c in sin_tildes if unicodedata.category(c) != "Mn").strip().lower()


@dataclass
class Video:
    archivo: str
    especie: str
    tamano: str
    conteo_a_mano: int | None
    umbral: float
    area_minima: float

    @property
    def nombre(self) -> str:
        """Nombre sin extensión: se usa para las carpetas de cuadros."""
        return Path(self.archivo).stem


def leer_plantilla(ruta: Path) -> list[Video]:
    """Lee la plantilla de videos (docs/guias/admin/plantilla-videos.csv), con comas o punto y coma.

    Salta las filas con «usar = no» y las que no tienen archivo.
    """
    texto = ruta.read_text(encoding="utf-8-sig")
    cabecera = texto.splitlines()[0] if texto else ""
    separador = ";" if cabecera.count(";") > cabecera.count(",") else ","
    videos: list[Video] = []
    for fila in csv.DictReader(io.StringIO(texto), delimiter=separador):
        f = {normalizar(k or ""): (v or "").strip() for k, v in fila.items()}
        if normalizar(f.get("usar", "")) in ("no", "n", "0", "false") or not f.get("archivo"):
            continue
        conteo = f.get("conteo_a_mano", "").replace(".", "").replace(" ", "")
        videos.append(
            Video(
                archivo=f["archivo"],
                especie=normalizar(f.get("especie", "")) or "sin_especie",
                tamano=normalizar(f.get("tamano", "")),
                conteo_a_mano=int(conteo) if conteo.isdigit() else None,
                umbral=_numero(f.get("umbral"), UMBRAL),
                area_minima=_numero(f.get("area_minima"), AREA_MINIMA_MOTOR),
            )
        )
    return videos


def _numero(texto: str | None, por_defecto: float) -> float:
    try:
        return float((texto or "").replace(",", ".")) if texto else por_defecto
    except ValueError:
        return por_defecto


def imagenes(carpeta: Path) -> list[Path]:
    return sorted(p for p in carpeta.rglob("*") if p.suffix.lower() in EXTENSIONES_IMAGEN)
