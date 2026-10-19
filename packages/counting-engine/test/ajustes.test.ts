import { describe, expect, it } from "vitest";
import { CONTROLES_INICIALES, configuracionMotor, franjaPorcentaje, posicionLineaPx, tamanoProceso } from "../src";

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
    const c = configuracionMotor({ ...CONTROLES_INICIALES, umbral: 90, lineaPorcentaje: 50 }, 80, 120);
    expect(c.detector).toEqual({ umbral: 90, areaMinima: CONTROLES_INICIALES.areaMinima, areaTipica: null });
    expect(c.posicionLinea).toBe(60);
    expect(c.aprenderAreaTipica).toBe(true);
  });
});

describe("franja de conteo en los ajustes", () => {
  it("por defecto va cerca de la salida (75 %) y mide el 10 % del canal", () => {
    expect(CONTROLES_INICIALES).toMatchObject({ lineaPorcentaje: 75, franjaAncho: 10 });
    const c = configuracionMotor(CONTROLES_INICIALES, 180, 320);
    expect(c.franja).toEqual({ inicio: 0.7 * 320, fin: 0.8 * 320 });
  });

  it("no se sale del cuadro", () => {
    expect(franjaPorcentaje({ lineaPorcentaje: 98, franjaAncho: 10 })).toEqual([93, 100]);
  });
});
