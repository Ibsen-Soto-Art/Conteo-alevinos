import { describe, expect, it } from "vitest";
import { cantidadBolsa, descartarBolsa, faltanParaMeta, nuevaBolsa, siguienteNumero, totalConteo, type Bolsa } from "../src";

function bolsa(numero: number, cantidadCruda: number): Bolsa {
  return nuevaBolsa({ id: `b${numero}`, conteoId: "c1", numero, crudo: cantidadCruda, factor: 100 / 97, cerradaEn: "" });
}

describe("bolsa", () => {
  it("la cantidad es lo que contó la app corregido con el factor de la prueba", () => {
    expect(cantidadBolsa(970, 100 / 97)).toBe(1000);
    expect(cantidadBolsa(0, 100 / 97)).toBe(0);
  });

  it("guarda lo crudo, el factor y la cantidad corregida, y nace válida", () => {
    expect(bolsa(1, 970)).toMatchObject({ crudo: 970, factor: 100 / 97, cantidad: 1000, estado: "valida" });
  });

  it("la primera bolsa no lleva los 100 de la prueba: esos vuelven al tanque", () => {
    const primera = bolsa(1, 0);
    expect(primera.cantidad).toBe(0);
    expect(primera).not.toHaveProperty("inicial");
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
    expect(totalConteo([bolsa(1, 970), descartarBolsa(bolsa(2, 970)), bolsa(2, 485)])).toBe(1000 + 500);
  });

  it("la siguiente bolsa toma el número de la descartada", () => {
    expect(siguienteNumero([])).toBe(1);
    expect(siguienteNumero([bolsa(1, 10)])).toBe(2);
    expect(siguienteNumero([bolsa(1, 10), descartarBolsa(bolsa(2, 10))])).toBe(2);
  });

  it("faltan para la meta se cuenta con el número corregido", () => {
    expect(faltanParaMeta(cantidadBolsa(970, 100 / 97), 1000)).toBe(0);
    expect(faltanParaMeta(cantidadBolsa(950, 100 / 97), 1000)).toBe(21);
    expect(faltanParaMeta(950, 1000)).toBe(50);
    expect(faltanParaMeta(1003, 1000)).toBe(0);
    expect(faltanParaMeta(10, null)).toBeNull();
  });
});
