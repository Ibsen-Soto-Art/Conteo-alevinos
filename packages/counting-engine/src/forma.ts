import type { Medidas } from "./manchas";

export type Rango = readonly [minimo: number, maximo: number];

/**
 * Lo que el motor necesita del perfil de especie y tamaño (packages/domain/src/perfiles.ts):
 * forma vista desde arriba y de lado, tallas en cm, solidez, cierre y velocidad.
 */
export interface PerfilForma {
  largoCm: Rango;
  anchoCm: Rango;
  areaCm2: Rango;
  relacionArriba: Rango;
  relacionLado: Rango;
  solidezMinima: number;
  cierreRelativo: number;
  velocidadCmS: { tipica: number; maxima: number };
}

/** Mediana y dispersión (desviación robusta: 1,4826 × mediana de las desviaciones absolutas). */
export interface Medida {
  mediana: number;
  dispersion: number;
}

/** Lo que mide la Prueba de 100 (o el motor solo, al empezar) de los alevinos de un lote, en px. */
export interface EstadisticasLote {
  largo: Medida;
  ancho: Medida;
  area: Medida;
  relacion: Medida;
  muestras: number;
}

/** El perfil pasado a píxeles para este cuadro: con lo que se sabe del lote o de la escala. */
export interface PerfilPx {
  /** Rangos de un alevino solo; null si todavía no se sabe el tamaño (perfil amplio). */
  largo: Rango | null;
  ancho: Rango | null;
  area: Rango | null;
  relacionArriba: Rango;
  relacionLado: Rango;
  solidezMinima: number;
  /** Largo y ancho (desde arriba) de un alevino típico del lote, en px. */
  largoTipico: number | null;
  anchoTipico: number | null;
  /** Radio del cierre morfológico, en px. */
  radioCierre: number;
  /** Manchas más chicas son ruido. */
  areaMinima: number;
  /** De dónde salió el tamaño. */
  origen: "lote" | "escala" | "amplio";
}

const DESVIACION_ROBUSTA = 1.4826;

export function mediana(valores: number[]): number {
  const v = [...valores].sort((a, b) => a - b);
  const m = v.length >> 1;
  return v.length === 0 ? NaN : v.length % 2 ? v[m]! : (v[m - 1]! + v[m]!) / 2;
}

export function medida(valores: number[]): Medida {
  const m = mediana(valores);
  return { mediana: m, dispersion: DESVIACION_ROBUSTA * mediana(valores.map((v) => Math.abs(v - m))) };
}

/** Estadísticas de un grupo de alevinos medidos (uno por pista, ya sin los pegados ni los de lado). */
export function estadisticasDe(muestras: Pick<Medidas, "largo" | "ancho" | "area" | "relacion">[]): EstadisticasLote {
  return {
    largo: medida(muestras.map((m) => m.largo)),
    ancho: medida(muestras.map((m) => m.ancho)),
    area: medida(muestras.map((m) => m.area)),
    relacion: medida(muestras.map((m) => m.relacion)),
    muestras: muestras.length,
  };
}

/** Rango del lote: mediana ± 3 dispersiones, sin salirse de 0,6× a 1,6× la mediana. */
function rangoDelLote(m: Medida, minimoRelativo = 0.6, maximoRelativo = 1.6): Rango {
  return [Math.max(m.mediana * minimoRelativo, m.mediana - 3 * m.dispersion), Math.min(m.mediana * maximoRelativo, m.mediana + 3 * m.dispersion)];
}

const centro = (r: Rango) => (r[0] + r[1]) / 2;

/**
 * Pasa el perfil a píxeles. Manda lo medido en el lote (Prueba de 100); si no hay, la escala de
 * las marcas del canal (px por cm); si tampoco, el perfil amplio (solo forma, sin tamaño).
 */
