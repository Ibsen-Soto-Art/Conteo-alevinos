import type { Bolsa, Conteo, Lote } from "@contador/domain";
import { describe, expect, it } from "vitest";
import { crearAcciones, crearAlmacen } from "../src/app/acciones";
import { enBolsa, estadoInicial, type EstadoSesion } from "../src/app/sesion";
import type { Repositorio } from "../src/shared/datos/repositorio";

/** Repositorio en memoria que anota lo que se guardó. */
function repoDePrueba(falla = false) {
  const guardado = { lotes: [] as Lote[], conteos: [] as Conteo[], bolsas: [] as Bolsa[] };
  const resultado = <T,>(lista: T[], x: T) => (falla ? Promise.reject(new Error("disco lleno")) : (lista.push(x), Promise.resolve()));
  const repo: Repositorio = {
    guardarLote: async (l) => resultado(guardado.lotes, l),
    guardarConteo: async (c) => resultado(guardado.conteos, c),
    guardarBolsa: async (b) => resultado(guardado.bolsas, b),
    leerHistorial: async () => [],
    cerrarConteosAbiertos: async () => {},
  };
  return { repo, guardado };
}

function preparar(estado: Partial<EstadoSesion> = {}, falla = false) {
  const almacen = crearAlmacen({ ...estadoInicial(), especie: "cachama", talla: "pequeno", ...estado });
  const { repo, guardado } = repoDePrueba(falla);
  let n = 0;
  const acciones = crearAcciones(almacen, { repo, ahora: () => new Date("2026-10-14T09:00:00.000Z"), nuevoId: () => `id${++n}` });
  return { almacen, acciones, guardado };
}

const esperarGuardado = () => new Promise((r) => setTimeout(r, 0));

describe("acciones", () => {
  it("una prueba buena crea el lote con su factor y lo guarda", async () => {
    const { almacen, acciones, guardado } = preparar({ pruebaApp: 97 });
    expect(acciones.aceptarPrueba()).toBe(true);
    await esperarGuardado();
    expect(almacen.leer().lote?.calibracion?.factor).toBeCloseTo(100 / 97, 6);
    expect(guardado.lotes).toHaveLength(1);
  });

  it("una prueba mala no crea lote", () => {
    const { almacen, acciones } = preparar({ pruebaApp: 80 });
    expect(acciones.aceptarPrueba()).toBe(false);
    expect(almacen.leer().lote).toBeNull();
  });

  it("cada bolsa se guarda al cerrarse, y deshacer guarda la bolsa como descartada", async () => {
    const { almacen, acciones, guardado } = preparar({ pruebaApp: 97 });
    acciones.aceptarPrueba();
    acciones.empezarConteo();
    almacen.despachar({ tipo: "sumar", cantidad: 970 });
    expect(acciones.cerrarBolsa()).toBe(true);
    acciones.deshacerCierre();
    await esperarGuardado();
    expect(guardado.bolsas.map((b) => [b.id, b.cantidad, b.estado])).toEqual([
      ["id3", 1000, "valida"],
      ["id3", 1000, "descartada"],
    ]);
    expect(enBolsa(almacen.leer())).toBe(1000);
  });

  it("dos toques seguidos en «Cerrar bolsa» guardan una sola bolsa (la segunda estaría vacía)", async () => {
    const { almacen, acciones, guardado } = preparar({ pruebaApp: 97 });
    acciones.aceptarPrueba();
    acciones.empezarConteo();
    almacen.despachar({ tipo: "sumar", cantidad: 970 });
    expect(acciones.cerrarBolsa()).toBe(true);
    expect(acciones.cerrarBolsa()).toBe(false);
    await esperarGuardado();
    expect(guardado.bolsas.map((b) => [b.numero, b.cantidad])).toEqual([[1, 1000]]);
  });

  it("terminar guarda el conteo con su hora de fin", async () => {
    const { almacen, acciones, guardado } = preparar({ pruebaApp: 97 });
    acciones.aceptarPrueba();
    acciones.empezarConteo();
    almacen.despachar({ tipo: "sumar", cantidad: 10 });
    acciones.cerrarBolsa();
    expect(acciones.terminar()).toBe(true);
    await esperarGuardado();
    expect(guardado.conteos.at(-1)).toMatchObject({ fin: "2026-10-14T09:00:00.000Z" });
    expect(almacen.leer().historial).toHaveLength(1);
  });

  it("si no se puede guardar, la app lo sabe", async () => {
    const { almacen, acciones } = preparar({ pruebaApp: 97 }, true);
    acciones.aceptarPrueba();
    await esperarGuardado();
    expect(almacen.leer().guardado).toBe(false);
  });
});
