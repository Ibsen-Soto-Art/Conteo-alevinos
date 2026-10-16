"""Paso 3: llevar las pre-etiquetas a CVAT para revisarlas, y traer lo revisado.

    python -m contador_ml.cvat empaquetar     # crea data/cvat/imagenes.zip y preetiquetas.zip
    python -m contador_ml.cvat recibir EXPORTADO.zip   # lo que exportó CVAT en «YOLO 1.1»

Formato «YOLO 1.1» de CVAT: obj.names, obj.data, train.txt y obj_train_data/<imagen>.txt.
Las imágenes se suben sin carpetas; sus nombres ya traen el video (AAAAMMDD_especie_tamano_NNN_00001.jpg).
"""

from __future__ import annotations

import argparse
import zipfile
from pathlib import Path

from .comun import CLASES, CUADROS, CVAT, PREVIAS, REVISADAS, imagenes


def empaquetar(cuadros: Path, previas: Path, destino: Path) -> tuple[Path, Path]:
    destino.mkdir(parents=True, exist_ok=True)
    fotos = imagenes(cuadros)
    nombres = [f.name for f in fotos]
    if len(set(nombres)) != len(nombres):
        raise SystemExit("Hay cuadros con el mismo nombre en videos distintos: revise los nombres de los videos.")

    zip_imagenes = destino / "imagenes.zip"
    with zipfile.ZipFile(zip_imagenes, "w") as z:
        for f in fotos:
            z.write(f, f.name)

    zip_etiquetas = destino / "preetiquetas.zip"
    with zipfile.ZipFile(zip_etiquetas, "w") as z:
        z.writestr("obj.names", "".join(f"{c}\n" for c in CLASES))
        z.writestr("obj.data", f"classes = {len(CLASES)}\ntrain = data/train.txt\nnames = data/obj.names\nbackup = backup/\n")
        z.writestr("train.txt", "".join(f"data/obj_train_data/{f.name}\n" for f in fotos))
        for f in fotos:
            etiqueta = previas / f.relative_to(cuadros).with_suffix(".txt")
            z.writestr(f"obj_train_data/{f.stem}.txt", etiqueta.read_text() if etiqueta.exists() else "")
    return zip_imagenes, zip_etiquetas


def recibir(exportado: Path, cuadros: Path, revisadas: Path) -> int:
    """Copia las etiquetas revisadas a la carpeta de cada video. Un cuadro sin .txt queda sin alevinos."""
    por_nombre = {f.stem: f for f in imagenes(cuadros)}
    escritas = 0
    with zipfile.ZipFile(exportado) as z:
        textos = {Path(n).stem: z.read(n).decode() for n in z.namelist() if n.startswith("obj_train_data/") and n.endswith(".txt")}
        listados = [Path(l.strip()).stem for l in z.read("train.txt").decode().splitlines() if l.strip()] if "train.txt" in z.namelist() else list(textos)
    for nombre in listados:
        foto = por_nombre.get(nombre)
        if foto is None:
            print(f"⚠ {nombre}: no está en data/cuadros, se salta")
            continue
        destino = revisadas / foto.relative_to(cuadros).with_suffix(".txt")
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_text(textos.get(nombre, ""))
        escritas += 1
    return escritas


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="orden", required=True)
    sub.add_parser("empaquetar", help="crear los zip para subir a CVAT")
    r = sub.add_parser("recibir", help="traer el zip exportado de CVAT (YOLO 1.1)")
    r.add_argument("exportado", type=Path)
    a = p.parse_args(argv)

    if a.orden == "empaquetar":
        imgs, etqs = empaquetar(CUADROS, PREVIAS, CVAT)
        print(f"Suba a CVAT:\n  1. {imgs} (al crear la tarea)\n  2. {etqs} (Upload annotations, formato YOLO 1.1)")
    else:
        n = recibir(a.exportado, CUADROS, REVISADAS)
        print(f"{n} cuadros revisados en {REVISADAS}")


if __name__ == "__main__":
    main()
