import "fake-indexeddb/auto";
import { descartarBolsa, nuevaBolsa, type Conteo, type Lote } from "@contador/domain";
import { describe, expect, it } from "vitest";
import { crearRepositorio } from "../src/shared/datos/repositorio";

let n = 0;
const repoNuevo = () => crearRepositorio(`prueba-${++n}`);

const lote: Lote = { id: "l1", especie: "tilapia", talla: "mediano", creadoEn: "2026-10-14T08:00:00.000Z", calibracion: null };
const conteo = (id: string, fin: string | null, inicio = "2026-10-14T08:00:00.000Z"): Conteo => ({ id, loteId: "l1", metaPorBolsa: 1000, inicio, fin });
const bolsa = (id: string, conteoId: string, numero: number, crudo: number, cerradaEn = "2026-10-14T09:00:00.000Z") =>
  nuevaBolsa({ id, conteoId, numero, crudo, factor: 1, cerradaEn });

describe("repositorio en IndexedDB", () => {
  it("el historial trae los conteos terminados, el más reciente primero, con sus bolsas en orden", async () => {
    const repo = repoNuevo();
    await repo.guardarLote(lote);
    await repo.guardarConteo(conteo("c1", "2026-10-13T10:00:00.000Z"));
    await repo.guardarConteo(conteo("c2", "2026-10-14T10:00:00.000Z"));
    await repo.guardarBolsa(bolsa("b2", "c1", 2, 500));
    await repo.guardarBolsa(bolsa("b1", "c1", 1, 1000));
    await repo.guardarBolsa(bolsa("b3", "c2", 1, 700));

    const historial = await repo.leerHistorial();
    expect(historial.map((h) => [h.id, h.bolsas])).toEqual([
      ["c2", [700]],
      ["c1", [1000, 500]],
    ]);
    expect(historial[0]).toMatchObject({ especie: "tilapia", talla: "mediano", fecha: "2026-10-14T10:00:00.000Z" });
  });

  it("las bolsas descartadas no suman, pero siguen guardadas", async () => {
    const repo = repoNuevo();
    await repo.guardarLote(lote);
    await repo.guardarConteo(conteo("c1", "2026-10-14T10:00:00.000Z"));
    await repo.guardarBolsa(descartarBolsa(bolsa("b1", "c1", 1, 999)));
    await repo.guardarBolsa(bolsa("b2", "c1", 1, 1000));
    expect((await repo.leerHistorial())[0]!.bolsas).toEqual([1000]);
  });

  it("un conteo abierto (se apagó el teléfono) se cierra con la hora de su última bolsa y aparece en el historial", async () => {
    const repo = repoNuevo();
    await repo.guardarLote(lote);
    await repo.guardarConteo(conteo("c1", null));
    await repo.guardarBolsa(bolsa("b1", "c1", 1, 1000, "2026-10-14T09:10:00.000Z"));
    await repo.guardarBolsa(bolsa("b2", "c1", 2, 800, "2026-10-14T09:20:00.000Z"));
    expect(await repo.leerHistorial()).toEqual([]);

    await repo.cerrarConteosAbiertos();
    const [h] = await repo.leerHistorial();
    expect(h).toMatchObject({ id: "c1", fecha: "2026-10-14T09:20:00.000Z", bolsas: [1000, 800] });
  });

  it("un conteo sin bolsas no aparece en el historial", async () => {
    const repo = repoNuevo();
    await repo.guardarLote(lote);
    await repo.guardarConteo(conteo("c1", "2026-10-14T10:00:00.000Z"));
    expect(await repo.leerHistorial()).toEqual([]);
  });
});
