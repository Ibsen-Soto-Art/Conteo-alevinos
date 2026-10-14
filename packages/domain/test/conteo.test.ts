import { describe, expect, it } from "vitest";
import {
  alevinosDePrueba,
  cantidadBolsa,
  descartarBolsa,
  faltanParaMeta,
  inicialDeBolsa,
  nuevaBolsa,
  siguienteNumero,
  totalConteo,
  type Bolsa,
  type Lote,
} from "../src";

const lote: Lote = {
  id: "l1",
  especie: "cachama",
  talla: "pequeno",
  creadoEn: "2026-10-14T08:00:00.000Z",
  calibracion: { pasadas: [{ contadosAMano: 100, contadosPorApp: 97 }], factor: 100 / 97 },
};

function bolsa(numero: number, cantidadCruda: number, inicial = 0): Bolsa {
  return nuevaBolsa({ id: `b${numero}`, conteoId: "c1", numero, inicial, crudo: cantidadCruda, factor: 100 / 97, cerradaEn: "" });
}

describe("bolsa", () => {
  it("la cantidad es lo contado a mano más lo de la app corregido con el factor", () => {
    expect(cantidadBolsa(0, 970, 100 / 97)).toBe(1000);
    expect(cantidadBolsa(100, 873, 100 / 97)).toBe(1000);
  });

  it("guarda lo crudo, el factor y la cantidad corregida, y nace válida", () => {
    expect(bolsa(1, 970)).toMatchObject({ crudo: 970, factor: 100 / 97, cantidad: 1000, estado: "valida" });
  });

  it("los 100 de la prueba van a la primera bolsa y a ninguna otra", () => {
    expect(alevinosDePrueba(lote)).toBe(100);
    expect(inicialDeBolsa(1, lote)).toBe(100);
    expect(inicialDeBolsa(2, lote)).toBe(0);
    expect(inicialDeBolsa(1, { ...lote, calibracion: null })).toBe(0);
  });

  it("con dos pasadas de prueba van los 200 a la primera bolsa", () => {
    const dos = { ...lote, calibracion: { pasadas: [...lote.calibracion!.pasadas, { contadosAMano: 100, contadosPorApp: 99 }], factor: 1 } };
    expect(alevinosDePrueba(dos)).toBe(200);
  });

  it("una bolsa cerrada no se edita: se descarta y queda en el historial", () => {
    const b = bolsa(1, 970);
    const d = descartarBolsa(b);
    expect(d.estado).toBe("descartada");
    expect(b.estado).toBe("valida");
  });
});

describe("conteo", () => {
  it("el total suma solo las bolsas válidas", () => {
    expect(totalConteo([bolsa(1, 970, 100), descartarBolsa(bolsa(2, 970)), bolsa(2, 485)])).toBe(1100 + 500);
  });

  it("la siguiente bolsa toma el número de la descartada", () => {
    expect(siguienteNumero([])).toBe(1);
    expect(siguienteNumero([bolsa(1, 10)])).toBe(2);
    expect(siguienteNumero([bolsa(1, 10), descartarBolsa(bolsa(2, 10))])).toBe(2);
  });

  it("faltan para la meta se cuenta con el número corregido", () => {
    expect(faltanParaMeta(cantidadBolsa(100, 873, 100 / 97), 1000)).toBe(0);
    expect(faltanParaMeta(950, 1000)).toBe(50);
    expect(faltanParaMeta(1003, 1000)).toBe(0);
    expect(faltanParaMeta(10, null)).toBeNull();
  });
});
