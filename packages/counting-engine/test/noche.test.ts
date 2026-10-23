import { describe, expect, it } from "vitest";
import { CONTROLES_INICIALES, MotorConteo, configuracionMotor, type CuadroGris, type PerfilForma } from "../src";

/**
 * Canal de acero galvanizado de noche, con la luz desde arriba (videos de campo del 2026-10-22):
 * el agua que corre hace ondas (manchas claras y oscuras que bajan y cambian de forma) en todo el
 * canal desde el primer cuadro, y hay un reflejo brillante fijo de la lámpara. Sin un solo alevino,
 * la app ya marcaba 8.
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

interface Pez {
  x: number;
  /** Cuadro en que entra por arriba. */
  desde: number;
}

/** Un cuadro del canal con ondas (amplitud `ondas` niveles de gris), un reflejo y los peces. */
function cuadro(k: number, peces: Pez[], ondas = 45): CuadroGris {
  const datos = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Manchas de onda de ~15 × 20 px que bajan a 6 px por cuadro y cambian de forma despacio.
      const onda = Math.sin((2 * Math.PI * x) / 30 + 0.7 * Math.sin(y / 23 + k / 9)) * Math.sin((2 * Math.PI * (y - 6 * k)) / 40 + k / 7);
      let v = 175 + ondas * onda;
      // Reflejo de la lámpara: un círculo quemado y su halo.
      const r = Math.hypot(x - 150, y - 200);
      if (r < 10) v = 255;
      else if (r < 22) v = Math.max(v, 255 - (r - 10) * 6);
      datos[y * W + x] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }
  // Alevinos: elipses oscuras de 32 × 6 px que bajan a 4 px por cuadro.
  for (const p of peces) {
    const cy = -20 + (k - p.desde) * 4;
    if (cy < -20 || cy > H + 20) continue;
    for (let y = Math.max(0, Math.floor(cy - 17)); y < Math.min(H, cy + 17); y++)
      for (let x = Math.max(0, Math.floor(p.x - 4)); x < Math.min(W, p.x + 4); x++)
        if (((x + 0.5 - p.x) / 3) ** 2 + ((y + 0.5 - cy) / 16) ** 2 <= 1) datos[y * W + x] = 45;
  }
  return { ancho: W, alto: H, datos };
}

function correr(cuadros: number, peces: Pez[], ondas?: number) {
  const m = new MotorConteo({ ...configuracionMotor(CONTROLES_INICIALES, W, H), perfil: CACHAMA_PEQUENO, pxPorCm: 16, lote: null, fondo: {} });
  let total = 0;
  for (let k = 0; k < cuadros; k++) total = m.procesar(cuadro(k, peces, ondas), k * 33.3).total;
  return total;
}

describe("de noche, luz desde arriba, agua con ondas y reflejo", { timeout: 60_000 }, () => {
  it("solo agua corriendo desde el primer cuadro: cuenta 0", () => {
    expect(correr(240, [])).toBe(0);
  });

  it("los alevinos se siguen contando entre las ondas", () => {
    const peces = [0, 1, 2, 3, 4, 5].map((i) => ({ x: 50 + (i % 3) * 55, desde: 40 + i * 45 }));
    expect(correr(40 + 6 * 45 + 160, peces)).toBe(6);
  });

  it("con el canal tranquilo (sin ondas) sigue igual de sensible", () => {
    const peces = [0, 1, 2].map((i) => ({ x: 60 + i * 50, desde: 10 + i * 45 }));
    expect(correr(10 + 3 * 45 + 160, peces, 0)).toBe(3);
  });
});
