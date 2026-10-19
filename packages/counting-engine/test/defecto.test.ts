import { describe, expect, it } from "vitest";
import { CONTROLES_INICIALES, MotorConteo, configuracionMotor, type PerfilForma } from "../src";
import { cuadroConFiguras, type Figura } from "./sintetico";

/**
 * Casos que contaban DE MENOS (encontrados al diagnosticar el conteo de más). Mismo canal que
 * exceso.test.ts: recorte de 220 × 480 px, 16 px por cm con marcas, perfil «Cachama pequeño».
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
  let total = 0;
  cuadros.forEach((f, k) => (total = m.procesar(cuadroConFiguras(f, W, H), k * 33.3).total));
  return { total, motor: m };
}

const pez = (cx: number, cy: number, largo: number, ancho: number, angulo = 90): Figura => ({ tipo: "elipse", cx, cy, largo, ancho, angulo });

/** n objetos que bajan de a uno a 5 px por cuadro. */
function fila(n: number, forma: (cx: number, cy: number, i: number) => Figura[]) {
  const c: Figura[][] = Array.from({ length: 10 }, () => []);
  for (let i = 0; i < n; i++) for (let y = -40; y < H + 40; y += 5) c.push(forma(60 + (i % 3) * 50, y, i));
  return c;
}

// Simulaciones de miles de cuadros de 220 × 480: más que los 5 s de una prueba corriente.
describe("conteo de menos: causas encontradas", { timeout: 60_000 }, () => {
  it("caso A — sin marcas y con tallas disparejas (2 a 3,6 cm, el más grande primero): 30 de 30", () => {
    // Antes aprendía el tamaño del lote con las 40 primeras DETECCIONES, que salían todas del
    // primer objeto: los más pequeños que él (−25 %) se descartaban por tamaño.
    const tallas = [3.6, ...Array.from({ length: 29 }, (_, i) => 2 + (1.6 * ((i * 11) % 29)) / 28)];
    const { total, motor } = correr(fila(30, (x, y, i) => [pez(x, y, tallas[i]! * 16, (tallas[i]! * 16) / 5.5)]), null);
    expect(total).toBe(30);
    // Y sí aprendió el tamaño (de varios objetos, no de uno).
    expect(motor.estadisticasAprendidas?.muestras).toBeGreaterThanOrEqual(15);
  });

  it("caso A — sin marcas y con un lote parejo (2,5 cm) aprende el tamaño y lo usa", () => {
    const { total, motor } = correr(fila(20, (x, y) => [pez(x, y, 40, 40 / 5.5)]), null);
    expect(total).toBe(20);
    expect(motor.estadisticasAprendidas!.largo.mediana).toBeCloseTo(40, -1);
    expect(motor.perfilPx()!.origen).toBe("lote");
  });

  it("caso B — dos objetos anchos pegados lado a lado (mancha más redonda que un pez de lado) cuentan 2", () => {
    // Primero 10 sueltos (32 × 10 px), después 6 parejas pegadas: la mancha de cada pareja mide
    // ~32 × 20 (relación ~1,6). Antes valía 1 o se descartaba como «burbuja» (redonda y llena).
    const c = fila(10, (x, y) => [pez(x, y, 32, 10)]);
    c.push(...fila(6, (x, y) => [pez(x - 5, y, 32, 10), pez(x + 5, y, 32, 10)]).slice(10));
    for (const pxPorCm of [16, null]) expect(correr(c, pxPorCm).total, pxPorCm ? "con marcas" : "sin marcas").toBe(22);
  });

  it("caso B — un pez de lado (alargado aunque ancho) sigue valiendo 1", () => {
    const c = fila(10, (x, y) => [pez(x, y, 32, 10)]);
    c.push(...fila(6, (x, y) => [pez(x, y, 34, 17)]).slice(10)); // relación 2: un pez de lado
    expect(correr(c).total).toBe(16);
  });

  it("caso B — antes de ver 10 sueltos no se pesa por área (no sabe cuánto mide uno)", () => {
    // Objetos anchos sueltos desde el principio: ninguno vale 2 aunque sean más anchos que el perfil.
    expect(correr(fila(8, (x, y) => [pez(x, y, 30, 14)])).total).toBe(8);
  });

  it("caso B — con 10 sueltos vistos, dos en fila apenas encimados (1,75 largos vistos) cuentan 2", () => {
    // Objetos de 2 cm (32 px) y perfil pequeño (largo típico 2,2 cm, máximo 3,6 cm): una mancha de
    // 56 px son dos encimados, pero el límite del perfil (≥ 63 px) la dejaba en 1.
    const c = fila(10, (x, y) => [pez(x, y, 32, 6)]);
    c.push(...fila(5, (x, y) => [pez(x, y - 12, 32, 6), pez(x, y + 12, 32, 6)]).slice(10));
    for (const pxPorCm of [16, null]) expect(correr(c, pxPorCm).total, pxPorCm ? "con marcas" : "sin marcas").toBe(20);
  });

  it("caso B — con tallas disparejas vistas (2 a 3,6 cm), uno de 3,6 cm sigue valiendo 1", () => {
    const tallas = Array.from({ length: 12 }, (_, i) => 2 + (1.6 * ((i * 5) % 12)) / 11);
    const c = fila(12, (x, y, i) => [pez(x, y, tallas[i]! * 16, (tallas[i]! * 16) / 5.5)]);
    c.push(...fila(4, (x, y) => [pez(x, y, 3.6 * 16, (3.6 * 16) / 5.5)]).slice(10));
    expect(correr(c).total).toBe(16);
  });
});
