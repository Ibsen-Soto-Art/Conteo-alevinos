import { describe, expect, it } from "vitest";
import { MotorConteo, estadoFlujo, type ConfiguracionMotor } from "../src";
import { PERFIL_PRUEBA } from "./perfil";
import { cuadroCon } from "./sintetico";

function config(parcial: Partial<ConfiguracionMotor> = {}): ConfiguracionMotor {
  return {
    detector: { umbral: 128, areaMinima: 6, areaTipica: 16 },
    rastreador: { distanciaMaxima: 20, cuadrosDeGracia: 2 },
    posicionLinea: 80,
    franja: { inicio: 70, fin: 100 }, // 30 px: el límite es 10 px por cuadro
    sentido: "abajo",
    aprenderAreaTipica: false,
    ...parcial,
  };
}

/** Hace bajar un alevino `paso` px por cuadro, a 30 cuadros por segundo, y devuelve el último resultado. */
function bajar(paso: number, parcial: Partial<ConfiguracionMotor> = {}, cuadros = 12) {
  const motor = new MotorConteo(config(parcial));
  let r = motor.procesar(cuadroCon([]), 0);
  for (let c = 1; c <= cuadros; c++) r = motor.procesar(cuadroCon([{ x: 30, y: 2 + c * paso, ancho: 4, alto: 4 }]), (c * 1000) / 30);
  return { r, motor };
}

describe("velocidad del flujo", () => {
  it("verde hasta el 60 % del límite, ámbar hasta el límite, rojo por encima", () => {
    expect(estadoFlujo(5, 10)).toBe("bien");
    expect(estadoFlujo(8, 10)).toBe("rapido");
    expect(estadoFlujo(12, 10)).toBe("muy-rapido");
  });

  it("el límite es el ancho de la franja ÷ 3 (un alevino debe verse 3 cuadros dentro)", () => {
    const { r } = bajar(4);
    expect(r.flujo).toMatchObject({ limite: 10, estado: "bien" });
    expect(r.flujo!.velocidad).toBeCloseTo(4, 0);
  });

  it("un alevino a 12 px por cuadro en una franja de 30 px es «muy rápido»", () => {
    expect(bajar(12, {}, 8).r.flujo?.estado).toBe("muy-rapido");
  });

  it("sin nada moviéndose no hay medida", () => {
    const motor = new MotorConteo(config());
    expect(motor.procesar(cuadroCon([]), 0).flujo).toBeNull();
  });

  it("mide los cuadros por segundo que procesa y la velocidad en px por segundo", () => {
    const { r, motor } = bajar(4);
    expect(motor.cuadrosPorSegundo).toBeCloseTo(30, 0);
    expect(r.flujo!.pxPorSegundo).toBeCloseTo(120, -1);
  });

  it("con escala y perfil, la franja se ensancha para ver 3 cuadros a la velocidad máxima", () => {
    // Velocidad máxima del perfil 35 cm/s, 10 px/cm, 30 cuadros/s → 11,7 px por cuadro → franja de 35 px.
    const { motor } = bajar(4, { perfil: PERFIL_PRUEBA, pxPorCm: 10, lote: null });
    const f = motor.franja;
    expect(f.fin - f.inicio).toBeCloseTo(35, 0);
    expect((f.inicio + f.fin) / 2).toBeCloseTo(85, 0); // mismo centro
  });
});
