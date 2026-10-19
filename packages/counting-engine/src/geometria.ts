import { tamanoProceso } from "./ajustes";
import type { AnalisisCanal, Marca } from "./canal";
import type { EstadisticasLote } from "./forma";
import type { Zona } from "./tipos";

/**
 * Dónde está el canal en el video y a qué tamaño se cuenta. Lo usan la app y el script de
 * precisión, para que los dos midan igual.
 */

/** Lado mayor del cuadro completo con que se busca el canal y sus marcas. */
export const LADO_ANALISIS = 640;
/** Lado mayor del recorte del canal que se cuenta (más detalle que reducir todo el cuadro a 320). */
export const LADO_RECORTE = 480;
/** Cuadros que se combinan para buscar el canal (los alevinos que pasan desaparecen). */
export const CUADROS_ANALISIS = 8;

/** El canal en píxeles del video. */
export interface CanalVideo {
  zona: Zona;
  marcas: Marca[];
  /** Píxeles del video por centímetro; null sin las 4 marcas. */
  pxPorCm: number | null;
  fuente: AnalisisCanal["fuente"];
}

/** Dónde está el canal y a qué tamaño se cuenta. */
export interface Geometria {
  canal: CanalVideo;
  /** Tamaño del recorte que recibe el motor. */
  recorte: { ancho: number; alto: number };
  /** Píxeles por centímetro en el recorte; null sin las 4 marcas. */
  pxPorCmRecorte: number | null;
}

/** Pasa el análisis (hecho en un cuadro de `analizado`) a píxeles del video. */
export function canalEnVideo(a: AnalisisCanal, analizado: { ancho: number; alto: number }, video: { ancho: number; alto: number }): CanalVideo {
  const k = video.ancho / analizado.ancho;
  return {
    zona: { x: a.zona.x * k, y: a.zona.y * k, ancho: a.zona.ancho * k, alto: a.zona.alto * k },
    marcas: a.marcas.map((m) => ({ x: m.x * k, y: m.y * k, lado: m.lado * k })),
    pxPorCm: a.pxPorCm === null ? null : a.pxPorCm * k,
    fuente: a.fuente,
  };
}

/** El recorte del canal: lado mayor hasta 480 px (sin agrandar) y la escala en ese recorte. */
export function geometriaDe(canal: CanalVideo, ladoRecorte = LADO_RECORTE): Geometria {
  const recorte = tamanoProceso(canal.zona.ancho, canal.zona.alto, ladoRecorte);
  return { canal, recorte, pxPorCmRecorte: canal.pxPorCm === null ? null : (canal.pxPorCm * recorte.ancho) / canal.zona.ancho };
}

/** Pasa un punto del recorte a píxeles del video. */
export function recorteAVideo(x: number, y: number, g: Geometria): { x: number; y: number } {
  const { zona } = g.canal;
  return { x: zona.x + (x * zona.ancho) / g.recorte.ancho, y: zona.y + (y * zona.alto) / g.recorte.alto };
}

/**
 * Lleva lo medido en un recorte de `anchoRecorte` px a otro de `anchoNuevo` px (largos por la razón,
 * áreas por la razón al cuadrado; la relación largo/ancho no cambia).
 */
export function escalarEstadisticas(e: EstadisticasLote & { anchoRecorte?: number }, anchoNuevo: number): EstadisticasLote {
  if (!e.anchoRecorte || e.anchoRecorte === anchoNuevo) return e;
  const k = anchoNuevo / e.anchoRecorte;
  const por = (m: { mediana: number; dispersion: number }, f: number) => ({ mediana: m.mediana * f, dispersion: m.dispersion * f });
  return { ...e, largo: por(e.largo, k), ancho: por(e.ancho, k), area: por(e.area, k * k), anchoRecorte: anchoNuevo } as EstadisticasLote;
}
