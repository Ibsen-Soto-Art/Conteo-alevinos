import { describe, expect, it } from "vitest";
import { CONTROLES_INICIALES, configuracionMotor, posicionLineaPx, tamanoProceso } from "../src";

describe("ajustes del motor", () => {
  it("reduce el video a 320 px de lado mayor, conservando la proporción y sin agrandar", () => {
    expect(tamanoProceso(1920, 1080)).toEqual({ ancho: 320, alto: 180 });
    expect(tamanoProceso(1080, 1920)).toEqual({ ancho: 180, alto: 320 });
    expect(tamanoProceso(200, 100)).toEqual({ ancho: 200, alto: 100 });
  });

  it("la línea en % va sobre el alto si el flujo es vertical y sobre el ancho si es horizontal", () => {
    expect(posicionLineaPx(50, "abajo", 320, 180)).toBe(90);
    expect(posicionLineaPx(50, "derecha", 320, 180)).toBe(160);
    expect(posicionLineaPx(130, "abajo", 320, 180)).toBe(180);
  });

  it("pasa los ajustes al motor y aprende el área típica del lote", () => {
    const c = configuracionMotor({ ...CONTROLES_INICIALES, umbral: 90 }, 80, 120);
    expect(c.detector).toEqual({ umbral: 90, areaMinima: CONTROLES_INICIALES.areaMinima, areaTipica: null });
    expect(c.posicionLinea).toBe(60);
    expect(c.aprenderAreaTipica).toBe(true);
  });
});
