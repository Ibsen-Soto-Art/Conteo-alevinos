import { describe, expect, it } from "vitest";
import { CONTROLES_INICIALES, MotorConteo, configuracionMotor, type EventoConteo, type PerfilForma } from "../src";
import { cuadroConFiguras, type Figura } from "./sintetico";

/**
 * Casos que contaban DE MÁS (diagnóstico de la prueba en campo: 50 objetos, contó 64). Cada uno
 * reproduce una causa encontrada con el registro de eventos y queda como prueba para siempre.
 *
 * Recorte del canal de 220 × 480 px; con marcas, 16 px por cm. Perfil «Cachama pequeño» de
 * packages/domain/src/perfiles.ts (el motor no depende de domain): 1–3 cm con ±20 %.
 */
const W = 220;
const H = 480;
const CACHAMA_PEQUENO: PerfilForma = {
  largoCm: [0.8, 3.6],
  anchoCm: [0.8 / 9, 3.6 / 1.8],
  areaCm2: [0.65 * 0.8 * (0.8 / 9), 0.65 * 3.6 * 2],
  relacionArriba: [4, 9],
  relacionLado: [1.8, 3],
  solidezMinima: 0.65,
  cierreRelativo: 0.25,
  velocidadCmS: { tipica: 15, maxima: 25 },
};

function correr(cuadros: Figura[][], pxPorCm: number | null = 16) {
  const m = new MotorConteo({ ...configuracionMotor(CONTROLES_INICIALES, W, H), perfil: CACHAMA_PEQUENO, pxPorCm, lote: null, fondo: {} });
  const eventos: EventoConteo[] = [];
  let total = 0;
  cuadros.forEach((f, k) => {
    const r = m.procesar(cuadroConFiguras(f, W, H), k * 33.3);
    eventos.push(...r.eventos);
    total = r.total;
  });
  return { total, eventos };
}

const pez = (cx: number, cy: number, largo: number, ancho: number, angulo = 90): Figura => ({ tipo: "elipse", cx, cy, largo, ancho, angulo });
const vacio = (n: number): Figura[][] => Array.from({ length: n }, () => []);

/** n objetos que bajan de a uno a 5 px por cuadro; `forma` da las figuras de cada uno. */
function fila(n: number, forma: (cx: number, cy: number, i: number) => Figura[]) {
  const c = vacio(10);
  for (let i = 0; i < n; i++) for (let y = -40; y < H + 40; y += 5) c.push(forma(60 + (i % 3) * 50, y, i));
  return c;
}

// Simulaciones de miles de cuadros de 220 × 480: más que los 5 s de una prueba corriente.
describe("conteo de más: causas encontradas", { timeout: 30_000 }, () => {
  it("causa 1 — un alevino de 3,3 a 3,6 cm, dentro del rango del perfil, pesa 1 (antes 2)", () => {
    for (const cm of [3.3, 3.5, 3.6]) {
      const r = correr(fila(4, (x, y) => [pez(x, y, cm * 16, (cm * 16) / 5.5)]));
      expect(r.total, `${cm} cm`).toBe(4);
      expect(r.eventos.every((e) => e.peso === 1)).toBe(true);
    }
  });

  it("causa 1 — tallas disparejas de 2 a 3,6 cm (objetos de prueba): 20 de 20", () => {
    const tallas = Array.from({ length: 20 }, (_, i) => 2 + (1.6 * ((i * 7) % 20)) / 19);
    expect(correr(fila(20, (x, y, i) => [pez(x, y, tallas[i]! * 16, (tallas[i]! * 16) / 5.5)])).total).toBe(20);
  });

  it("causa 1 — dos alevinos en fila, cola con cabeza (el doble de largo), siguen pesando 2", () => {
    const r = correr(fila(4, (x, y) => [pez(x, y - 16, 32, 6), pez(x, y + 16, 32, 6)]));
    expect(r.total).toBe(8);
  });

  it("causa 3 — sin marcas, un alevino partido en dos pedazos alineados cuenta 1 (antes 2)", () => {
    const r = correr(fila(6, (x, y) => [pez(x, y - 10, 14, 6), pez(x, y + 10, 14, 6)]), null);
    expect(r.total).toBe(6);
  });

  it("causa 3 — sin marcas, dos alevinos enteros lado a lado no se unen: 2", () => {
    const r = correr(fila(4, (x, y) => [pez(x - 9, y, 32, 6), pez(x + 9, y, 32, 6)]), null);
    expect(r.total).toBe(8);
  });

  it("causa 3 — sin marcas, dos alevinos enteros en fila (cola con cabeza) no se unen: 2", () => {
    const r = correr(fila(3, (x, y) => [pez(x, y - 18, 32, 6), pez(x, y + 18, 32, 6)]), null);
    expect(r.total).toBe(6);
  });

  it("causa 3 — sin marcas, objetos rechonchos (32 × 10) en fila no se unen: cada uno ya es un alevino entero", () => {
    const r = correr(fila(3, (x, y) => [pez(x, y - 18, 32, 10), pez(x, y + 18, 32, 10)]), null);
    expect(r.total).toBe(6);
  });

  it("causa 2 — dos pegados lado a lado que se separan al salir de la franja cuentan 2 (antes 3)", () => {
    for (const separa of [300, 345, 362, 368, 372, 400]) {
      const c = vacio(10);
      for (let y = -40; y <= H + 40; y += 3) {
        const d = y < separa ? 0 : Math.min(30, (y - separa) * 1.5);
        c.push([pez(100 - d, y, 32, 8), pez(108 + d, y, 32, 8)]);
      }
      expect(correr(c).total, `se separan en y=${separa}`).toBe(2);
    }
  });

  it("causa 2 — dos contados se pegan debajo de la franja, suben juntos y se separan arriba: 2 (antes 3)", () => {
    const c = vacio(10);
    const x = 100;
    for (let y = 200; y <= 400; y += 3) c.push([pez(x, y, 32, 6), pez(x + 40, y - 80, 32, 6)]);
    for (let k = 0; k <= 30; k++) c.push([pez(x, 400, 32, 6), pez(x + 40 - (34 * k) / 30, 320 + (80 * k) / 30, 32, 6)]);
    for (let y = 400; y >= 280; y -= 3) c.push([pez(x, y, 32, 6), pez(x + 6, y, 32, 6)]);
    for (let y = 280; y <= H + 40; y += 3) c.push([pez(x - Math.min(30, (y - 280) / 2), y, 32, 6), pez(x + 6 + Math.min(30, (y - 280) / 2), y + 10, 32, 6)]);
    expect(correr(c).total).toBe(2);
  });
});
