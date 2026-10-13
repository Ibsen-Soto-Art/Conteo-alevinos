import { describe, expect, it } from "vitest";
import { calcularCalibracion, corregirConteo } from "../src/calibracion";

describe("calcularCalibracion", () => {
  it("calcula el factor del ejemplo del documento (97 de 100)", () => {
    const r = calcularCalibracion([{ contadosAMano: 100, contadosPorApp: 97 }]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.factor).toBeCloseTo(1.0309, 4);
  });

  it("suma varias pasadas", () => {
    const r = calcularCalibracion([
      { contadosAMano: 100, contadosPorApp: 97 },
      { contadosAMano: 100, contadosPorApp: 99 },
    ]);
    expect(r.ok && r.factor).toBeCloseTo(200 / 196, 6);
  });

  it("rechaza un factor fuera de 0,90 a 1,10", () => {
    const r = calcularCalibracion([{ contadosAMano: 100, contadosPorApp: 80 }]);
    expect(r).toMatchObject({ ok: false, motivo: "fuera_de_rango" });
  });

  it("rechaza datos vacíos", () => {
    expect(calcularCalibracion([])).toMatchObject({ ok: false, motivo: "sin_datos" });
  });
});

describe("corregirConteo", () => {
  it("corrige 970 a 1000 con el factor 100/97", () => {
    expect(corregirConteo(970, 100 / 97)).toBe(1000);
  });
});
