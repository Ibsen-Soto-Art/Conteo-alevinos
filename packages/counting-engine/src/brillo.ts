import type { CuadroGris, Zona } from "./tipos";

/** Debajo de este brillo medio el fondo del canal no está bien iluminado y el umbral falla. */
export const BRILLO_MINIMO = 110;

/** Brillo medio (0 a 255) de la zona, mirando un píxel de cada 4 en cada eje para ir rápido. */
export function brilloMedio(cuadro: CuadroGris, zona?: Zona): number {
  const { ancho, alto, datos } = cuadro;
  const z = zona ?? { x: 0, y: 0, ancho, alto };
  const x0 = Math.max(0, Math.floor(z.x));
  const y0 = Math.max(0, Math.floor(z.y));
  const x1 = Math.min(ancho, Math.floor(z.x + z.ancho));
  const y1 = Math.min(alto, Math.floor(z.y + z.alto));
  let suma = 0;
  let n = 0;
  for (let y = y0; y < y1; y += 4) {
    for (let x = x0; x < x1; x += 4) {
      suma += datos[y * ancho + x] ?? 0;
      n++;
    }
  }
  return n === 0 ? 0 : suma / n;
}

export function hayPocaLuz(brillo: number, minimo = BRILLO_MINIMO): boolean {
  return brillo < minimo;
}
