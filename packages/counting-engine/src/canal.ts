import { encontrarManchas } from "./manchas";
import type { CuadroGris, Zona } from "./tipos";

/** Lado de las marcas de cinta negra en las esquinas del canal (docs/hardware/canal.md). */
export const LADO_MARCA_CM = 2;

export interface Marca {
  /** Centro y lado, en píxeles del cuadro analizado. */
  x: number;
  y: number;
  lado: number;
}

export interface AnalisisCanal {
  /** Dónde está el canal en el cuadro analizado: se procesa solo esa zona. */
  zona: Zona;
  /** Las marcas encontradas (4 si están todas). */
  marcas: Marca[];
  /** Píxeles por centímetro en el cuadro analizado; null si no están las 4 marcas. */
  pxPorCm: number | null;
  /** De dónde salió la zona: las 4 marcas, la parte iluminada o el cuadro entero. */
  fuente: "marcas" | "luz" | "todo";
}

/**
 * Máximo píxel a píxel de varios cuadros: los alevinos y las manos que pasan (oscuros y en
 * movimiento) desaparecen; el canal iluminado y las marcas fijas quedan.
 */
export function combinarMaximo(cuadros: CuadroGris[]): CuadroGris {
  const [primero] = cuadros;
  if (!primero) throw new Error("Hace falta al menos un cuadro.");
  const datos = Uint8Array.from(primero.datos);
  for (const c of cuadros.slice(1)) for (let i = 0; i < datos.length; i++) if (c.datos[i]! > datos[i]!) datos[i] = c.datos[i]!;
  return { ancho: primero.ancho, alto: primero.alto, datos };
}

/** Copia la zona de un cuadro. */
export function recortar(cuadro: CuadroGris, zona: Zona): CuadroGris {
  const x0 = Math.max(0, Math.round(zona.x));
  const y0 = Math.max(0, Math.round(zona.y));
  const ancho = Math.min(cuadro.ancho - x0, Math.round(zona.ancho));
  const alto = Math.min(cuadro.alto - y0, Math.round(zona.alto));
  const datos = new Uint8Array(ancho * alto);
  for (let y = 0; y < alto; y++) datos.set(cuadro.datos.subarray((y0 + y) * cuadro.ancho + x0, (y0 + y) * cuadro.ancho + x0 + ancho), y * ancho);
  return { ancho, alto, datos };
}

/** Umbral de Otsu: el gris que mejor separa lo claro (canal iluminado) de lo oscuro. */
export function umbralOtsu(datos: Uint8Array | Uint8ClampedArray): number {
  const histograma = new Float64Array(256);
  for (const v of datos) histograma[v]!++;
  const n = datos.length;
  let suma = 0;
  for (let i = 0; i < 256; i++) suma += i * histograma[i]!;
  let sumaFondo = 0;
  let pesoFondo = 0;
  let mejor = 0;
  let umbral = 128;
  for (let t = 0; t < 256; t++) {
    pesoFondo += histograma[t]!;
    if (pesoFondo === 0) continue;
    const pesoFrente = n - pesoFondo;
    if (pesoFrente === 0) break;
    sumaFondo += t * histograma[t]!;
    const m0 = sumaFondo / pesoFondo;
    const m1 = (suma - sumaFondo) / pesoFrente;
    const entre = pesoFondo * pesoFrente * (m0 - m1) ** 2;
    if (entre > mejor) {
      mejor = entre;
      umbral = t + 1;
    }
  }
  return umbral;
}

/**
 * Busca el canal en un cuadro completo (mejor si es la combinación de varios con
 * `combinarMaximo`): la zona iluminada más grande y, dentro, las 4 marcas cuadradas de cinta en
 * sus esquinas. Con las 4 marcas sabe cuántos píxeles mide un centímetro.
 */
export function analizarCanal(cuadro: CuadroGris): AnalisisCanal {
  const { ancho, alto, datos } = cuadro;
  const n = ancho * alto;
  const todo: AnalisisCanal = { zona: { x: 0, y: 0, ancho, alto }, marcas: [], pxPorCm: null, fuente: "todo" };

  const t = umbralOtsu(datos);
  const claro = new Uint8Array(n);
  let claros = 0;
  for (let i = 0; i < n; i++) if ((claro[i] = datos[i]! >= t ? 1 : 0)) claros++;
  // Todo parejo (sin mesa oscura alrededor): el canal ocupa el cuadro.
  if (claros > n * 0.97 || claros < n * 0.15) return todo;

  const iluminadas = encontrarManchas(claro, ancho, alto, Math.round(n * 0.15));
  const canal = iluminadas.sort((a, b) => b.area - a.area)[0];
  if (!canal) return todo;
  const [x0, y0, x1, y1] = canal.caja;
  const zonaLuz: Zona = { x: x0, y: y0, ancho: x1 - x0, alto: y1 - y0 };

  // Marcas: manchas oscuras, cuadradas y llenas, cerca de cada esquina de la zona iluminada.
  const oscuro = Uint8Array.from(claro, (v) => 1 - v);
  const areaZona = zonaLuz.ancho * zonaLuz.alto;
  const candidatas = encontrarManchas(oscuro, ancho, alto, 16, zonaLuz).filter(
    (m) => m.relacion < 1.4 && m.solidez > 0.85 && m.hueco < 0.1 && m.area <= areaZona * 0.02,
  );
  const alcance = 0.3 * Math.min(zonaLuz.ancho, zonaLuz.alto);
  const esquinas: [number, number][] = [
    [x0, y0],
    [x1, y0],
    [x0, y1],
    [x1, y1],
  ];
  const usadas = new Set<number>();
  const marcas: (Marca & { caja: [number, number, number, number] })[] = [];
  for (const [ex, ey] of esquinas) {
    let mejor = -1;
    let mejorD = alcance;
    candidatas.forEach((m, i) => {
      const d = Math.hypot(m.x - ex, m.y - ey);
      if (!usadas.has(i) && d <= mejorD) {
        mejor = i;
        mejorD = d;
      }
    });
    if (mejor < 0) continue;
    usadas.add(mejor);
    const m = candidatas[mejor]!;
    marcas.push({ x: m.x, y: m.y, lado: Math.sqrt(m.area), caja: m.caja });
  }

  const lados = marcas.map((m) => m.lado);
  const parejas = lados.length === 4 && Math.max(...lados) / Math.min(...lados) <= 1.35;
  const sinCaja = marcas.map(({ x, y, lado }) => ({ x, y, lado }));
  if (!parejas) return { zona: zonaLuz, marcas: sinCaja, pxPorCm: null, fuente: "luz" };

  const mx0 = Math.min(...marcas.map((m) => m.caja[0]));
  const my0 = Math.min(...marcas.map((m) => m.caja[1]));
  const mx1 = Math.max(...marcas.map((m) => m.caja[2]));
  const my1 = Math.max(...marcas.map((m) => m.caja[3]));
  return {
    zona: { x: mx0, y: my0, ancho: mx1 - mx0, alto: my1 - my0 },
    marcas: sinCaja,
    pxPorCm: lados.reduce((s, l) => s + l, 0) / lados.length / LADO_MARCA_CM,
    fuente: "marcas",
  };
}
