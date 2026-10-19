import type { Pista, SentidoFlujo } from "./tipos";

/**
 * Franja de conteo: dos bordes sobre el eje del flujo (en píxeles, en la coordenada x o y del
 * cuadro, con inicio ≤ fin). Lo que pasa dentro de la franja no cuenta; solo cuenta pasar de un
 * lado al otro. Con inicio = fin es una línea.
 */
export interface Franja {
  inicio: number;
  fin: number;
}

export type Lado = "antes" | "dentro" | "despues";

/** Cuadros que debe verse avanzando con el flujo antes de poder contar. */
export const CUADROS_PERSISTENCIA = 3;

/** Posición sobre el eje del flujo, creciendo en el sentido del agua. */
export function enFlujo(p: { x: number; y: number }, sentido: SentidoFlujo): number {
  switch (sentido) {
    case "abajo":
      return p.y;
    case "arriba":
      return -p.y;
    case "derecha":
      return p.x;
    case "izquierda":
      return -p.x;
  }
}

/** De qué lado de la franja está, mirando en el sentido del agua. */
export function ladoDe(p: { x: number; y: number }, franja: Franja, sentido: SentidoFlujo): Lado {
  const s = enFlujo(p, sentido);
  const [a, b] = sentido === "abajo" || sentido === "derecha" ? [franja.inicio, franja.fin] : [-franja.fin, -franja.inicio];
  if (s < a) return "antes";
  if (s > b) return "despues";
  return "dentro";
}

/** Fracción mínima de sus cuadros recientes en que debe verse como alevino para poder contar. */
export const FRACCION_ACEPTADA = 0.6;

/**
 * ¿Puede contar? Se vio como alevino en al menos 3 cuadros seguidos, avanzando con el agua, y en
 * la mayoría de sus cuadros recientes (algo que unas veces parece alevino y otras basura, no).
 */
export function avanzaConElFlujo(pista: Pista): boolean {
  const r = pista.recorrido;
  const aceptadas = pista.aceptadas.filter(Boolean).length;
  return (
    pista.seguidos >= CUADROS_PERSISTENCIA &&
    aceptadas >= FRACCION_ACEPTADA * pista.aceptadas.length &&
    r.length >= CUADROS_PERSISTENCIA &&
    r[r.length - 1]! - r[r.length - CUADROS_PERSISTENCIA]! > 0
  );
}

/**
 * Actualiza el conteo de una pista con su posición nueva y devuelve cuánto cambia el total.
 *
 * Conteo neto: pasar de antes a después de la franja suma 1 (si la pista avanza con el flujo);
 * pasar de después a antes resta 1. Cada pista aporta máx(0, saldo) × su peso: así una que baja,
 * sube y vuelve a bajar queda en 1, y una que solo sube (venía de la bolsa) no resta nada.
 */
export function actualizarConteo(pista: Pista, franja: Franja, sentido: SentidoFlujo): number {
  const lado = ladoDe(pista, franja, sentido);
  if (lado === "dentro") return 0;
  if (pista.ladoExterior === null) {
    pista.ladoExterior = lado;
    return 0;
  }
  if (pista.ladoExterior === "antes" && lado === "despues") {
    // Si todavía no cumple la persistencia, el cruce queda pendiente (sigue «antes»).
    if (!avanzaConElFlujo(pista)) return 0;
    pista.saldo++;
  } else if (pista.ladoExterior === "despues" && lado === "antes") {
    pista.saldo--;
  }
  pista.ladoExterior = lado;

  if (pista.saldo > 0 && pista.pesoContado === 0) pista.pesoContado = pista.peso;
  const aporte = Math.max(0, pista.saldo) * pista.pesoContado;
  const cambio = aporte - pista.aporte;
  pista.aporte = aporte;
  pista.contada = aporte > 0;
  return cambio;
}
