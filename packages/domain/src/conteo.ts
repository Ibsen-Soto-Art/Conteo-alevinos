export interface Lote {
  id: string;
  especie: string;
  talla: string;
  factorCalibracion: number | null;
}

export interface Bolsa {
  numero: number;
  cantidad: number;
  cerradaEn: string;
}

export interface Conteo {
  id: string;
  loteId: string;
  metaPorBolsa: number | null;
  bolsas: Bolsa[];
}

export function totalConteo(conteo: Conteo): number {
  return conteo.bolsas.reduce((s, b) => s + b.cantidad, 0);
}

/** Cuántos faltan para la meta de la bolsa actual; null si no hay meta. */
export function faltanParaMeta(cantidadBolsa: number, meta: number | null): number | null {
  if (meta === null) return null;
  return Math.max(0, meta - cantidadBolsa);
}
