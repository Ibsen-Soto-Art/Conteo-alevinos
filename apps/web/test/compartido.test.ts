import { describe, expect, it } from "vitest";
import { rutaDesdeHash } from "../src/app/rutas";
import { cuando, formatear } from "../src/shared/formato";
import { paginar } from "../src/shared/ui/Paginador";

describe("formatear", () => {
  it("pone punto de miles también en números de 4 cifras", () => {
    expect(formatear(1000)).toBe("1.000");
    expect(formatear(12450)).toBe("12.450");
    expect(formatear(97)).toBe("97");
  });
});

describe("cuando", () => {
  const ahora = new Date(2026, 9, 14, 12, 0);
  it("dice hoy y ayer con la hora", () => {
    expect(cuando(new Date(2026, 9, 14, 9, 5), ahora)).toMatch(/^hoy 9:05/);
    expect(cuando(new Date(2026, 9, 13, 15, 40), ahora)).toMatch(/^ayer 3:40/);
  });
  it("más atrás dice el día y el mes", () => {
    expect(cuando(new Date(2026, 9, 2), ahora)).toBe("2 de octubre");
  });
});

describe("rutaDesdeHash", () => {
  it("lee la pantalla del hash y manda lo desconocido al inicio", () => {
    expect(rutaDesdeHash("#/meta")).toBe("meta");
    expect(rutaDesdeHash("")).toBe("inicio");
    expect(rutaDesdeHash("#/no-existe")).toBe("inicio");
  });
});

describe("paginar", () => {
  const items = Array.from({ length: 12 }, (_, i) => i + 1);
  it("parte la lista en páginas", () => {
    expect(paginar(items, 9, 0)).toEqual({ visibles: [1, 2, 3, 4, 5, 6, 7, 8, 9], paginas: 2, actual: 0 });
    expect(paginar(items, 9, 1).visibles).toEqual([10, 11, 12]);
  });
  it("no se sale de las páginas que hay", () => {
    expect(paginar(items, 9, 5).actual).toBe(1);
    expect(paginar([], 9, 0)).toEqual({ visibles: [], paginas: 1, actual: 0 });
  });
});
