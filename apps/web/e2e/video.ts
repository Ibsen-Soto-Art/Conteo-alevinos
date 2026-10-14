import { resolve } from "node:path";

/** Video sintético que hace de cámara en las pruebas (se genera en e2e/preparar.ts). */
export const VIDEO_PECES = {
  ancho: 360,
  alto: 640,
  segundos: 9,
  peces: 10,
  /** Lado de cada mancha, en píxeles. */
  lado: 16,
  /** Píxeles por segundo. */
  velocidad: 160,
  /** Segundos entre un pez y el siguiente. */
  separacion: 0.6,
};

export const VIDEO_CAMARA = resolve(import.meta.dirname, ".generado/peces.mjpeg");
