import { areaPoligono, ejes, envolventeDePuntos, type Medidas } from "./manchas";

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

/**
 * Rango del lote: mediana ± 3 dispersiones, pero al menos ±25 % (un lote parejo puede dar
 * dispersión 0 y no por eso hay que descartar al que mide un poco menos) y sin salirse de
 * 0,6× a 1,6× la mediana.
 */
export function rangoDelLote(m: Medida, minimoRelativo = 0.6, maximoRelativo = 1.6): Rango {
  const abajo = Math.min(m.mediana * 0.75, m.mediana - 3 * m.dispersion);
  const arriba = Math.max(m.mediana * 1.25, m.mediana + 3 * m.dispersion);
  return [Math.max(m.mediana * minimoRelativo, abajo), Math.min(m.mediana * maximoRelativo, arriba)];
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

  // Varios alevinos: dos cuerpos lado a lado (y aun así alargada: una cruz también tiene dos
  // «lomos», pero es redonda), o más larga o más ancha que uno solo.
  const variosAlevinos =
    (m.cuerpos >= 2 && m.relacion >= RELACION_BURBUJA) ||
    (p.largo !== null && m.largo > p.largo[1]) ||
    (p.ancho !== null && m.ancho > p.ancho[1]);

  if (p.largo !== null && m.largo < p.largo[0]) return { acepta: false, motivo: "tamano" };
  if (p.area !== null && m.area < p.area[0] * 0.8) return { acepta: false, motivo: "tamano" };
  // Algo mucho más grande que varios alevinos (una mano, una hoja grande).
  if (p.area !== null && m.area > p.area[1] * 6) return { acepta: false, motivo: "tamano" };

  // Los pedazos unidos dejan huecos entre ellos: su solidez no dice nada.
  if (m.pedazos === 1) {
    // Varios alevinos juntos son menos sólidos que uno, pero no tan irregulares como una hoja.
    const minima = variosAlevinos ? p.solidezMinima * 0.7 : p.solidezMinima;
    if (m.solidez < minima) return { acepta: false, motivo: "forma" };
  }
  // Más delgado que cualquier alevino visto desde arriba: pelo, palito, raya.
  if (!variosAlevinos && m.relacion > p.relacionArriba[1] * 1.3) return { acepta: false, motivo: "forma" };
  return { acepta: true };
}

/** Ancho máximo de UN alevino (visto de lado), en px; null si no se sabe el tamaño. */
export function anchoMaximoDeUno(p: PerfilPx): number | null {
  if (p.largoTipico === null) return null;
  return p.ancho?.[1] ?? (p.largoTipico / p.relacionLado[0]) * 1.1;
}

/**
 * Cuántos alevinos hay en una mancha, por su FORMA y no por su área: un pez de lado muestra
 * mucha más superficie pero tiene el mismo largo. Vale 1 si el largo es el de un alevino y el ancho
 * no pasa el de uno de lado. Vale más si el largo o el ancho superan claramente a uno, o si se
 * ven dos cuerpos (dos cabezas, dos colas).
 */
export function pesoPorForma(m: Medidas, p: PerfilPx): number {
  const L = p.largoTipico;
  const W = p.anchoTipico;
  const anchoUno = anchoMaximoDeUno(p);
  if (L === null || W === null || anchoUno === null) return 1;
  // Dos en fila (cola con cabeza) miden ~2 largos típicos. Para valer 2 por largo hace falta
  // evidencia clara: 1,75 largos típicos y un 10 % más que el largo máximo de uno del perfil.
  // Antes bastaba 1,5 típicos: un alevino de 3,3 a 3,6 cm con perfil pequeño (1–3 cm ± 20 %)
  // valía 2 aunque el perfil lo acepta como uno (prueba en campo: 50 objetos, contó 64).
  const largoDeUno = Math.max(1.75 * L, (p.largo?.[1] ?? 0) * 1.1);
  const porLargo = m.largo > largoDeUno ? Math.max(2, Math.round(m.largo / L)) : 1;
  const porAncho = m.ancho > anchoUno * 1.15 ? Math.max(2, Math.round(m.ancho / (W * 1.15))) : 1;
  const lateral = Math.max(m.cuerpos, porAncho);
  const peso = porLargo > 1 && lateral > 1 ? porLargo * lateral : Math.max(porLargo, lateral);
  // Nunca más alevinos de los que caben en el área.
  const areaUno = 0.65 * L * W;
  return Math.max(1, Math.min(peso, Math.ceil(m.area / (areaUno * 0.6))));
}

/**
 * Une los pedazos de un mismo pez: las bandas oscuras y las aletas transparentes del pangasius
 * pueden partir su sombra en cabeza, cuerpo y cola. Dos manchas se unen si juntas miden un
 * alevino (largo y ancho), van una detrás de la otra sobre el mismo eje (no lado a lado) y el
 * hueco entre ellas es corto. Tres alevinos enteros en fila no se unen: juntos miden tres largos.
 *
 * Sin el tamaño (sin marcas ni lote todavía) se unen solo si juntas tienen la forma de UN
 * alevino del perfil visto desde arriba, cada una es claramente más corta que la unión y el hueco
 * es corto. Antes, sin tamaño no se unía nada y un pez partido en dos contaba 2.
 */
