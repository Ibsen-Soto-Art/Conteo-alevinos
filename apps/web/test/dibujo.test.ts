import { describe, expect, it } from "vitest";
import { etiquetaMancha, pintarMascara } from "../src/features/conteo/dibujo";

describe("pintarMascara", () => {
  it("marca solo los píxeles más oscuros que el umbral", () => {
    const rgba = new Uint8ClampedArray([30, 30, 30, 255, 230, 230, 230, 255]);
    const destino = new Uint8ClampedArray(8);
    pintarMascara(rgba, 128, destino);
    expect(destino[3]).toBeGreaterThan(0);
    expect(destino[7]).toBe(0);
  });
});

describe("etiqueta de cada mancha en el laboratorio", () => {
  it("aceptada: largo×ancho y peso", () => {
    expect(etiquetaMancha({ x: 0, y: 0, area: 250, peso: 1, largo: 40.4, ancho: 8.2 })).toBe("40×8 ·1");
    expect(etiquetaMancha({ x: 0, y: 0, area: 500, peso: 2, largo: 41, ancho: 17 })).toBe("41×17 ·2");
  });

  it("descartada: el motivo y sus medidas", () => {
    expect(etiquetaMancha({ x: 0, y: 0, area: 90, peso: 1, largo: 11, ancho: 10, motivo: "burbuja" })).toBe("burbuja 11×10");
    expect(etiquetaMancha({ x: 0, y: 0, area: 30, peso: 1, motivo: "quieto" })).toBe("quieto 30 px");
  });
});
