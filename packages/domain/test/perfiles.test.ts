import { describe, expect, it } from "vitest";
import { PERFILES, TAMANOS_CM, VERSION_PERFILES, perfilDe } from "../src";

describe("perfiles de especie", () => {
  it("hay un perfil por cada especie y tamaño, con versión", () => {
    expect(VERSION_PERFILES).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    for (const especie of ["cachama", "pangasius", "bocachico", "otra"] as const) {
      for (const tamano of ["pequeno", "mediano", "grande"] as const) {
        expect(perfilDe(especie, tamano)).toMatchObject({ id: `${especie}-${tamano}`, especie, tamano });
      }
    }
    expect(PERFILES).toHaveLength(12);
  });

  it("los tamaños son 1-3, 3-5 y 5-8 cm, y el perfil acepta un 20 % más a cada lado", () => {
    expect(TAMANOS_CM).toEqual({ pequeno: [1, 3], mediano: [3, 5], grande: [5, 8] });
    expect(perfilDe("cachama", "pequeno").largoCm).toEqual([0.8, 3.6]);
    expect(perfilDe("pangasius", "grande").largoCm).toEqual([4, 9.6]);
  });

  it("«Otra especie» es más amplio que las especies conocidas", () => {
    const otra = perfilDe("otra", "mediano");
    const cachama = perfilDe("cachama", "mediano");
    expect(otra.largoCm[0]).toBeLessThan(cachama.largoCm[0]);
    expect(otra.largoCm[1]).toBeGreaterThan(cachama.largoCm[1]);
    expect(otra.relacionArriba[1]).toBeGreaterThanOrEqual(cachama.relacionArriba[1]);
  });

  it("el bocachico es un solo perfil del género Prochilodus", () => {
    expect(perfilDe("bocachico", "mediano").nombre).toBe("Bocachico (Prochilodus) mediano");
  });

  it("la cachama de lado se ve mucho más ancha que desde arriba; el pangasius menos", () => {
    const anchoDeLado = (e: "cachama" | "pangasius") => {
      const p = perfilDe(e, "mediano");
      return p.relacionArriba[0] / p.relacionLado[0];
    };
    expect(anchoDeLado("cachama")).toBeGreaterThan(anchoDeLado("pangasius"));
  });

  it("los rangos son coherentes: mínimo < máximo, y el área sale del largo y el ancho", () => {
    for (const p of PERFILES) {
      for (const r of [p.largoCm, p.anchoCm, p.areaCm2, p.relacionArriba, p.relacionLado]) expect(r[0]).toBeLessThan(r[1]);
      // el más delgado visto desde arriba y el más grande visto de lado
      expect(p.anchoCm[0]).toBeCloseTo(p.largoCm[0] / p.relacionArriba[1], 6);
      expect(p.anchoCm[1]).toBeCloseTo(p.largoCm[1] / p.relacionLado[0], 6);
      expect(p.areaCm2[0]).toBeCloseTo(0.65 * p.largoCm[0] * p.anchoCm[0], 6);
      expect(p.areaCm2[1]).toBeCloseTo(0.65 * p.largoCm[1] * p.anchoCm[1], 6);
      expect(p.solidezMinima).toBeGreaterThan(0.4);
      expect(p.solidezMinima).toBeLessThan(0.9);
      expect(p.velocidadCmS.maxima).toBeGreaterThan(p.velocidadCmS.tipica);
    }
  });
});