export function perfilEnPixeles(
  perfil: PerfilForma,
  { lote = null, pxPorCm = null, areaMinima = 6 }: { lote?: EstadisticasLote | null; pxPorCm?: number | null; areaMinima?: number } = {},
): PerfilPx {
  const base = {
    relacionArriba: perfil.relacionArriba,
    relacionLado: perfil.relacionLado,
    solidezMinima: perfil.solidezMinima,
    areaMinima,
  };
  const radio = (anchoTipico: number | null) =>
    anchoTipico ? Math.max(1, Math.min(6, Math.round(perfil.cierreRelativo * anchoTipico))) : 1;

  if (lote && lote.muestras > 0) {
    const largoTipico = lote.largo.mediana;
    const anchoTipico = lote.ancho.mediana;
    const largo = rangoDelLote(lote.largo);
    // De lado se ve más ancho: el máximo es el largo ÷ la relación de lado más baja.
    const anchoMax = Math.max(rangoDelLote(lote.ancho)[1], (largo[1] / perfil.relacionLado[0]) * 1.1);
    return {
      ...base,
      largo,
      ancho: [rangoDelLote(lote.ancho)[0], anchoMax],
      area: [rangoDelLote(lote.area)[0], Math.max(rangoDelLote(lote.area)[1], lote.area.mediana * (anchoMax / anchoTipico))],
      largoTipico,
      anchoTipico,
      radioCierre: radio(anchoTipico),
      origen: "lote",
    };
  }
  if (pxPorCm && pxPorCm > 0) {
    const largoTipico = centro(perfil.largoCm) * pxPorCm;
    const anchoTipico = largoTipico / centro(perfil.relacionArriba);
    return {
      ...base,
      largo: [perfil.largoCm[0] * pxPorCm, perfil.largoCm[1] * pxPorCm],
      ancho: [perfil.anchoCm[0] * pxPorCm, perfil.anchoCm[1] * pxPorCm],
      area: [perfil.areaCm2[0] * pxPorCm ** 2, perfil.areaCm2[1] * pxPorCm ** 2],
      largoTipico,
      anchoTipico,
      radioCierre: radio(anchoTipico),
      origen: "escala",
    };
  }
  return { ...base, largo: null, ancho: null, area: null, largoTipico: null, anchoTipico: null, radioCierre: 1, origen: "amplio" };
}

export type Motivo = "tamano" | "forma" | "burbuja" | "quieto";

export const NOMBRE_MOTIVO: Record<Motivo, string> = {
  tamano: "tamaño",
  forma: "forma",
  burbuja: "burbuja",
  quieto: "quieto",
};

/** Ningún alevino, ni de lado, es tan redondo. */
const RELACION_BURBUJA = 1.6;

/**
 * ¿Es un alevino (o varios)? Si no, por qué se descarta. Las manchas del tamaño de varios alevinos
 * no se descartan por forma: el peso decide cuántos son.
 */
export function clasificar(m: Medidas, p: PerfilPx): { acepta: true } | { acepta: false; motivo: Motivo } {
  if (m.area < p.areaMinima) return { acepta: false, motivo: "tamano" };

  // Burbujas: anillo con el centro claro, o una mancha casi redonda y llena (una cruz o una
  // estrella también son «redondas» en sus momentos, pero no son llenas: esas son basura).
  if (m.hueco >= 0.12 && m.relacion < 2.2) return { acepta: false, motivo: "burbuja" };
  if (m.relacion < RELACION_BURBUJA && m.cuerpos < 2 && m.solidez >= 0.8) return { acepta: false, motivo: "burbuja" };

  const variosAlevinos =
    m.cuerpos >= 2 ||
    (p.largo !== null && m.largo > p.largo[1]) ||
    (p.ancho !== null && m.ancho > p.ancho[1]);

  if (p.largo !== null && m.largo < p.largo[0]) return { acepta: false, motivo: "tamano" };
  if (p.area !== null && m.area < p.area[0] * 0.8) return { acepta: false, motivo: "tamano" };
  // Algo mucho más grande que varios alevinos (una mano, una hoja grande).
  if (p.area !== null && m.area > p.area[1] * 6) return { acepta: false, motivo: "tamano" };

  if (!variosAlevinos) {
    if (m.solidez < p.solidezMinima) return { acepta: false, motivo: "forma" };
    // Más delgado que cualquier alevino visto desde arriba: pelo, palito, raya.
    if (m.relacion > p.relacionArriba[1] * 1.3) return { acepta: false, motivo: "forma" };
  }
  return { acepta: true };
}
