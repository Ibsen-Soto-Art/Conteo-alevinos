import { describe, expect, it } from "vitest";
import { analizarCanal, combinarMaximo, recortar, type CuadroGris } from "../src";
import { cuadroConFiguras, type Figura } from "./sintetico";

/**
 * Cuadro de 320 × 480: mesa oscura (60) alrededor, canal de acrílico iluminado (230) de
 * x 40 a 280 y de y 40 a 440, y las 4 marcas de cinta de 20 × 20 px en sus esquinas.
 */
const MARCAS: Figura[] = [
  { tipo: "rect", x: 46, y: 46, ancho: 20, alto: 20, gris: 25 },
  { tipo: "rect", x: 254, y: 46, ancho: 20, alto: 20, gris: 25 },
  { tipo: "rect", x: 46, y: 414, ancho: 20, alto: 20, gris: 25 },
  { tipo: "rect", x: 254, y: 414, ancho: 20, alto: 20, gris: 25 },
];

function canal(figuras: Figura[] = [], conMarcas = true): CuadroGris {
  const c = cuadroConFiguras([...(conMarcas ? MARCAS : []), ...figuras], 320, 480, 60);
  // el acrílico iluminado, sin pisar las figuras oscuras
  for (let y = 40; y < 440; y++) for (let x = 40; x < 280; x++) if (c.datos[y * 320 + x] === 60) c.datos[y * 320 + x] = 230;
  return c;
}

describe("análisis del canal", () => {
  it("con las 4 marcas calcula los píxeles por centímetro (2 cm de lado) y recorta entre ellas", () => {
    const a = analizarCanal(canal());
    expect(a.fuente).toBe("marcas");
    expect(a.marcas).toHaveLength(4);
    expect(a.pxPorCm).toBeCloseTo(10, 0);
    expect(a.zona).toEqual({ x: 46, y: 46, ancho: 228, alto: 388 });
  });

  it("sin marcas se cuenta con el cuadro entero (la franja va de borde a borde) y no hay escala", () => {
    // Antes recortaba la zona clara más grande: con luz de día (arena, una pared blanca) era
    // cualquier parte de la imagen y la franja salía cortada, distinta cada vez.
    const a = analizarCanal(canal([], false));
    expect(a.fuente).toBe("todo");
    expect(a.pxPorCm).toBeNull();
    expect(a.zona).toEqual({ x: 0, y: 0, ancho: 320, alto: 480 });
  });

  it("sin marcas, una zona clara en un rincón (una pared al sol) no recorta la imagen", () => {
    const c = cuadroConFiguras([], 320, 480, 70);
    for (let y = 0; y < 480; y++) for (let x = 200; x < 320; x++) c.datos[y * 320 + x] = 220;
    expect(analizarCanal(c).zona).toEqual({ x: 0, y: 0, ancho: 320, alto: 480 });
  });

  it("con solo 3 marcas no inventa la escala", () => {
    const c = canal();
    for (let y = 414; y < 434; y++) for (let x = 254; x < 274; x++) c.datos[y * 320 + x] = 230;
    const a = analizarCanal(c);
    expect(a.marcas).toHaveLength(3);
    expect(a.pxPorCm).toBeNull();
    expect(a.fuente).toBe("todo");
    expect(a.zona).toEqual({ x: 0, y: 0, ancho: 320, alto: 480 });
  });

  it("un alevino o una sombra redonda en el canal no se toman por marcas", () => {
    const a = analizarCanal(canal([{ tipo: "elipse", cx: 160, cy: 240, largo: 40, ancho: 8, gris: 30 }, { tipo: "rect", x: 150, y: 100, ancho: 20, alto: 20, gris: 25 }]));
    expect(a.fuente).toBe("marcas");
    expect(a.marcas).toHaveLength(4);
  });

  it("si todo el cuadro está iluminado, se usa el cuadro entero", () => {
    const a = analizarCanal(cuadroConFiguras([], 320, 480, 230));
    expect(a.fuente).toBe("todo");
    expect(a.zona).toEqual({ x: 0, y: 0, ancho: 320, alto: 480 });
  });

  it("combinando varios cuadros con el máximo desaparecen los alevinos que pasan", () => {
    const cuadros = [100, 200, 300].map((y) => canal([{ tipo: "elipse", cx: 160, cy: y, largo: 40, ancho: 8, angulo: 90 }]));
    const fondo = combinarMaximo(cuadros);
    expect(fondo.datos[200 * 320 + 160]).toBe(230);
    expect(fondo.datos[50 * 320 + 50]).toBe(25); // la marca fija sigue
  });

  it("recorta la zona de un cuadro", () => {
    const r = recortar(canal(), { x: 46, y: 46, ancho: 20, alto: 10 });
    expect(r).toMatchObject({ ancho: 20, alto: 10 });
    expect([...r.datos].every((v) => v === 25)).toBe(true);
  });
});
