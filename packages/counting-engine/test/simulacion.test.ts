import { describe, expect, it } from "vitest";
import { CONTROLES_INICIALES, MotorConteo, configuracionMotor, type PerfilForma } from "../src";
import { cuadroConFiguras, type Figura } from "./sintetico";

/**
 * Como la simulación de 100 alevinos del 2026-10-23 (docs/Videos/simulacion_100_alevines_tamanos_variables.mp4,
 * video horizontal reducido a 480 × 270): alevinos tipo renacuajo (cabeza ancha, cola fina y una aleta
 * al final) de tamaños de 1 a 3, que bajan. Antes contaba 83 (descartaba los chicos por «tamaño») o
 * 105 (los grandes valían 2: la aleta parecía la cintura de dos en fila). Ahora 100 de 100.
 */
const W = 480;
const H = 270;

/** Perfiles como los de packages/domain/src/perfiles.ts (el motor no depende de domain). */
const perfil = (largoCm: [number, number], relacionArriba: [number, number], relacionLado: [number, number], solidezMinima: number): PerfilForma => ({
  largoCm,
  anchoCm: [largoCm[0] / relacionArriba[1], largoCm[1] / relacionLado[0]],
  areaCm2: [0.65 * largoCm[0] * (largoCm[0] / relacionArriba[1]), 0.65 * largoCm[1] * (largoCm[1] / relacionLado[0])],
  relacionArriba,
  relacionLado,
  solidezMinima,
  cierreRelativo: 0.25,
  velocidadCmS: { tipica: 15, maxima: 35 },
});
const PERFILES: [string, PerfilForma][] = [
  ["cachama pequeño", perfil([0.8, 3.6], [4, 9], [1.8, 3], 0.65)],
  ["pangasius mediano", perfil([2.4, 6], [4.5, 8], [3.5, 5.5], 0.55)],
  ["otra mediano", perfil([2.1, 6.5], [2.5, 10], [1.6, 6], 0.55)],
];

/** Un renacuajo de largo `l` con la cabeza abajo (baja de cabeza). */
function renacuajo(cx: number, cy: number, l: number): Figura[] {
  return [
    { tipo: "elipse", cx, cy: cy + l * 0.22, largo: l * 0.55, ancho: l * 0.3, angulo: 90 }, // cabeza
    { tipo: "rect", x: cx - Math.max(1, l * 0.04), y: cy - l * 0.38, ancho: Math.max(2, l * 0.08), alto: l * 0.42 }, // cola
    { tipo: "elipse", cx, cy: cy - l * 0.42, largo: l * 0.16, ancho: l * 0.14, angulo: 90 }, // aleta
  ];
}

describe("simulación de 100 alevinos de tamaños variables (video horizontal)", { timeout: 120_000 }, () => {
  const n = 60;
  // Largos de 8 a 24 px mezclados; de a 3 por fila, a 4 px por cuadro.
  const largos = Array.from({ length: n }, (_, i) => 8 + ((i * 23) % n) * (16 / (n - 1)));
  const cuadros: Figura[][] = Array.from({ length: 10 }, () => []);
  for (let f = 0; f < n / 3; f++) {
    for (let y = -30; y < H + 30; y += 4) {
      cuadros.push([0, 1, 2].flatMap((j) => renacuajo(90 + j * 150 + ((f * 37) % 40), y + j * 9, largos[f * 3 + j]!)));
    }
  }

  for (const [nombre, p] of PERFILES) {
    it(`${nombre}, sin marcas: los ${n} — ni pierde los chicos ni dobla los grandes`, () => {
      const m = new MotorConteo({ ...configuracionMotor(CONTROLES_INICIALES, W, H), perfil: p, pxPorCm: null, lote: null, fondo: {} });
      let total = 0;
      cuadros.forEach((f, k) => (total = m.procesar(cuadroConFiguras(f, W, H), k * 16.7).total));
      expect(total).toBe(n);
    });
  }
});
