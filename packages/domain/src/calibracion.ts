/** Rango aceptado para el factor de calibración (ADR propuesto: la app falla menos de 10%). */
export const FACTOR_MINIMO = 0.9;
export const FACTOR_MAXIMO = 1.1;

export interface PasadaCalibracion {
  /** Alevinos contados a mano antes de pasarlos por el canal. */
  contadosAMano: number;
  /** Alevinos que contó la app en esa misma pasada. */
  contadosPorApp: number;
}

export type ResultadoCalibracion =
  | { ok: true; factor: number; errorApp: number }
  | { ok: false; motivo: "sin_datos" | "fuera_de_rango"; factor?: number; errorApp?: number };

/**
 * Calcula el factor de corrección de un lote. Con varias pasadas suma los totales,
 * que pesa más las pasadas grandes que un promedio simple de factores.
 */
export function calcularCalibracion(pasadas: PasadaCalibracion[]): ResultadoCalibracion {
  const mano = pasadas.reduce((s, p) => s + p.contadosAMano, 0);
  const app = pasadas.reduce((s, p) => s + p.contadosPorApp, 0);
  if (mano <= 0 || app <= 0) return { ok: false, motivo: "sin_datos" };

  const factor = mano / app;
  const errorApp = (app - mano) / mano;
  if (factor < FACTOR_MINIMO || factor > FACTOR_MAXIMO) {
    return { ok: false, motivo: "fuera_de_rango", factor, errorApp };
  }
  return { ok: true, factor, errorApp };
}

/** Aplica el factor a un conteo crudo y redondea al alevino más cercano. */
export function corregirConteo(conteoCrudo: number, factor: number): number {
  return Math.round(conteoCrudo * factor);
}
