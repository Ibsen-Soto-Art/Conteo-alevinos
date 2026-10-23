import type { Bolsa, Conteo, Lote } from "@contador/domain";
import type { Especie, Talla } from "../shared/catalogo";
import { reducir, type EstadoSesion } from "./sesion";

const CLAVE = "contador.conteoEnCurso";

/**
 * El conteo abierto, tal como va: se guarda en el teléfono a cada cambio para que, si la página
 * se cierra (el iPhone la cierra en segundo plano, se acaba la batería), al volver se pueda seguir
 * sin perder la bolsa abierta ni repetir la Prueba de 100.
 */
export interface ConteoEnCurso {
  especie: Especie;
  talla: Talla;
  lote: Lote;
  meta: number | null;
  conteo: Conteo;
  /** Lo contado en la bolsa abierta, sin corregir. */
  crudo: number;
  bolsas: Bolsa[];
  pausado: boolean;
}

export function guardarEnCurso(e: EstadoSesion, almacen: Pick<Storage, "setItem" | "removeItem"> | undefined = globalThis.localStorage) {
  try {
    if (!e.conteo || !e.lote || !e.especie || !e.talla) {
      almacen?.removeItem(CLAVE);
      return;
    }
    const enCurso: ConteoEnCurso = {
      especie: e.especie,
      talla: e.talla,
      lote: e.lote,
      meta: e.meta,
      conteo: e.conteo,
      crudo: e.crudo,
      bolsas: e.bolsas,
      pausado: e.pausado,
    };
    almacen?.setItem(CLAVE, JSON.stringify(enCurso));
  } catch {
    // Sin almacenamiento (modo privado, lleno): las bolsas cerradas igual quedan en IndexedDB.
  }
}

export function leerEnCurso(almacen: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): ConteoEnCurso | null {
  try {
    const texto = almacen?.getItem(CLAVE);
    if (!texto) return null;
    const e = JSON.parse(texto) as Partial<ConteoEnCurso>;
    const valido =
      typeof e.especie === "string" &&
      typeof e.talla === "string" &&
      typeof e.lote?.id === "string" &&
      typeof e.conteo?.id === "string" &&
      e.conteo.fin === null &&
      typeof e.crudo === "number" &&
      Array.isArray(e.bolsas);
    return valido ? (e as ConteoEnCurso) : null;
  } catch {
    return null;
  }
}

/** El estado al abrir la app: si quedó un conteo abierto, sigue tal como iba. */
export function conConteoAbierto(inicial: EstadoSesion, almacen: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): EstadoSesion {
  const abierto = leerEnCurso(almacen);
  return abierto ? reducir(inicial, { tipo: "restaurar", enCurso: abierto }) : inicial;
}
