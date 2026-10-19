/**
 * Perfiles de especie y tamaño para el motor de conteo (ver docs/especies/perfiles.md).
 *
 * La cámara solo ve la silueta oscura desde arriba, así que el perfil describe forma y tamaño,
 * no color. Los valores de forma son ESTIMADOS a partir del documento de caracterización y
 * se ajustan con videos de finca y con la Prueba de 100 de cada lote. Cambiar un valor
 * cambia VERSION_PERFILES: cada lote guarda la versión con la que se contó.
 */

export const VERSION_PERFILES = "2026-10-19.1";

export type EspeciePerfil = "cachama" | "pangasius" | "bocachico" | "otra";
export type TamanoPerfil = "pequeno" | "mediano" | "grande";
export type Rango = readonly [minimo: number, maximo: number];

export interface PerfilEspecie {
  /** «cachama-pequeno». */
  id: string;
  especie: EspeciePerfil;
  tamano: TamanoPerfil;
  nombre: string;
  /** Largo total aceptado, en cm (el del tamaño con margen). */
  largoCm: Rango;
  /** Ancho (eje menor): desde el más delgado visto desde arriba hasta el más grande visto de lado. */
  anchoCm: Rango;
  /** Área de la silueta, de la más delgada desde arriba a la más grande de lado. */
  areaCm2: Rango;
  /** Largo ÷ ancho visto desde arriba (nadando normal). */
  relacionArriba: Rango;
  /** Largo ÷ alto: cómo se ve si se pone de lado. */
  relacionLado: Rango;
  /** Área de la mancha ÷ área de su envolvente convexa. Menos que esto es basura u hoja. */
  solidezMinima: number;
  /** Tamaño del cierre morfológico, como fracción del ancho típico (une cabeza, cuerpo y cola). */
  cierreRelativo: number;
  /** Velocidad en el canal, cm/s: típica y máxima esperada. */
  velocidadCmS: { tipica: number; maxima: number };
}

/** Largo total de cada tamaño, en cm (aprobado para empezar; lo ajusta la Prueba de 100). */
export const TAMANOS_CM: Record<TamanoPerfil, Rango> = {
  pequeno: [1, 3],
  mediano: [3, 5],
  grande: [5, 8],
};

const NOMBRE_TAMANO: Record<TamanoPerfil, string> = { pequeno: "pequeño", mediano: "mediano", grande: "grande" };
const VELOCIDAD_MAXIMA_CM_S: Record<TamanoPerfil, number> = { pequeno: 25, mediano: 35, grande: 45 };

/** Fracción que llena una silueta de pez dentro de su rectángulo largo × ancho. */
export const LLENADO_SILUETA = 0.65;

/** Lo que distingue a cada especie vista desde arriba (estimado; ver perfiles.md). */
const FORMA: Record<
  EspeciePerfil,
  { nombre: string; margen: number; relacionArriba: Rango; relacionLado: Rango; solidezMinima: number; cierreRelativo: number }
> = {
  // Alargado tipo bagre, cabeza ancha y aplanada; aletas casi transparentes y bandas oscuras
  // parten la sombra: solidez más baja y cierre más fuerte.
  pangasius: { nombre: "Pangasius", margen: 0.2, relacionArriba: [4.5, 8], relacionLado: [3.5, 5.5], solidezMinima: 0.55, cierreRelativo: 0.35 },
  // Alta y comprimida: angosta desde arriba, muy ancha de lado.
  cachama: { nombre: "Cachama", margen: 0.2, relacionArriba: [4, 9], relacionLado: [1.8, 3], solidezMinima: 0.65, cierreRelativo: 0.25 },
  // Fusiforme y alargada; rangos ampliados para cubrir las especies de Prochilodus que se venden.
  bocachico: { nombre: "Bocachico (Prochilodus)", margen: 0.2, relacionArriba: [4, 7.5], relacionLado: [2.6, 4.2], solidezMinima: 0.65, cierreRelativo: 0.25 },
  // Genérico, para especies sin perfil propio.
  otra: { nombre: "Otra especie", margen: 0.3, relacionArriba: [2.5, 10], relacionLado: [1.6, 6], solidezMinima: 0.55, cierreRelativo: 0.3 },
};

const redondear = (n: number) => Math.round(n * 1000) / 1000;

function crearPerfil(especie: EspeciePerfil, tamano: TamanoPerfil): PerfilEspecie {
  const f = FORMA[especie];
  const [min, max] = TAMANOS_CM[tamano];
  const largoCm: Rango = [redondear(min * (1 - f.margen)), redondear(max * (1 + f.margen))];
  const anchoCm: Rango = [largoCm[0] / f.relacionArriba[1], largoCm[1] / f.relacionLado[0]];
  return {
    id: `${especie}-${tamano}`,
    especie,
    tamano,
    nombre: `${f.nombre} ${NOMBRE_TAMANO[tamano]}`,
    largoCm,
    anchoCm,
    areaCm2: [LLENADO_SILUETA * largoCm[0] * anchoCm[0], LLENADO_SILUETA * largoCm[1] * anchoCm[1]],
    relacionArriba: f.relacionArriba,
    relacionLado: f.relacionLado,
    solidezMinima: f.solidezMinima,
    cierreRelativo: f.cierreRelativo,
    velocidadCmS: { tipica: 15, maxima: VELOCIDAD_MAXIMA_CM_S[tamano] },
  };
}

export const PERFILES: readonly PerfilEspecie[] = (["cachama", "pangasius", "bocachico", "otra"] as const).flatMap((e) =>
  (["pequeno", "mediano", "grande"] as const).map((t) => crearPerfil(e, t)),
);

export function perfilDe(especie: EspeciePerfil, tamano: TamanoPerfil): PerfilEspecie {
  return PERFILES.find((p) => p.especie === especie && p.tamano === tamano)!;
}

export function perfilPorId(id: string): PerfilEspecie | undefined {
  return PERFILES.find((p) => p.id === id);
}
