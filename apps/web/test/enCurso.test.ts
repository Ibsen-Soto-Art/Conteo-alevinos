import { describe, expect, it } from "vitest";
import { conConteoAbierto, guardarEnCurso, leerEnCurso } from "../src/app/enCurso";
import { enBolsa, estadoDeEjemplo, estadoInicial, reducir } from "../src/app/sesion";

function almacen() {
  const datos = new Map<string, string>();
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
    datos,
  };
}

describe("conteo en curso guardado en el teléfono", () => {
  it("si la página se cierra contando, al abrir sigue donde iba: bolsas, bolsa abierta, lote y meta", () => {
    const a = almacen();
    const contando = estadoDeEjemplo();
    guardarEnCurso(contando, a);
    const alAbrir = conConteoAbierto(estadoInicial(), a);
    expect(alAbrir.conteo).toEqual(contando.conteo);
    expect(alAbrir.lote).toEqual(contando.lote);
    expect(alAbrir.bolsas).toEqual(contando.bolsas);
    expect(enBolsa(alAbrir)).toBe(enBolsa(contando));
    expect(alAbrir.meta).toBe(contando.meta);
  });

  it("al terminar el conteo se borra: la próxima vez la app abre normal", () => {
    const a = almacen();
    guardarEnCurso(estadoDeEjemplo(), a);
    guardarEnCurso(reducir(estadoDeEjemplo(), { tipo: "abandonarConteo" }), a);
    expect(leerEnCurso(a)).toBeNull();
    expect(conConteoAbierto(estadoInicial(), a)).toEqual(estadoInicial());
  });

  it("lo guardado dañado o de otra forma se ignora", () => {
    const a = almacen();
    a.setItem("contador.conteoEnCurso", "{no es json");
    expect(leerEnCurso(a)).toBeNull();
    a.setItem("contador.conteoEnCurso", JSON.stringify({ conteo: { id: "x", fin: "2026-10-20" } }));
    expect(leerEnCurso(a)).toBeNull();
  });

  it("un teléfono que no deja guardar no rompe la app", () => {
    const roto = { setItem: () => { throw new Error("lleno"); }, removeItem: () => { throw new Error("lleno"); }, getItem: () => { throw new Error("no"); } };
    expect(() => guardarEnCurso(estadoDeEjemplo(), roto)).not.toThrow();
    expect(leerEnCurso(roto)).toBeNull();
  });
});
