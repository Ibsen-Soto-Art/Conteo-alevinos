import { describe, expect, it } from "vitest";
import { MotorConteo, type ConfiguracionMotor } from "../src";
import { cuadroCon } from "./sintetico";

/** Canal de 80 × 120, flujo hacia abajo, franja de conteo entre y = 70 y y = 90. */
function config(parcial: Partial<ConfiguracionMotor> = {}): ConfiguracionMotor {
  return {
    detector: { umbral: 128, areaMinima: 6, areaTipica: 16 },
    rastreador: { distanciaMaxima: 12, cuadrosDeGracia: 2 },
    posicionLinea: 80,
    franja: { inicio: 70, fin: 90 },
    sentido: "abajo",
    aprenderAreaTipica: false,
    ...parcial,
  };
}

/** Pasa un alevino de 4 × 4 por las posiciones `ys` (null = no se ve en ese cuadro). */
function recorrer(ys: (number | null)[], parcial: Partial<ConfiguracionMotor> = {}) {
  const motor = new MotorConteo(config(parcial));
  let r = motor.procesar(cuadroCon([]));
  for (const y of ys) r = motor.procesar(cuadroCon(y === null ? [] : [{ x: 30, y, ancho: 4, alto: 4 }]));
  return r;
}

const bajar = (desde: number, hasta: number, paso = 4) => {
  const ys: number[] = [];
  for (let y = desde; paso > 0 ? y <= hasta : y >= hasta; y += paso) ys.push(y);
  return ys;
};

describe("franja de conteo con conteo neto", () => {
  it("un alevino que baja, sube y vuelve a bajar cuenta 1", () => {
    expect(recorrer([...bajar(20, 110), ...bajar(106, 40, -4), ...bajar(44, 110)]).total).toBe(1);
  });

  it("uno que tiembla dentro de la franja cuenta 1", () => {
    const tiembla = [70, 76, 72, 80, 74, 84, 78, 86, 76, 82];
    expect(recorrer([...bajar(20, 66), ...tiembla, ...bajar(90, 110)]).total).toBe(1);
  });

  it("uno que solo sube cuenta 0", () => {
    expect(recorrer(bajar(110, 10, -4)).total).toBe(0);
  });

  it("una pista que se pierde en medio y reaparece cuenta 1", () => {
    // No se ve durante 6 cuadros (más que los 2 de gracia) justo dentro de la franja.
    expect(recorrer([...bajar(20, 66), null, null, null, null, null, null, ...bajar(94, 110)]).total).toBe(1);
  });

  it("una que se pierde y reaparece devolviéndose resta lo que había sumado", () => {
    // Pasa la franja, no se ve 4 cuadros mientras se da vuelta y reaparece subiendo.
    const ys = [...bajar(20, 110), null, null, null, null, ...bajar(94, 30, -4)];
    expect(recorrer(ys).total).toBe(0);
  });

  it("algo que aparece ya pasada la franja y se ve solo 2 cuadros no cuenta (persistencia)", () => {
    expect(recorrer([96, 100]).total).toBe(0);
  });

  it("algo quieto dentro de la franja no cuenta y se descarta como «quieto»", () => {
    const r = recorrer(Array.from({ length: 30 }, () => 80));
    expect(r.total).toBe(0);
    expect(r.detecciones).toHaveLength(0);
    expect(r.descartadas[0]?.motivo).toBe("quieto");
  });

  it("con dos alevinos, uno que se devuelve no le resta al otro", () => {
    const motor = new MotorConteo(config());
    let total = 0;
    const a = [...bajar(20, 110)];
    const b = [...bajar(20, 100), ...bajar(96, 20, -4)];
    for (let k = 0; k < Math.max(a.length, b.length); k++) {
      const objetos = [];
      if (a[k] !== undefined) objetos.push({ x: 10, y: a[k]!, ancho: 4, alto: 4 });
      if (b[k] !== undefined) objetos.push({ x: 60, y: b[k]!, ancho: 4, alto: 4 });
      total = motor.procesar(cuadroCon(objetos)).total;
    }
    expect(total).toBe(1);
  });
});
