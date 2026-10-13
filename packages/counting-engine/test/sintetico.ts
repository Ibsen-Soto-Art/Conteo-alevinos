import type { CuadroGris } from "../src";

export interface Objeto {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/** Cuadro blanco (fondo con luz LED) con rectángulos oscuros como alevinos. */
export function cuadroCon(objetos: Objeto[], ancho = 80, alto = 120): CuadroGris {
  const datos = new Uint8Array(ancho * alto).fill(230);
  for (const o of objetos) {
    for (let y = Math.max(0, o.y); y < Math.min(alto, o.y + o.alto); y++) {
      for (let x = Math.max(0, o.x); x < Math.min(ancho, o.x + o.ancho); x++) {
        datos[y * ancho + x] = 30;
      }
    }
  }
  return { ancho, alto, datos };
}
