import type { Deteccion, Pista } from "./tipos";

export interface OpcionesRastreador {
  /** Distancia máxima (px) que un alevino puede moverse entre dos cuadros. */
  distanciaMaxima: number;
  /** Cuadros que se espera a una pista perdida antes de borrarla. */
  cuadrosDeGracia: number;
}

/**
 * Sigue cada mancha entre cuadros emparejando por cercanía, para que un mismo
 * alevino no se cuente dos veces.
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
      detecciones.forEach((det, d) => {
        const d2 = (pista.x - det.x) ** 2 + (pista.y - det.y) ** 2;
        if (d2 <= max2) pares.push({ d2, p, d });
      });
    });
    pares.sort((a, b) => a.d2 - b.d2);

    const pistaUsada = new Set<number>();
    const detUsada = new Set<number>();
    const resultado: { pista: Pista; antes: { x: number; y: number } | null }[] = [];

    for (const { p, d } of pares) {
      if (pistaUsada.has(p) || detUsada.has(d)) continue;
      pistaUsada.add(p);
      detUsada.add(d);
      const pista = this.pistas[p]!;
      const det = detecciones[d]!;
      const antes = { x: pista.x, y: pista.y };
      pista.x = det.x;
      pista.y = det.y;
      pista.peso = Math.max(pista.peso, det.peso);
      pista.perdida = 0;
      resultado.push({ pista, antes });
    }

    this.pistas.forEach((pista, p) => {
      if (!pistaUsada.has(p)) pista.perdida++;
    });
    this.pistas = this.pistas.filter((p) => p.perdida <= this.op.cuadrosDeGracia);

    detecciones.forEach((det, d) => {
      if (detUsada.has(d)) return;
      const pista: Pista = { id: this.siguienteId++, x: det.x, y: det.y, peso: det.peso, perdida: 0, contada: false };
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
