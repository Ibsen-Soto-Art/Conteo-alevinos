import { CONTROLES_INICIALES } from "@contador/counting-engine";
import { describe, expect, it } from "vitest";
import { errorRelativo, informeCsv, informeMarkdown, porEspecie, porcentaje, type Resultado } from "../src/informe";
import type { VideoDePrueba } from "../src/plantilla";

function r(archivo: string, especie: string, mano: number, app?: number, problema?: string): Resultado {
  const video: VideoDePrueba = {
    fila: 2, archivo, especie, tamano: "pequeno", conteoAMano: mano, luz: "buena", agua: "clara", flujo: "despacio", celular: "X", ajustes: CONTROLES_INICIALES,
  };
  return { video, app, problema };
}

const resultados = [
  r("a.mp4", "tilapia", 100, 97),
  r("b.mp4", "tilapia", 200, 202),
  r("c.mp4", "cachama", 150, 150),
  r("d.mp4", "cachama", 100, undefined, "no está en la carpeta"),
];

describe("informe de precisión", () => {
  it("el error es (app − a mano) ÷ a mano", () => {
    expect(errorRelativo(97, 100)).toBeCloseTo(-0.03);
    expect(errorRelativo(102, 100)).toBeCloseTo(0.02);
  });

  it("resume por especie sumando los videos, y da el error medio sin signo y el peor video", () => {
    const { especies, total } = porEspecie(resultados);
    expect(especies.map((e) => e.grupo)).toEqual(["cachama", "tilapia"]);
    const tilapia = especies[1]!;
    expect(tilapia).toMatchObject({ videos: 2, mano: 300, app: 299 });
    expect(tilapia.error).toBeCloseTo(-1 / 300);
    expect(tilapia.errorMedioAbs).toBeCloseTo((0.03 + 0.01) / 2);
    expect(tilapia.peor.archivo).toBe("a.mp4");
    expect(total).toMatchObject({ videos: 3, mano: 450, app: 449 });
  });

  it("escribe los porcentajes en español, con signo", () => {
    expect(porcentaje(0.0153)).toBe("+1,5 %");
    expect(porcentaje(-0.03)).toBe("-3,0 %");
    expect(porcentaje(0)).toBe("0,0 %");
  });

  it("el informe tiene la tabla por especie, por video, la meta y los no medidos", () => {
    const md = informeMarkdown(resultados, 0.02, new Date(2026, 9, 20, 10, 0));
    expect(md).toContain("## Por especie");
    expect(md).toMatch(/\| tilapia +\| +2 \| +300 \| +299 \| +-0,3 % \|/);
    expect(md).toMatch(/\| a\.mp4 +\| tilapia \| pequeno \| +100 \| +97 \| +-3 \| +-3,0 % \| ✗ +\|/);
    expect(md).toMatch(/\| c\.mp4 .*\| +0,0 % \| ✓ +\|/);
    expect(md).toContain("- d.mp4: no está en la carpeta");
  });

  it("el CSV tiene una fila por video, también los no medidos", () => {
    const csv = informeCsv(resultados).trim().split("\n");
    expect(csv).toHaveLength(5);
    expect(csv[1]).toBe("a.mp4,tilapia,pequeno,buena,clara,despacio,X,100,97,-3.00,");
    expect(csv[4]).toBe("d.mp4,cachama,pequeno,buena,clara,despacio,X,100,,,no está en la carpeta");
  });
});
