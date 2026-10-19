import { describe, expect, it } from "vitest";
import { MotorConteo, encontrarManchas, estadisticasDe, perfilEnPixeles, pesoPorForma, unirPedazos, type ConfiguracionMotor } from "../src";
import { PERFIL_PRUEBA } from "./perfil";
import { cuadroConFiguras, type Figura } from "./sintetico";

/** Lote medido: alevinos de 40 × 8 px vistos desde arriba. */
const LOTE = estadisticasDe(Array.from({ length: 30 }, (_, i) => ({ largo: 39 + (i % 3), ancho: 8, area: 250, relacion: 5 })));
const perfil = perfilEnPixeles(PERFIL_PRUEBA, { lote: LOTE });

function config(): ConfiguracionMotor {
  return {
    detector: { umbral: 128, areaMinima: 6, areaTipica: null },
    rastreador: { distanciaMaxima: 30, cuadrosDeGracia: 2 },
    posicionLinea: 120,
    sentido: "abajo",
    aprenderAreaTipica: false,
    perfil: PERFIL_PRUEBA,
    lote: LOTE,
  };
}

/** Hace bajar las figuras de cada cuadro (función de y) por el canal y devuelve el total. */
function pasar(figurasEn: (y: number, cuadro: number) => Figura[]) {
  const motor = new MotorConteo(config());
  let total = 0;
  let cuadro = 0;
  for (let y = -10; y <= 260; y += 8) total = motor.procesar(cuadroConFiguras(figurasEn(y, cuadro++))).total;
  return total;
}

const pez = (cx: number, cy: number, ancho = 8): Figura => ({ tipo: "elipse", cx, cy, largo: 40, ancho, angulo: 90 });

function medidas(figuras: Figura[]) {
  const c = cuadroConFiguras(figuras);
  const m = Uint8Array.from(c.datos, (v) => (v < 128 ? 1 : 0));
  return encontrarManchas(m, c.ancho, c.alto, 3);
}

describe("peso por forma, no por área", () => {
  it("un alevino de lado (el doble de área, el mismo largo) pesa 1", () => {
    const [deLado] = medidas([pez(80, 120, 16)]);
    expect(deLado!.area).toBeGreaterThan(1.8 * medidas([pez(80, 120)])[0]!.area);
    expect(pesoPorForma(deLado!, perfil)).toBe(1);
  });

  it("dos alevinos pegados lado a lado pesan 2; dos en fila (el doble de largo), también", () => {
    const [ladoALado] = medidas([pez(76, 120), pez(84, 120)]);
    expect(pesoPorForma(ladoALado!, perfil)).toBe(2);
    const [enFila] = medidas([{ tipo: "elipse", cx: 80, cy: 120, largo: 80, ancho: 8, angulo: 90 }]);
    expect(pesoPorForma(enFila!, perfil)).toBe(2);
  });
});

describe("unir pedazos de un mismo pez", () => {
  const pedazos: Figura[] = [
    { tipo: "rect", x: 76, y: 100, ancho: 8, alto: 10 },
    { tipo: "rect", x: 76, y: 115, ancho: 8, alto: 12 },
    { tipo: "rect", x: 76, y: 132, ancho: 8, alto: 8 },
  ];

  it("tres pedazos alineados que juntos miden un alevino quedan en una mancha", () => {
    const unidas = unirPedazos(medidas(pedazos), perfil);
    expect(unidas).toHaveLength(1);
    expect(unidas[0]!.pedazos).toBe(3);
  });

  it("tres alevinos enteros en fila no se unen: juntos miden tres largos", () => {
    const enFila = [pez(80, 40), pez(80, 90), pez(80, 140)];
    expect(unirPedazos(medidas(enFila), perfil)).toHaveLength(3);
  });

  it("dos alevinos separados lado a lado no se unen", () => {
    expect(unirPedazos(medidas([pez(70, 120), pez(90, 120)]), perfil)).toHaveLength(2);
  });
});

describe("conteo del pangasius de lado y de los pegados (cuadros sintéticos)", () => {
  it("un pangasius que pasa de verse desde arriba a verse de lado (doble área, mismo largo) cuenta 1", () => {
    // De lado justo al cruzar la línea (y de 90 a 170).
    expect(pasar((y) => [pez(80, y, y > 90 && y < 170 ? 16 : 8)])).toBe(1);
  });

  it("aunque se vea de lado un solo cuadro (antes, con el peso máximo, quedaba en 3)", () => {
    expect(pasar((y, c) => [pez(80, y, c === 10 ? 24 : 8)])).toBe(1);
  });

  it("un pez partido en 3 pedazos alineados que se mueven juntos cuenta 1", () => {
    expect(
      pasar((y) => [
        { tipo: "rect", x: 76, y: y - 20, ancho: 8, alto: 10 },
        { tipo: "rect", x: 76, y: y - 5, ancho: 8, alto: 12 },
        { tipo: "rect", x: 76, y: y + 12, ancho: 8, alto: 8 },
      ]),
    ).toBe(1);
  });

  it("dos alevinos realmente pegados, uno al lado del otro, cuentan 2", () => {
    expect(pasar((y) => [pez(76, y), pez(84, y)])).toBe(2);
  });

  it("tres alevinos separados que pasan juntos cuentan 3", () => {
    expect(pasar((y) => [pez(50, y), pez(80, y), pez(110, y)])).toBe(3);
  });
});
