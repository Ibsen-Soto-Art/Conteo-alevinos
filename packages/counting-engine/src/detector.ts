import type { CuadroGris, Deteccion, Zona } from "./tipos";

export interface OpcionesDetector {
  /** Píxeles más oscuros que este valor se consideran alevino (fondo con luz LED). */
  umbral: number;
  /** Manchas más pequeñas se ignoran (ruido, burbujas). En píxeles. */
  areaMinima: number;
  /** Área típica de un alevino solo. Si es null, cada mancha cuenta 1. */
  areaTipica: number | null;
  zona?: Zona;
}

/**
 * Busca manchas oscuras sobre el fondo iluminado. Con luz por debajo del canal cada
 * alevino aparece como una sombra, así que basta un umbral y unir píxeles vecinos.
 */
export function detectarManchas(cuadro: CuadroGris, op: OpcionesDetector): Deteccion[] {
  const { ancho, alto, datos } = cuadro;
  const z = op.zona ?? { x: 0, y: 0, ancho, alto };
  const x0 = Math.max(0, Math.floor(z.x));
  const y0 = Math.max(0, Math.floor(z.y));
  const x1 = Math.min(ancho, Math.floor(z.x + z.ancho));
  const y1 = Math.min(alto, Math.floor(z.y + z.alto));

  const visitado = new Uint8Array(ancho * alto);
  const pila: number[] = [];
  const detecciones: Deteccion[] = [];

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * ancho + x;
      if (visitado[i] || (datos[i] ?? 255) >= op.umbral) continue;

      let area = 0;
      let sx = 0;
      let sy = 0;
      visitado[i] = 1;
      pila.push(i);
      while (pila.length > 0) {
        const j = pila.pop()!;
        const px = j % ancho;
        const py = (j - px) / ancho;
        area++;
        sx += px;
        sy += py;
        // vecinos en cruz, dentro de la zona
        if (px > x0) agregar(j - 1);
        if (px < x1 - 1) agregar(j + 1);
        if (py > y0) agregar(j - ancho);
        if (py < y1 - 1) agregar(j + ancho);
      }

      if (area >= op.areaMinima) {
        detecciones.push({ x: sx / area, y: sy / area, area, peso: pesoDeMancha(area, op.areaTipica) });
      }
    }
  }
  return detecciones;

  function agregar(j: number) {
    if (!visitado[j] && (datos[j] ?? 255) < op.umbral) {
      visitado[j] = 1;
      pila.push(j);
    }
  }
}

/** Una mancha mucho más grande que un alevino típico son varios pegados. */
export function pesoDeMancha(area: number, areaTipica: number | null): number {
  if (!areaTipica || area < areaTipica * 1.6) return 1;
  return Math.max(1, Math.round(area / areaTipica));
}

/** Mediana de las áreas: sirve para estimar el área típica de un alevino del lote. */
export function areaMediana(detecciones: Deteccion[]): number | null {
  if (detecciones.length === 0) return null;
  const areas = detecciones.map((d) => d.area).sort((a, b) => a - b);
  return areas[Math.floor(areas.length / 2)] ?? null;
}