export function unirPedazos(manchas: Medidas[], p: PerfilPx): Medidas[] {
  const L = p.largoTipico;
  const W = p.anchoTipico;
  const anchoUno = anchoMaximoDeUno(p);
  if (manchas.length < 2) return manchas;
  const esUnPez =
    L === null || W === null || anchoUno === null
      ? (a: Medidas, b: Medidas, u: Medidas) => pareceUnPezSinTamano(a, b, u, p)
      : (a: Medidas, b: Medidas, u: Medidas) => sonUnMismoPez(a, b, u, L, W, anchoUno);

  let grupos = [...manchas].sort((a, b) => b.area - a.area);
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (let i = 0; i < grupos.length && !cambio; i++) {
      for (let j = i + 1; j < grupos.length && !cambio; j++) {
        const u = unir(grupos[i]!, grupos[j]!);
        if (esUnPez(grupos[i]!, grupos[j]!, u)) {
          grupos = [u, ...grupos.filter((_, k) => k !== i && k !== j)];
          cambio = true;
        }
      }
    }
  }
  return grupos;
}

function sonUnMismoPez(a: Medidas, b: Medidas, u: Medidas, L: number, W: number, anchoUno: number): boolean {
  if (u.largo > 1.35 * L || u.ancho > anchoUno) return false;
  return enLinea(a, b, u, 0.35 * L, Math.max(0.6 * W, 2));
}

/** Sin tamaño: juntas tienen forma de un alevino desde arriba y son pedazos (no dos enteros). */
function pareceUnPezSinTamano(a: Medidas, b: Medidas, u: Medidas, p: PerfilPx): boolean {
  const [relMin, relMax] = p.relacionArriba;
  if (u.relacion < relMin * 0.8 || u.relacion > relMax) return false;
  // Dos alevinos enteros cola con cabeza: cada uno mide la mitad de la unión, pero la unión es el
  // doble de alargada que uno; con pedazos, cada uno es mucho más corto que el pez.
  if (Math.max(a.largo, b.largo) > 0.75 * u.largo) return false;
  // Si las dos ya tienen forma de alevino entero, son dos enteros en fila (en un grupo apretado
  // de objetos rechonchos pasaba: 50 contaban 27). Los pedazos de un pez son más rechonchos.
  if (Math.min(a.relacion, b.relacion) >= relMin * 0.7) return false;
  return enLinea(a, b, u, 0.2 * u.largo, Math.max(0.6 * u.ancho, 2));
}

/** Uno detrás del otro sobre el eje de la unión (no lado a lado), con un hueco corto y alineados. */
function enLinea(a: Medidas, b: Medidas, u: Medidas, huecoMaximo: number, lateralMaximo: number): boolean {
  const c = Math.cos(u.angulo);
  const s = Math.sin(u.angulo);
  const tramo = (m: Medidas) => {
    let min = Infinity;
    let max = -Infinity;
    for (let k = 0; k < m.envolvente.length; k += 2) {
      const t = (m.envolvente[k]! - u.x) * c + (m.envolvente[k + 1]! - u.y) * s;
      if (t < min) min = t;
      if (t > max) max = t;
    }
    return [min, max] as const;
  };
  const [a0, a1] = tramo(a);
  const [b0, b1] = tramo(b);
  const solape = Math.min(a1, b1) - Math.max(a0, b0);
  // Lado a lado: se solapan a lo largo del eje. Un pez partido: uno detrás del otro.
  if (solape > 0.3 * Math.min(a1 - a0, b1 - b0)) return false;
  if (-solape > huecoMaximo) return false;
  // Alineados: los dos centros cerca del eje de la unión.
  const lateral = (m: Medidas) => Math.abs(-(m.x - u.x) * s + (m.y - u.y) * c);
  return Math.max(lateral(a), lateral(b)) <= lateralMaximo;
}

/** Una mancha que junta las dos: área, centro y momentos exactos; envolvente de ambas. */
function unir(a: Medidas, b: Medidas): Medidas {
  const area = a.area + b.area;
  const x = (a.x * a.area + b.x * b.area) / area;
  const y = (a.y * a.area + b.y * b.area) / area;
  const momento = (m: Medidas, k: "m20" | "m02" | "m11") => {
    const dx = m.x - x;
    const dy = m.y - y;
    const extra = k === "m20" ? dx * dx : k === "m02" ? dy * dy : dx * dy;
    return (m[k] + extra) * m.area;
  };
  const m20 = (momento(a, "m20") + momento(b, "m20")) / area;
  const m02 = (momento(a, "m02") + momento(b, "m02")) / area;
  const m11 = (momento(a, "m11") + momento(b, "m11")) / area;
  const { largo, ancho, angulo } = ejes(m20, m02, m11);
  const puntos: [number, number][] = [];
  for (const m of [a, b]) for (let k = 0; k < m.envolvente.length; k += 2) puntos.push([m.envolvente[k]!, m.envolvente[k + 1]!]);
  const envolvente = envolventeDePuntos(puntos);
  return {
    x,
    y,
    area,
    largo,
    ancho,
    angulo,
    relacion: largo / ancho,
    solidez: Math.min(1, area / (areaPoligono(envolvente) || area)),
    hueco: 0,
    cuerpos: 1,
    caja: [Math.min(a.caja[0], b.caja[0]), Math.min(a.caja[1], b.caja[1]), Math.max(a.caja[2], b.caja[2]), Math.max(a.caja[3], b.caja[3])],
    envolvente,
    m20,
    m02,
    m11,
    pedazos: a.pedazos + b.pedazos,
  };
}
