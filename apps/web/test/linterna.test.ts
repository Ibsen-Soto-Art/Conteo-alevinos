import { describe, expect, it, vi } from "vitest";
import { guardarLinternaPreferida, linternaDisponible, linternaPreferida, ponerLinterna, prenderLinterna } from "../src/features/conteo/linterna";

function pista(capacidades: object | undefined, falla = false) {
  return {
    getCapabilities: capacidades === undefined ? undefined : () => capacidades,
    applyConstraints: vi.fn(() => (falla ? Promise.reject(new Error("no")) : Promise.resolve())),
  } as unknown as MediaStreamTrack & { applyConstraints: ReturnType<typeof vi.fn> };
}

function almacen() {
  const datos = new Map<string, string>();
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v) };
}

describe("linterna", () => {
  it("si el celular la tiene, se puede prender y apagar", async () => {
    const p = pista({ torch: true });
    expect(linternaDisponible(p)).toBe(true);
    expect(await ponerLinterna(p, true)).toBe(true);
    expect(await ponerLinterna(p, false)).toBe(true);
    expect(p.applyConstraints.mock.calls).toEqual([[{ advanced: [{ torch: true }] }], [{ advanced: [{ torch: false }] }]]);
    expect(await prenderLinterna(p)).toBe(true);
  });

  it("si no la ofrece (o el navegador no sabe de capacidades), no hay botón y no hace nada", async () => {
    const sin = pista({});
    expect(linternaDisponible(sin)).toBe(false);
    expect(await ponerLinterna(sin, true)).toBe(false);
    expect(sin.applyConstraints).not.toHaveBeenCalled();
    expect(linternaDisponible(pista(undefined))).toBe(false);
    expect(await ponerLinterna(undefined, true)).toBe(false);
  });

  it("si el celular dice que sí pero falla, sigue sin error", async () => {
    expect(await ponerLinterna(pista({ torch: true }, true), true)).toBe(false);
  });

  it("recuerda si la persona la apagó; por defecto, prendida", () => {
    const a = almacen();
    expect(linternaPreferida(a)).toBe(true);
    guardarLinternaPreferida(false, a);
    expect(linternaPreferida(a)).toBe(false);
    guardarLinternaPreferida(true, a);
    expect(linternaPreferida(a)).toBe(true);
    expect(linternaPreferida(undefined)).toBe(true);
  });
});
