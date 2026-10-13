import { describe, expect, it } from "vitest";
import { pintarMascara } from "../src/features/conteo/dibujo";

describe("pintarMascara", () => {
  it("marca solo los píxeles más oscuros que el umbral", () => {
    const rgba = new Uint8ClampedArray([30, 30, 30, 255, 230, 230, 230, 255]);
    const destino = new Uint8ClampedArray(8);
    pintarMascara(rgba, 128, destino);
    expect(destino[3]).toBeGreaterThan(0);
    expect(destino[7]).toBe(0);
  });
});
