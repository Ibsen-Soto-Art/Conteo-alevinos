import { CUADROS_PERSISTENCIA } from "./franja";
import type { Pista } from "./tipos";

/** Verde, ámbar o rojo en la pantalla Contando. */
export type EstadoFlujo = "bien" | "rapido" | "muy-rapido";

export interface Flujo {
  /** Velocidad de los alevinos con el agua, en px por cuadro procesado (suavizada). */
  velocidad: number;
  /** Lo máximo para que un alevino se vea 3 cuadros dentro de la franja: ancho ÷ 3. */
  limite: number;
  estado: EstadoFlujo;
  /** La misma velocidad en px por segundo, si se saben los cuadros por segundo. */
  pxPorSegundo: number | null;
}

/** Hasta el 60 % del límite es verde. */
const FRACCION_VERDE = 0.6;
/** Cuánto pesa cada medida nueva (evita que el aviso parpadee). */
const SUAVIZADO = 0.2;
/** Cuadros sin alevinos moviéndose para olvidar la medida. */
const CUADROS_SIN_MEDIDA = 45;

export function estadoFlujo(velocidad: number, limite: number): EstadoFlujo {
  if (velocidad > limite) return "muy-rapido";
  if (velocidad > limite * FRACCION_VERDE) return "rapido";
  return "bien";
}

/**
 * Mide qué tan rápido pasan los alevinos: en cada cuadro, el percentil 80 de la velocidad con el
 * agua de las pistas que se mueven (ya seguidas 3 cuadros), suavizado.
 */
export class MedidorFlujo {
  private velocidad: number | null = null;
  private sinMedida = 0;

  observar(pistas: readonly Pista[], anchoFranja: number, cuadrosPorSegundo: number | null): Flujo | null {
    const velocidades = pistas
      .filter((p) => p.edad >= CUADROS_PERSISTENCIA && p.perdida === 0 && p.recorrido.length >= 2)
      .map((p) => p.recorrido[p.recorrido.length - 1]! - p.recorrido[p.recorrido.length - 2]!)
      .filter((v) => v > 0.5)
      .sort((a, b) => a - b);
    if (velocidades.length > 0) {
      const p80 = velocidades[Math.min(velocidades.length - 1, Math.floor(velocidades.length * 0.8))]!;
      this.velocidad = this.velocidad === null ? p80 : this.velocidad + (p80 - this.velocidad) * SUAVIZADO;
      this.sinMedida = 0;
    } else if (++this.sinMedida > CUADROS_SIN_MEDIDA) {
      this.velocidad = null;
    }
    if (this.velocidad === null) return null;
    const limite = Math.max(1, anchoFranja) / 3;
    return {
      velocidad: this.velocidad,
      limite,
      estado: estadoFlujo(this.velocidad, limite),
      pxPorSegundo: cuadrosPorSegundo ? this.velocidad * cuadrosPorSegundo : null,
    };
  }

  reiniciar() {
    this.velocidad = null;
    this.sinMedida = 0;
  }
}
