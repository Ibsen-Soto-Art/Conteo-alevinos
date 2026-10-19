import { bolsasValidas, type Bolsa, type Conteo, type Lote } from "@contador/domain";
import Dexie, { type EntityTable } from "dexie";

/** Un conteo terminado tal como lo muestran Inicio, Conteos y Resumen. */
export interface ConteoGuardado {
  id: string;
  /** Fecha ISO de cuando se terminó. */
  fecha: string;
  /** Puede ser una especie que ya no se elige (por ejemplo «tilapia» de conteos viejos). */
  especie: string;
  talla: string;
  /** Cantidad de cada bolsa válida, en orden. */
  bolsas: number[];
}

/**
 * Dónde se guardan lotes, conteos y bolsas en el teléfono (sin internet).
 * Las bolsas son de solo agregar: una bolsa cerrada no cambia, solo puede marcarse descartada.
 */
export interface Repositorio {
  guardarLote(lote: Lote): Promise<void>;
  guardarConteo(conteo: Conteo): Promise<void>;
  guardarBolsa(bolsa: Bolsa): Promise<void>;
  /** Conteos terminados, el más reciente primero. */
  leerHistorial(limite?: number): Promise<ConteoGuardado[]>;
  /** Si el teléfono se apagó contando, el conteo se cierra con la hora de su última bolsa: no se pierde nada. */
  cerrarConteosAbiertos(): Promise<void>;
}

class BaseDeDatos extends Dexie {
  lotes!: EntityTable<Lote, "id">;
  conteos!: EntityTable<Conteo, "id">;
  bolsas!: EntityTable<Bolsa, "id">;

  constructor(nombre: string) {
    super(nombre);
    this.version(1).stores({
      lotes: "id",
      conteos: "id, loteId, inicio",
      bolsas: "id, conteoId",
    });
  }
}

export function crearRepositorio(nombre = "contador-alevinos"): Repositorio {
  const db = new BaseDeDatos(nombre);

  return {
    async guardarLote(lote) {
      await db.lotes.put(lote);
    },
    async guardarConteo(conteo) {
      await db.conteos.put(conteo);
    },
    async guardarBolsa(bolsa) {
      await db.bolsas.put(bolsa);
    },

    async leerHistorial(limite = 200) {
      const terminados = (await db.conteos.toArray())
        .filter((c): c is Conteo & { fin: string } => c.fin !== null)
        .sort((a, b) => b.fin.localeCompare(a.fin));

      const historial: ConteoGuardado[] = [];
      for (const c of terminados) {
        if (historial.length >= limite) break;
        const [lote, bolsas] = await Promise.all([db.lotes.get(c.loteId), db.bolsas.where("conteoId").equals(c.id).toArray()]);
        const validas = bolsasValidas(bolsas).sort((a, b) => a.numero - b.numero);
        if (!lote || validas.length === 0) continue;
        historial.push({
          id: c.id,
          fecha: c.fin,
          especie: lote.especie,
          talla: lote.talla,
          bolsas: validas.map((b) => b.cantidad),
        });
      }
      return historial;
    },

    async cerrarConteosAbiertos() {
      await db.transaction("rw", db.conteos, db.bolsas, async () => {
        const abiertos = (await db.conteos.toArray()).filter((c) => c.fin === null);
        for (const c of abiertos) {
          const bolsas = await db.bolsas.where("conteoId").equals(c.id).toArray();
          const ultima = bolsas.map((b) => b.cerradaEn).sort().at(-1);
          await db.conteos.put({ ...c, fin: ultima ?? c.inicio });
        }
      });
    },
  };
}

/** Para el modo de ejemplo (?demo): no guarda nada, así no mezcla datos de ejemplo con los reales. */
export const repositorioDeEjemplo: Repositorio = {
  guardarLote: async () => {},
  guardarConteo: async () => {},
  guardarBolsa: async () => {},
  leerHistorial: async () => [],
  cerrarConteosAbiertos: async () => {},
};
