import { resolve } from "node:path";

/** Video sintético que hace de cámara en las pruebas (se genera en e2e/preparar.ts). */
export const VIDEO_PECES = {
  ancho: 360,
  alto: 640,
  segundos: 9,
  /** Filas de alevinos que cruzan la línea en cada vuelta del video. */
  filas: 10,
  /** Alevinos lado a lado en cada fila. */
  porFila: 4,
  /** Lado de cada mancha, en píxeles. */
  lado: 16,
  /** Píxeles por segundo. */
  velocidad: 160,
  /** Segundos entre una fila y la siguiente. */
  separacion: 0.6,
};

/** Alevinos que cruzan la línea en cada vuelta del video. */
export const PECES_POR_VUELTA = VIDEO_PECES.filas * VIDEO_PECES.porFila;

export const VIDEO_CAMARA = resolve(import.meta.dirname, ".generado/peces.mjpeg");
