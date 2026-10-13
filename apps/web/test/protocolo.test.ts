import { describe, expect, it } from "vitest";
import { CONTROLES_INICIALES, configuracionMotor, posicionLineaPx, tamanoProceso } from "../src/features/conteo/protocolo";

describe("tamanoProceso", () => {
  it("reduce un video horizontal a 320 px de lado mayor", () => {
    expect(tamanoProceso(1920, 1080)).toEqual({ ancho: 320, alto: 180 });
  });

  it("reduce un video vertical del celular conservando la proporción", () => {
    expect(tamanoProceso(1080, 1920)).toEqual({ ancho: 180, alto: 320 });
  });

  it("no agranda un video pequeño", () => {
    expect(tamanoProceso(200, 100)).toEqual({ ancho: 200, alto: 100 });
  });
});

describe("posicionLineaPx", () => {
  it("con flujo vertical usa el alto del cuadro", () => {
    expect(posicionLineaPx(50, "abajo", 320, 180)).toBe(90);
    expect(posicionLineaPx(25, "arriba", 320, 180)).toBe(45);
  });

  it("con flujo horizontal usa el ancho del cuadro", () => {
    expect(posicionLineaPx(50, "derecha", 320, 180)).toBe(160);
    expect(posicionLineaPx(10, "izquierda", 320, 180)).toBe(32);
  });

  it("no deja la línea fuera del cuadro", () => {
    expect(posicionLineaPx(130, "abajo", 320, 180)).toBe(180);
    expect(posicionLineaPx(-5, "abajo", 320, 180)).toBe(0);
  });
});

describe("configuracionMotor", () => {
  it("pasa los controles al motor y aprende el área típica del lote", () => {
    const c = configuracionMotor({ ...CONTROLES_INICIALES, umbral: 90, lineaPorcentaje: 50 }, 80, 120);
    expect(c.detector).toEqual({ umbral: 90, areaMinima: CONTROLES_INICIALES.areaMinima, areaTipica: null });
    expect(c.posicionLinea).toBe(60);
    expect(c.aprenderAreaTipica).toBe(true);
  });
});
