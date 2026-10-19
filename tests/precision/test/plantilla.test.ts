import { readFileSync } from "node:fs";
import { CONTROLES_INICIALES } from "@contador/counting-engine";
import { describe, expect, it } from "vitest";
import { leerPlantilla } from "../src/plantilla";

const CABECERA = readFileSync(new URL("../../../docs/guias/admin/plantilla-videos.csv", import.meta.url), "utf8").trim();

describe("leerPlantilla", () => {
  it("la plantilla de la guía tiene las columnas que lee el script", () => {
    for (const c of ["archivo", "usar", "especie", "tamano", "conteo_a_mano", "luz", "celular", "sentido", "umbral", "area_minima", "linea", "distancia"]) {
      expect(CABECERA.split(",")).toContain(c);
    }
  });

  it("lee un video con los ajustes de fábrica si las columnas técnicas van vacías", () => {
    const p = leerPlantilla(`${CABECERA}\n20261020_cachama_pequeno_001.mp4,si,2026-10-20,La Esperanza,Cachama,Pequeño,150,2,buena,clara,despacio,Samsung A15,25,,,,,,`);
    expect(p.problemas).toEqual([]);
    expect(p.videos[0]).toMatchObject({
      archivo: "20261020_cachama_pequeno_001.mp4",
      especie: "cachama",
      tamano: "pequeno",
      conteoAMano: 150,
      celular: "Samsung A15",
      ajustes: CONTROLES_INICIALES,
    });
  });

  it("usa el sentido y los ajustes técnicos de la fila", () => {
    const p = leerPlantilla(`archivo;conteo_a_mano;sentido;umbral;area_minima;linea;franja_ancho;distancia\na.mp4;1.200;Izquierda;120;8;40;14;30,5`);
    expect(p.videos[0]!.conteoAMano).toBe(1200);
    expect(p.videos[0]!.ajustes).toEqual({ umbral: 120, areaMinima: 8, lineaPorcentaje: 40, franjaAncho: 14, sentido: "izquierda", distanciaMaxima: 30.5 });
  });

  it("acepta los nombres de columna con tilde", () => {
    expect(leerPlantilla("Archivo,Tamaño,Conteo_a_mano\na.mp4,Grande,10").videos[0]!.tamano).toBe("grande");
  });

  it("salta los videos con usar = no y explica las filas que no sirven", () => {
    const p = leerPlantilla(
      ["archivo,usar,conteo_a_mano,sentido", "a.mp4,no,100,", ",si,100,", "c.mp4,si,cien,", "d.mp4,sí,0,", "e.mp4,,100,diagonal", "f.mp4,Sí,100,"].join("\n"),
    );
    expect(p.omitidos).toBe(1);
    expect(p.videos.map((v) => v.archivo)).toEqual(["f.mp4"]);
    expect(p.problemas).toEqual([
      "Fila 3: falta el nombre del archivo.",
      "Fila 4 (c.mp4): «conteo_a_mano» debe ser un número entero mayor que 0.",
      "Fila 5 (d.mp4): «conteo_a_mano» debe ser un número entero mayor que 0.",
      "Fila 6 (e.mp4): «sentido» debe ser abajo, arriba, derecha o izquierda.",
    ]);
  });
});
