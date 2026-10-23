import type { Conteo, Lote } from "@contador/domain";
import { describe, expect, it } from "vitest";
import {
  cambiarMeta,
  enBolsa,
  estadoDeEjemplo,
  estadoInicial,
  numeroBolsaAbierta,
  reducir,
  totalHoy,
  type Accion,
  type EstadoSesion,
} from "../src/app/sesion";

const lote: Lote = {
  id: "l1",
  especie: "cachama",
  talla: "pequeno",
  creadoEn: "2026-10-14T08:00:00.000Z",
  calibracion: { pasadas: [{ contadosAMano: 100, contadosPorApp: 97 }], factor: 100 / 97 },
};
const conteo: Conteo = { id: "c1", loteId: "l1", metaPorBolsa: 1000, inicio: "2026-10-14T08:05:00.000Z", fin: null };

/** Sesión lista para contar: prueba de 100 aceptada (97 de 100) y conteo abierto. */
function contando(): EstadoSesion {
  return aplicar(
    { ...estadoInicial(), especie: "cachama", talla: "pequeno" },
    { tipo: "aceptarPrueba", lote },
    { tipo: "empezarConteo", conteo },
  );
}

function aplicar(e: EstadoSesion, ...acciones: Accion[]) {
  return acciones.reduce(reducir, e);
}

const cerrar = (n: number): Accion => ({ tipo: "cerrarBolsa", id: `b${n}`, cerradaEn: `2026-10-14T09:0${n}:00.000Z` });

describe("sesión de conteo", () => {
  it("después de la prueba de 100, Contando empieza la bolsa 1 en 0 (los 100 vuelven al tanque)", () => {
    const e = contando();
    expect(enBolsa(e)).toBe(0);
    expect(numeroBolsaAbierta(e)).toBe(1);
    expect(totalHoy(e)).toBe(0);
  });

  it("lo que cuenta la app se corrige con el factor de la prueba", () => {
    // 970 crudos × 100/97 = 1000
    expect(enBolsa(aplicar(contando(), { tipo: "sumar", cantidad: 970 }))).toBe(1000);
  });

  it("cerrar bolsa la guarda corregida y pone el contador en cero", () => {
    const e = aplicar(contando(), { tipo: "sumar", cantidad: 970 }, cerrar(1));
    expect(e.bolsas[0]).toMatchObject({ id: "b1", numero: 1, crudo: 970, cantidad: 1000, estado: "valida" });
    expect(numeroBolsaAbierta(e)).toBe(2);
    expect(enBolsa(e)).toBe(0);
  });

  it("deshacer descarta la bolsa (no la borra) y devuelve su conteo al contador", () => {
    const e = aplicar(contando(), { tipo: "sumar", cantidad: 970 }, cerrar(1), { tipo: "deshacerCierre" });
    expect(e.bolsas).toHaveLength(1);
    expect(e.bolsas[0]!.estado).toBe("descartada");
    expect(numeroBolsaAbierta(e)).toBe(1);
    expect(enBolsa(e)).toBe(1000);
  });

  it("resta el alevino ya contado que se devuelve, sin bajar de 0", () => {
    expect(aplicar(contando(), { tipo: "sumar", cantidad: 5 }, { tipo: "sumar", cantidad: -1 }).crudo).toBe(4);
    expect(aplicar(contando(), { tipo: "sumar", cantidad: -1 }).crudo).toBe(0);
  });

  it("en pausa no suma", () => {
    expect(enBolsa(aplicar(contando(), { tipo: "pausar" }, { tipo: "sumar", cantidad: 5 }))).toBe(0);
  });

  it("sin conteo abierto no suma", () => {
    expect(reducir(estadoInicial(), { tipo: "sumar", cantidad: 5 }).crudo).toBe(0);
  });

  it("el total de hoy suma las bolsas válidas y la abierta", () => {
    const e = aplicar(contando(), { tipo: "sumar", cantidad: 970 }, cerrar(1), { tipo: "sumar", cantidad: 97 });
    expect(totalHoy(e)).toBe(1000 + 100);
  });

  it("terminar pasa el conteo al historial, de primero, solo con las bolsas válidas", () => {
    const e = aplicar(
      { ...contando(), historial: estadoDeEjemplo().historial },
      { tipo: "sumar", cantidad: 970 },
      cerrar(1),
      { tipo: "sumar", cantidad: 485 },
      cerrar(2),
      { tipo: "deshacerCierre" },
      cerrar(3),
      { tipo: "terminar", fin: "2026-10-14T10:00:00.000Z" },
    );
    expect(e.historial[0]).toEqual({
      id: "c1",
      fecha: "2026-10-14T10:00:00.000Z",
      especie: "cachama",
      talla: "pequeno",
      bolsas: [1000, 500],
    });
    expect(e.historial).toHaveLength(2);
    expect(e.conteo).toBeNull();
  });

  it("no termina un conteo sin alevinos", () => {
    const e = contando();
    expect(reducir(e, { tipo: "terminar", fin: "" })).toBe(e);
  });

  it("empezar (sin conteo abierto) limpia el lote y la prueba, pero no el historial", () => {
    const sinConteo = reducir(estadoDeEjemplo(), { tipo: "abandonarConteo" });
    const e = reducir(sinConteo, { tipo: "empezar" });
    expect(e).toMatchObject({ especie: null, talla: null, lote: null, conteo: null, crudo: 0, bolsas: [] });
    expect(e.historial).toHaveLength(1);
  });

  it("con un conteo abierto no se empieza otro encima: ni desde el Inicio ni volviendo atrás", () => {
    const abierto = estadoDeEjemplo();
    expect(reducir(abierto, { tipo: "empezar" })).toBe(abierto);
    expect(reducir(abierto, { tipo: "empezarConteo", conteo: { ...abierto.conteo!, id: "otro" } })).toBe(abierto);
  });

  it("restaurar deja el conteo abierto tal como iba", () => {
    const ej = estadoDeEjemplo();
    const e = reducir(estadoInicial(), {
      tipo: "restaurar",
      enCurso: { especie: ej.especie!, talla: ej.talla!, lote: ej.lote!, meta: ej.meta, conteo: ej.conteo!, crudo: ej.crudo, bolsas: ej.bolsas, pausado: false },
    });
    expect(e).toMatchObject({ conteo: ej.conteo, lote: ej.lote, crudo: 740, bolsas: ej.bolsas });
    expect(numeroBolsaAbierta(e)).toBe(3);
  });

  it("sin ?demo arranca vacío", () => {
    expect(estadoInicial()).toMatchObject({ lote: null, conteo: null, bolsas: [], historial: [], guardado: true });
  });

  it("la meta sube y baja de 100 en 100 entre 100 y 10.000", () => {
    expect(cambiarMeta(1000, 100)).toBe(1100);
    expect(cambiarMeta(100, -100)).toBe(100);
    expect(cambiarMeta(10_000, 100)).toBe(10_000);
  });
});

