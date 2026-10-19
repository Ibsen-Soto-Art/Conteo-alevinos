import { resolve } from "node:path";

/** Video sintético que hace de cámara en las pruebas (se genera en e2e/preparar.ts). */
export const VIDEO_PECES = {
  ancho: 360,
  alto: 640,
  /** Segundos con el canal vacío al empezar (la app aprende el fondo en ~3 s). */
  vacio: 4.5,
  segundos: 13.5,
  /** Filas de alevinos que cruzan la franja en cada vuelta del video. */
  filas: 10,
  /** Alevinos lado a lado en cada fila. */
  porFila: 4,
  /** Cada alevino es una elipse de este ancho y largo (px), nadando hacia abajo. */
  anchoPez: 12,
  largoPez: 40,
  /** Píxeles por segundo. */
  velocidad: 160,
  /** Segundos entre una fila y la siguiente. */
  separacion: 0.6,
};

/** Alevinos que cruzan la franja en cada vuelta del video. */
export const PECES_POR_VUELTA = VIDEO_PECES.filas * VIDEO_PECES.porFila;

export const VIDEO_CAMARA = resolve(import.meta.dirname, ".generado/peces.mjpeg");
