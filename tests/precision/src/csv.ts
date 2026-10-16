/**
 * Lee un CSV sencillo: con comas o con punto y coma (Excel en español guarda con «;»),
 * con campos entre comillas y con la marca BOM que Excel pone al principio.
 * Devuelve una fila por línea, con los nombres de columna en minúsculas.
 */
export function leerCsv(texto: string): Record<string, string>[] {
  const limpio = texto.replace(/^﻿/, "");
  const separador = adivinarSeparador(limpio.split(/\r?\n/, 1)[0] ?? "");
  const filas = partir(limpio, separador).filter((f) => f.some((c) => c.trim() !== ""));
  const [cabecera, ...datos] = filas;
  if (!cabecera) return [];
  const columnas = cabecera.map((c) => c.trim().toLowerCase());
  return datos.map((f) => Object.fromEntries(columnas.map((col, i) => [col, (f[i] ?? "").trim()])));
}

function adivinarSeparador(cabecera: string): "," | ";" {
  const contar = (c: string) => cabecera.split(c).length - 1;
  return contar(";") > contar(",") ? ";" : ",";
}

function partir(texto: string, sep: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let entreComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!;
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') entreComillas = false;
      else campo += c;
    } else if (c === '"') entreComillas = true;
    else if (c === sep) {
      fila.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else campo += c;
  }
  if (campo !== "" || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas;
}
