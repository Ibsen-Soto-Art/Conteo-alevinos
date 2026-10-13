import type { Pista, SentidoFlujo } from "./tipos";

/**
 * Suma una pista cuando cruza la línea de conteo en el sentido del flujo.
 * Una pista se cuenta una sola vez aunque vuelva a cruzar.
 */
export function cruzoLinea(
  antes: { x: number; y: number },
  ahora: { x: number; y: number },
  posicionLinea: number,
  sentido: SentidoFlujo,
): boolean {
  switch (sentido) {
    case "abajo":
      return antes.y < posicionLinea && ahora.y >= posicionLinea;
    case "arriba":
      return antes.y > posicionLinea && ahora.y <= posicionLinea;
    case "derecha":
      return antes.x < posicionLinea && ahora.x >= posicionLinea;
    case "izquierda":
      return antes.x > posicionLinea && ahora.x <= posicionLinea;
  }
}

export function marcarSiCruza(
  pista: Pista,
  antes: { x: number; y: number } | null,
  posicionLinea: number,
  sentido: SentidoFlujo,
): number {
  if (!antes || pista.contada) return 0;
  if (!cruzoLinea(antes, pista, posicionLinea, sentido)) return 0;
  pista.contada = true;
  return pista.peso;
}
