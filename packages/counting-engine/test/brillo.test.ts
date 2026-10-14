import { describe, expect, it } from "vitest";
import { brilloMedio, hayPocaLuz } from "../src";
import { cuadroCon } from "./sintetico";

describe("brillo del fondo", () => {
  it("mide el brillo medio del cuadro", () => {
    expect(brilloMedio(cuadroCon([]))).toBe(230);
  });

  it("las manchas oscuras bajan poco el brillo medio", () => {
    const b = brilloMedio(cuadroCon([{ x: 10, y: 10, ancho: 4, alto: 4 }]));
    expect(b).toBeGreaterThan(220);
    expect(b).toBeLessThan(230);
  });

  it("solo mide dentro de la zona del canal", () => {
    const cuadro = cuadroCon([{ x: 0, y: 0, ancho: 40, alto: 120 }]);
    expect(brilloMedio(cuadro, { x: 40, y: 0, ancho: 40, alto: 120 })).toBe(230);
  });

  it("avisa poca luz cuando el fondo no está bien iluminado", () => {
    expect(hayPocaLuz(230)).toBe(false);
    expect(hayPocaLuz(80)).toBe(true);
  });
});
