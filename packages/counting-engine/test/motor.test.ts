import { describe, expect, it } from "vitest";
import { MotorConteo, detectarManchas, pesoDeMancha, type ConfiguracionMotor } from "../src";
import { cuadroCon, type Objeto } from "./sintetico";

function config(parcial: Partial<ConfiguracionMotor> = {}): ConfiguracionMotor {
  return {
    detector: { umbral: 128, areaMinima: 6, areaTipica: 16 },
    rastreador: { distanciaMaxima: 12, cuadrosDeGracia: 2 },
    posicionLinea: 60,
    sentido: "abajo",
    aprenderAreaTipica: false,
    ...parcial,
  };
}

/** Hace pasar objetos por el canal moviéndolos `paso` píxeles por cuadro. */
function pasar(motor: MotorConteo, objetos: Objeto[], cuadros: number, paso: number) {
  let total = 0;
  for (let c = 0; c < cuadros; c++) {
    total = motor.procesar(cuadroCon(objetos.map((o) => ({ ...o, y: o.y + c * paso })))).total;
  }
  return total;
}

describe("detector", () => {
  it("encuentra cada mancha oscura con su centro", () => {
    const d = detectarManchas(cuadroCon([{ x: 10, y: 10, ancho: 4, alto: 4 }]), {
      umbral: 128,
      areaMinima: 6,
      areaTipica: null,
    });
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ x: 11.5, y: 11.5, area: 16, peso: 1 });
  });

  it("ignora puntos más pequeños que el área mínima", () => {
    const d = detectarManchas(cuadroCon([{ x: 10, y: 10, ancho: 2, alto: 2 }]), {
      umbral: 128,
      areaMinima: 6,
      areaTipica: null,
    });
    expect(d).toHaveLength(0);
  });

  it("no busca fuera de la zona del canal", () => {
    const d = detectarManchas(cuadroCon([{ x: 60, y: 10, ancho: 4, alto: 4 }]), {
      umbral: 128,
      areaMinima: 6,
      areaTipica: null,
      zona: { x: 0, y: 0, ancho: 40, alto: 120 },
    });
    expect(d).toHaveLength(0);
  });

  it("una mancha del doble del tamaño típico pesa 2", () => {
    expect(pesoDeMancha(16, 16)).toBe(1);
    expect(pesoDeMancha(24, 16)).toBe(1);
    expect(pesoDeMancha(32, 16)).toBe(2);
    expect(pesoDeMancha(50, 16)).toBe(3);
    expect(pesoDeMancha(200, null)).toBe(1);
  });
});

describe("motor de conteo", () => {
  it("cuenta un alevino que cruza la línea", () => {
    const motor = new MotorConteo(config());
    expect(pasar(motor, [{ x: 30, y: 5, ancho: 4, alto: 4 }], 30, 4)).toBe(1);
  });

  it("cuenta dos alevinos que pasan a la vez", () => {
    const motor = new MotorConteo(config());
    const objetos = [
      { x: 10, y: 5, ancho: 4, alto: 4 },
      { x: 50, y: 15, ancho: 4, alto: 4 },
    ];
    expect(pasar(motor, objetos, 30, 4)).toBe(2);
  });

  it("dos alevinos pegados cuentan como 2", () => {
    const motor = new MotorConteo(config());
    expect(pasar(motor, [{ x: 30, y: 5, ancho: 8, alto: 4 }], 30, 4)).toBe(2);
  });

  it("no cuenta dos veces si el alevino tiembla sobre la línea", () => {
    const motor = new MotorConteo(config());
    const ys = [50, 54, 58, 61, 57, 62, 58, 63, 70, 80];
    let total = 0;
    for (const y of ys) total = motor.procesar(cuadroCon([{ x: 30, y, ancho: 4, alto: 4 }])).total;
    expect(total).toBe(1);
  });

  it("no cuenta lo que va contra el flujo", () => {
    const motor = new MotorConteo(config());
    expect(pasar(motor, [{ x: 30, y: 100, ancho: 4, alto: 4 }], 25, -4)).toBe(0);
  });

  it("reiniciar deja el contador en cero para la siguiente bolsa", () => {
    const motor = new MotorConteo(config());
    pasar(motor, [{ x: 30, y: 5, ancho: 4, alto: 4 }], 30, 4);
    motor.reiniciarConteo();
    expect(pasar(motor, [{ x: 30, y: 5, ancho: 4, alto: 4 }], 30, 4)).toBe(1);
  });

  it("aprende el área típica del lote", () => {
    const motor = new MotorConteo(
      config({ detector: { umbral: 128, areaMinima: 6, areaTipica: null }, aprenderAreaTipica: true }),
    );
    // 12 alevinos sueltos por cuadro: a los 5 cuadros ya hay 60 muestras
    const fila = Array.from({ length: 12 }, (_, i) => ({ x: 2 + (i % 6) * 13, y: 2 + Math.floor(i / 6) * 10, ancho: 4, alto: 4 }));
    for (let c = 0; c < 5; c++) motor.procesar(cuadroCon(fila));
    expect(motor.areaTipica).toBe(16);
  });

  it("cuenta una fila de 20 alevinos espaciados", () => {
    const motor = new MotorConteo(config());
    const objetos = Array.from({ length: 20 }, (_, i) => ({ x: 30, y: 5 - i * 20, ancho: 4, alto: 4 }));
    expect(pasar(motor, objetos, 130, 4)).toBe(20);
  });
});
