import { CONTROLES_INICIALES } from "@contador/counting-engine";
import { describe, expect, it } from "vitest";
import { errorRelativo, informeCsv, informeMarkdown, negativos, porEspecie, porEspecieExacta, porcentaje, type Resultado } from "../src/informe";
import type { TipoVideo, VideoDePrueba } from "../src/plantilla";

function r(archivo: string, especie: string, mano: number, app?: number, problema?: string, extra: { tipo?: TipoVideo; especieExacta?: string } = {}): Resultado {
  const video: VideoDePrueba = {
    fila: 2, archivo, tipo: extra.tipo ?? "alevinos", especie, especieExacta: extra.especieExacta ?? "", tamano: "pequeno", conteoAMano: mano,
    luz: "buena", agua: "clara", flujo: "lento", celular: "X", ajustes: CONTROLES_INICIALES, perfil: null,
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
    expect(csv[1]).toBe("a.mp4,tilapia,pequeno,buena,clara,lento,X,100,97,-3.00,,alevinos,,sin perfil,");
    expect(csv[4]).toBe("d.mp4,cachama,pequeno,buena,clara,lento,X,100,,,no está en la carpeta,alevinos,,sin perfil,");
  });

  it("separa lo contado de más y de menos en cada especie", () => {
    const tilapia = porEspecie(resultados).especies[1]!;
    // a.mp4 contó 3 de menos y b.mp4 2 de más: en la suma se compensan, aquí no.
    expect(tilapia).toMatchObject({ deMas: 2, deMenos: 3 });
    expect(informeMarkdown(resultados)).toMatch(/\| tilapia +\| +2 \| +300 \| +299 \| +-0,3 % \| +\+2 \| +-3 \|/);
  });

  it("mide aparte cada especie exacta que se anotó", () => {
    const rs = [
      r("p.mp4", "bocachico", 100, 98, undefined, { especieExacta: "Prochilodus magdalenae" }),
      r("q.mp4", "bocachico", 100, 101, undefined, { especieExacta: "Prochilodus nigricans" }),
      r("s.mp4", "bocachico", 100, 100),
    ];
    expect(porEspecie(rs).especies).toMatchObject([{ grupo: "bocachico", videos: 3, mano: 300, app: 299 }]);
    expect(porEspecieExacta(rs).map((f) => [f.grupo, f.app])).toEqual([
      ["bocachico · Prochilodus magdalenae", 98],
      ["bocachico · Prochilodus nigricans", 101],
    ]);
    expect(informeMarkdown(rs)).toContain("## Por especie exacta");
  });

  it("los videos sin alevinos van aparte: no entran al error por especie y deben contar 0", () => {
    const rs = [
      r("c.mp4", "cachama", 150, 150),
      r("vacio.mp4", "", 0, 0, undefined, { tipo: "vacio" }),
      r("burbujas1.mp4", "", 0, 0, undefined, { tipo: "burbujas" }),
      r("burbujas2.mp4", "", 0, 2, undefined, { tipo: "burbujas" }),
    ];
    expect(porEspecie(rs).total).toMatchObject({ videos: 1, mano: 150, app: 150 });
    expect(negativos(rs)).toEqual([
      { tipo: "burbujas", videos: 2, contados: 2, peor: { archivo: "burbujas2.mp4", contados: 2 } },
      { tipo: "vacio", videos: 1, contados: 0, peor: { archivo: "vacio.mp4", contados: 0 } },
    ]);
    const md = informeMarkdown(rs);
    expect(md).toMatch(/\| burbujas +\| +2 \| +2 \| burbujas2\.mp4 \(2\) \| ✗ +\|/);
    expect(md).toMatch(/\| vacio +\| +1 \| +0 \| .* \| ✓ +\|/);
    expect(md).not.toMatch(/\| vacio\.mp4 .*\| -100/);
  });
});
