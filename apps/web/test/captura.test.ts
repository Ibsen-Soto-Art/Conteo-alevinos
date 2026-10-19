import type { AnalisisCanal } from "@contador/counting-engine";
import { describe, expect, it } from "vitest";
import { canalEnVideo, geometriaDe, recorteAVideo } from "../src/features/conteo/captura";

const analisis: AnalisisCanal = {
  zona: { x: 32, y: 40, ancho: 256, alto: 400 },
  marcas: [{ x: 40, y: 50, lado: 16 }],
  pxPorCm: 8,
  fuente: "marcas",
};

describe("canal y recorte", () => {
  it("pasa el análisis del cuadro de 640 px al video de 1280 px", () => {
    const c = canalEnVideo(analisis, { ancho: 640, alto: 360 }, { ancho: 1280, alto: 720 });
    expect(c.zona).toEqual({ x: 64, y: 80, ancho: 512, alto: 800 });
    expect(c.marcas[0]).toEqual({ x: 80, y: 100, lado: 32 });
    expect(c.pxPorCm).toBe(16);
  });

  it("el recorte del canal mide hasta 480 px de lado mayor y la escala se ajusta a él", () => {
    const c = canalEnVideo(analisis, { ancho: 640, alto: 360 }, { ancho: 1280, alto: 720 });
    const g = geometriaDe(c);
    expect(g.recorte).toEqual({ ancho: 307, alto: 480 });
    expect(g.pxPorCmRecorte).toBeCloseTo((16 * 307) / 512, 6);
  });

  it("sin marcas no hay escala", () => {
    const g = geometriaDe(canalEnVideo({ ...analisis, pxPorCm: null, fuente: "luz" }, { ancho: 640, alto: 360 }, { ancho: 640, alto: 360 }));
    expect(g.pxPorCmRecorte).toBeNull();
  });

  it("un recorte pequeño no se agranda", () => {
    const g = geometriaDe({ zona: { x: 0, y: 0, ancho: 200, alto: 300 }, marcas: [], pxPorCm: null, fuente: "luz" });
    expect(g.recorte).toEqual({ ancho: 200, alto: 300 });
  });

  it("lleva un punto del recorte a píxeles del video", () => {
    const g = geometriaDe({ zona: { x: 100, y: 50, ancho: 960, alto: 600 }, marcas: [], pxPorCm: null, fuente: "luz" });
    expect(g.recorte).toEqual({ ancho: 480, alto: 300 });
    expect(recorteAVideo(240, 150, g)).toEqual({ x: 580, y: 350 });
  });
});
