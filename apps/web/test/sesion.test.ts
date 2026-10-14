import { describe, expect, it } from "vitest";
import { cambiarMeta, estadoDeEjemplo, estadoInicial, numeroBolsaAbierta, reducir, totalHoy, type EstadoSesion } from "../src/app/sesion";

const vacio: EstadoSesion = { ...estadoDeEjemplo(), especie: "cachama", talla: "pequeno", enBolsa: 0, bolsas: [], historial: [] };

describe("sesión de conteo", () => {
  it("empezar limpia la elección y las bolsas, pero no el historial", () => {
    const e = reducir(estadoDeEjemplo(), { tipo: "empezar" });
    expect(e).toMatchObject({ especie: null, talla: null, pruebaApp: null, enBolsa: 0, bolsas: [] });
    expect(e.historial).toHaveLength(1);
  });

  it("cerrar bolsa la guarda con su número y pone el contador en cero", () => {
    let e = reducir(vacio, { tipo: "sumar", cantidad: 1003 });
    e = reducir(e, { tipo: "cerrarBolsa" });
    expect(e.bolsas).toEqual([{ numero: 1, cantidad: 1003 }]);
    expect(e.enBolsa).toBe(0);
    expect(numeroBolsaAbierta(e)).toBe(2);
  });

  it("deshacer devuelve la bolsa cerrada al contador", () => {
    let e = reducir(vacio, { tipo: "sumar", cantidad: 998 });
    e = reducir(e, { tipo: "cerrarBolsa" });
    e = reducir(e, { tipo: "deshacerCierre" });
    expect(e.bolsas).toEqual([]);
    expect(e.enBolsa).toBe(998);
  });

  it("en pausa no suma", () => {
    let e = reducir(vacio, { tipo: "pausar" });
    e = reducir(e, { tipo: "sumar", cantidad: 5 });
    expect(e.enBolsa).toBe(0);
  });

  it("el total de hoy suma las bolsas cerradas y la abierta", () => {
    expect(totalHoy(estadoDeEjemplo())).toBe(1003 + 1001 + 763);
  });

  it("terminar pasa el conteo al historial, de primero", () => {
    let e = reducir({ ...vacio, historial: estadoDeEjemplo().historial }, { tipo: "sumar", cantidad: 500 });
    e = reducir(e, { tipo: "cerrarBolsa" });
    e = reducir(e, { tipo: "terminar", id: "c1", fecha: "2026-10-14T10:00:00.000Z" });
    expect(e.historial[0]).toEqual({ id: "c1", fecha: "2026-10-14T10:00:00.000Z", especie: "cachama", talla: "pequeno", bolsas: [500] });
    expect(e.historial).toHaveLength(2);
    expect(e.bolsas).toEqual([]);
  });

  it("no termina un conteo sin bolsas", () => {
    expect(reducir(vacio, { tipo: "terminar", id: "x", fecha: "" })).toBe(vacio);
  });

  it("sin ?demo arranca vacío: sin conteos ni bolsas", () => {
    expect(estadoInicial()).toMatchObject({ enBolsa: 0, bolsas: [], historial: [], especie: null });
  });

  it("la meta sube y baja de 100 en 100 entre 100 y 10.000", () => {
    expect(cambiarMeta(1000, 100)).toBe(1100);
    expect(cambiarMeta(100, -100)).toBe(100);
    expect(cambiarMeta(10_000, 100)).toBe(10_000);
  });
});

describe("prueba de 100", () => {
  it("suma en vivo hasta que se termina, y repetir la pone en cero", () => {
    let e = reducir(vacio, { tipo: "repetirPrueba" });
    e = reducir(e, { tipo: "sumarPrueba", cantidad: 60 });
    e = reducir(e, { tipo: "sumarPrueba", cantidad: 37 });
    expect(e.pruebaEnVivo).toBe(97);
    e = reducir(e, { tipo: "resultadoPrueba", contados: 97 });
    expect(reducir(e, { tipo: "sumarPrueba", cantidad: 5 }).pruebaEnVivo).toBe(97);
    e = reducir(e, { tipo: "repetirPrueba" });
    expect(e).toMatchObject({ pruebaEnVivo: 0, pruebaApp: null });
  });
});
