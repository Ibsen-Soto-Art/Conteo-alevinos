import { corregirConteo, type PasadaCalibracion } from "./calibracion";

export interface Lote {
  id: string;
  especie: string;
  talla: string;
  creadoEn: string;
  /** Pasadas de la prueba de 100 y el factor aceptado; null si no se ha calibrado. */
  calibracion: { pasadas: PasadaCalibracion[]; factor: number } | null;
  /** Perfil de especie y tamaño con el que se cuenta (perfiles.ts) y su versión. */
  perfilId?: string;
  versionPerfiles?: string;
}

export interface Conteo {
  id: string;
  loteId: string;
  metaPorBolsa: number | null;
  inicio: string;
  /** null mientras el conteo está abierto. */
  fin: string | null;
}

export type EstadoBolsa = "valida" | "descartada";

/** Una bolsa cerrada no se edita: si hubo un error se descarta y se cuenta de nuevo. */
export interface Bolsa {
  id: string;
  conteoId: string;
  numero: number;
  /** Lo que contó la app, sin corregir. */
  crudo: number;
  /** Factor de calibración con el que se corrigió. */
  factor: number;
  /** Lo crudo corregido con el factor: lo que se muestra y se suma. */
  cantidad: number;
  estado: EstadoBolsa;
  cerradaEn: string;
}

/**
 * Cada bolsa empieza en 0 y lleva solo lo que contó la app, corregido con el factor de la
 * prueba de 100. Los 100 de la prueba no van en ninguna bolsa: se devuelven al tanque.
 */
export function cantidadBolsa(crudo: number, factor: number): number {
  return corregirConteo(crudo, factor);
}

export function nuevaBolsa(p: Omit<Bolsa, "cantidad" | "estado">): Bolsa {
  return { ...p, cantidad: cantidadBolsa(p.crudo, p.factor), estado: "valida" };
}

export function descartarBolsa(b: Bolsa): Bolsa {
  return { ...b, estado: "descartada" };
}

export function bolsasValidas(bolsas: readonly Bolsa[]): Bolsa[] {
  return bolsas.filter((b) => b.estado === "valida");
}

/** Total del conteo: solo las bolsas válidas. */
export function totalConteo(bolsas: readonly Bolsa[]): number {
  return bolsasValidas(bolsas).reduce((s, b) => s + b.cantidad, 0);
}

/** Número de la bolsa que se está llenando: la que reemplaza a una descartada toma su número. */
export function siguienteNumero(bolsas: readonly Bolsa[]): number {
  return bolsasValidas(bolsas).length + 1;
}

/** Cuántos faltan para la meta de la bolsa actual (con el número ya corregido); null si no hay meta. */
export function faltanParaMeta(cantidadBolsa: number, meta: number | null): number | null {
  if (meta === null) return null;
  return Math.max(0, meta - cantidadBolsa);
}
