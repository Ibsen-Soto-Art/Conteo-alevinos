import { describe, expect, it } from "vitest";
import { MotorConteo, rangoDelLote, type ConfiguracionMotor } from "../src";
import { PERFIL_PRUEBA } from "./perfil";
import { cuadroConFiguras, type Figura } from "./sintetico";

function config(): ConfiguracionMotor {
  return {
    detector: { umbral: 128, areaMinima: 6, areaTipica: null },
    rastreador: { distanciaMaxima: 30, cuadrosDeGracia: 2 },
    posicionLinea: 120,
    franja: { inicio: 110, fin: 130 },
    sentido: "abajo",
    aprenderAreaTipica: false,
    perfil: PERFIL_PRUEBA,
  };
}

/** Pasa por el canal grupos de figuras (una fila por grupo) y devuelve el motor. */
function pasar(motor: MotorConteo, grupos: ((y: number) => Figura[])[]) {
  for (const figuras of grupos) for (let y = -10; y <= 260; y += 8) motor.procesar(cuadroConFiguras(figuras(y)));
  return motor;
}

const pez = (largo: number, ancho: number, cx = 80) => (y: number): Figura[] => [{ tipo: "elipse", cx, cy: y, largo, ancho, angulo: 90 }];

describe("la prueba de 100 aprende el lote", () => {
  it("guarda la mediana y la dispersión de los alevinos contados (uno por pista)", () => {
    const motor = pasar(new MotorConteo(config()), [pez(38, 8), pez(40, 8), pez(42, 9), pez(40, 8), pez(41, 8)]);
    expect(motor.procesar(cuadroConFiguras([])).total).toBe(5);
    const e = motor.estadisticasDelConteo;
    expect(e?.muestras).toBe(5);
    expect(e!.largo.mediana).toBeGreaterThan(37);
    expect(e!.largo.mediana).toBeLessThan(43);
    expect(e!.relacion.mediana).toBeGreaterThan(4);
    expect(e!.largo.dispersion).toBeGreaterThanOrEqual(0);
  });

  it("aunque el lote sea muy parejo (dispersión 0), el rango acepta ±25 % alrededor de la mediana", () => {
    const r = rangoDelLote({ mediana: 40, dispersion: 0 });
    expect(r[0]).toBe(30);
    expect(r[1]).toBe(50);
    expect(rangoDelLote({ mediana: 40, dispersion: 10 })).toEqual([24, 64]); // sin pasar de 0,6× y 1,6×
  });

  it("los pegados (peso 2) no entran en las medidas de un alevino", () => {
    const pegados = (y: number): Figura[] => [...pez(40, 8, 76)(y), ...pez(40, 8, 84)(y)];
    const motor = pasar(new MotorConteo({ ...config(), lote: { largo: { mediana: 40, dispersion: 1 }, ancho: { mediana: 8, dispersion: 0.5 }, area: { mediana: 250, dispersion: 10 }, relacion: { mediana: 5, dispersion: 0.3 }, muestras: 30 } }), [pez(40, 8), pegados, pez(40, 8)]);
    expect(motor.procesar(cuadroConFiguras([])).total).toBe(4);
    expect(motor.estadisticasDelConteo?.muestras).toBe(2);
  });

  it("volver a cero borra lo medido", () => {
    const motor = pasar(new MotorConteo(config()), [pez(40, 8), pez(40, 8)]);
    motor.reiniciarConteo();
    expect(motor.estadisticasDelConteo).toBeNull();
  });
});
