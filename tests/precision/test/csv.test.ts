import { describe, expect, it } from "vitest";
import { leerCsv } from "../src/csv";

describe("leerCsv", () => {
  it("lee con comas y pasa los nombres de columna a minúsculas", () => {
    expect(leerCsv("Archivo,Conteo_a_mano\na.mp4,150\nb.mp4,200\n")).toEqual([
      { archivo: "a.mp4", conteo_a_mano: "150" },
      { archivo: "b.mp4", conteo_a_mano: "200" },
    ]);
  });

  it("lee con punto y coma (Excel en español), con BOM y fin de línea de Windows", () => {
    expect(leerCsv("﻿archivo;notas\r\na.mp4;se cayó uno, al final\r\n")).toEqual([{ archivo: "a.mp4", notas: "se cayó uno, al final" }]);
  });

  it("respeta comillas, comillas dobles adentro y salta las líneas vacías", () => {
    expect(leerCsv('archivo,notas\n\na.mp4,"dijo ""listo"", y siguió"\n\n')).toEqual([{ archivo: "a.mp4", notas: 'dijo "listo", y siguió' }]);
  });

  it("una plantilla vacía no tiene filas", () => {
    expect(leerCsv("archivo,usar\n")).toEqual([]);
    expect(leerCsv("")).toEqual([]);
  });
});
