import type { Deteccion, Pista } from "./tipos";

export interface OpcionesRastreador {
  /** Distancia máxima (px) entre la posición predicha de un alevino y su detección. */
  distanciaMaxima: number;
  /** Cuadros que se espera a una pista perdida antes de borrarla. */
  cuadrosDeGracia: number;
}

/**
 * Sigue cada mancha entre cuadros emparejando por cercanía, para que un mismo
 * alevino no se cuente dos veces. Cada pista predice su siguiente posición con la
 * velocidad del último cuadro, así un alevino rápido no se pierde.
 */
export class Rastreador {
  private pistas: Pista[] = [];
  private siguienteId = 1;

  constructor(private readonly op: OpcionesRastreador) {}

  /** Devuelve, por cada pista, su posición anterior y la nueva. */
  actualizar(detecciones: Deteccion[]): { pista: Pista; antes: { x: number; y: number } | null }[] {
    const pares: { d2: number; p: number; d: number }[] = [];
    const max2 = this.op.distanciaMaxima ** 2;
    this.pistas.forEach((pista, p) => {
      const { x, y } = predecir(pista);
      detecciones.forEach((det, d) => {
        const d2 = (x - det.x) ** 2 + (y - det.y) ** 2;
        if (d2 <= max2) pares.push({ d2, p, d });
      });
    });
    pares.sort((a, b) => a.d2 - b.d2);

    const detDePista = new Map<number, number>();
    const detUsada = new Set<number>();
    const resultado: { pista: Pista; antes: { x: number; y: number } | null }[] = [];

    for (const { p, d } of pares) {
      if (detDePista.has(p) || detUsada.has(d)) continue;
      detDePista.set(p, d);
      detUsada.add(d);
      const pista = this.pistas[p]!;
      const det = detecciones[d]!;
      const antes = { x: pista.x, y: pista.y };
      const cuadros = pista.perdida + 1;
      pista.vx = (det.x - pista.x) / cuadros;
      pista.vy = (det.y - pista.y) / cuadros;
      pista.x = det.x;
      pista.y = det.y;
      pista.peso = Math.max(pista.peso, det.peso);
      pista.perdida = 0;
      resultado.push({ pista, antes });
    }

    // Si junto a una pista pesada aparece una mancha nueva, la mancha se separó:
    // la pista vuelve a pesar lo que pesa su parte, y la otra parte será una pista nueva.
    for (const { p, d } of pares) {
      if (detUsada.has(d)) continue;
      const propia = detDePista.get(p);
      const pista = this.pistas[p]!;
      if (propia !== undefined && pista.peso > 1) pista.peso = detecciones[propia]!.peso;
    }

    this.pistas.forEach((pista, p) => {
      if (!detDePista.has(p)) pista.perdida++;
    });
    this.pistas = this.pistas.filter((p) => p.perdida <= this.op.cuadrosDeGracia);

    detecciones.forEach((det, d) => {
      if (detUsada.has(d)) return;
      const pista: Pista = {
        id: this.siguienteId++,
        x: det.x,
        y: det.y,
        peso: det.peso,
        vx: 0,
        vy: 0,
        perdida: 0,
        contada: false,
      };
      this.pistas.push(pista);
      resultado.push({ pista, antes: null });
    });

    return resultado;
  }

  get activas(): readonly Pista[] {
    return this.pistas;
  }

  reiniciar() {
    this.pistas = [];
  }
}

/** Dónde debería estar la pista en el cuadro actual, contando los cuadros que lleva perdida. */
export function predecir(pista: Pista): { x: number; y: number } {
  const cuadros = pista.perdida + 1;
  return { x: pista.x + pista.vx * cuadros, y: pista.y + pista.vy * cuadros };
}
