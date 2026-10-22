import { describe, expect, it, vi } from "vitest";
import { prenderLinterna } from "../src/features/conteo/linterna";

function pista(capacidades: object | undefined, falla = false) {
  return {
    getCapabilities: capacidades === undefined ? undefined : () => capacidades,
    applyConstraints: vi.fn(() => (falla ? Promise.reject(new Error("no")) : Promise.resolve())),
  } as unknown as MediaStreamTrack & { applyConstraints: ReturnType<typeof vi.fn> };
}

describe("linterna al abrir la cámara", () => {
  it("si el celular la tiene, la prende", async () => {
    const p = pista({ torch: true });
    expect(await prenderLinterna(p)).toBe(true);
    expect(p.applyConstraints).toHaveBeenCalledWith({ advanced: [{ torch: true }] });
  });

  it("si no la ofrece (o el navegador no sabe de capacidades), no hace nada y no falla", async () => {
    const sin = pista({});
    expect(await prenderLinterna(sin)).toBe(false);
    expect(sin.applyConstraints).not.toHaveBeenCalled();
    expect(await prenderLinterna(pista(undefined))).toBe(false);
    expect(await prenderLinterna(undefined)).toBe(false);
  });

  it("si el celular dice que sí pero falla al prenderla, sigue sin error", async () => {
    expect(await prenderLinterna(pista({ torch: true }, true))).toBe(false);
  });
});