describe("prueba de 100", () => {
  const medidas = { largo: { mediana: 40, dispersion: 2 }, ancho: { mediana: 8, dispersion: 1 }, area: { mediana: 250, dispersion: 20 }, relacion: { mediana: 5, dispersion: 0.4 }, muestras: 87, anchoRecorte: 300 };

  it("guarda lo que midió con el resultado, y repetir o volver a cero lo borra", () => {
    let e = reducir(estadoInicial(), { tipo: "resultadoPrueba", contados: 97, estadisticas: medidas });
    expect(e.pruebaEstadisticas).toEqual(medidas);
    e = reducir(e, { tipo: "repetirPrueba" });
    expect(e.pruebaEstadisticas).toBeNull();
    e = reducir(reducir(e, { tipo: "resultadoPrueba", contados: 97, estadisticas: medidas }), { tipo: "pruebaACero" });
    expect(e.pruebaEstadisticas).toBeNull();
  });

  it("suma en vivo hasta que se termina, y repetir la pone en cero", () => {
    let e = aplicar(estadoInicial(), { tipo: "sumarPrueba", cantidad: 60 }, { tipo: "sumarPrueba", cantidad: 37 });
    expect(e.pruebaEnVivo).toBe(97);
    e = reducir(e, { tipo: "resultadoPrueba", contados: 97 });
    expect(reducir(e, { tipo: "sumarPrueba", cantidad: 5 }).pruebaEnVivo).toBe(97);
    e = reducir(e, { tipo: "repetirPrueba" });
    expect(e).toMatchObject({ pruebaEnVivo: 0, pruebaApp: null });
  });
});

describe("volver a cero", () => {
  it("en Contando pone en 0 solo la bolsa abierta: las cerradas y su total no cambian", () => {
    const e = aplicar(contando(), { tipo: "sumar", cantidad: 970 }, cerrar(1), { tipo: "sumar", cantidad: 300 }, { tipo: "bolsaACero" });
    expect(e.crudo).toBe(0);
    expect(e.bolsas).toHaveLength(1);
    expect(e.bolsas[0]).toMatchObject({ estado: "valida", crudo: 970 });
    expect(numeroBolsaAbierta(e)).toBe(2);
    expect(totalHoy(e)).toBe(e.bolsas[0]!.cantidad);
  });

  it("en la prueba de 100 pone el conteo en 0 sin perder el pez ni el tamaño", () => {
    const e = aplicar(
      { ...estadoInicial(), especie: "bocachico", talla: "mediano" },
      { tipo: "sumarPrueba", cantidad: 42 },
      { tipo: "pruebaACero" },
    );
    expect(e).toMatchObject({ pruebaEnVivo: 0, pruebaApp: null, especie: "bocachico", talla: "mediano" });
  });
});
