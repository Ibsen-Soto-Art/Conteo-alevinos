import type { Franja } from "./franja";
import type { ConfiguracionMotor } from "./motor";
import type { SentidoFlujo } from "./tipos";

/**
 * Ajustes del motor tal como se eligen en el laboratorio. Las medidas en píxeles son a la
 * resolución de proceso. Los usan la app y el script de precisión, para medir lo mismo.
 */
export interface Controles {
  /** 0 a 255: más oscuro que esto es alevino. */
  umbral: number;
  areaMinima: number;
  /** Centro de la franja de conteo, de 0 a 100 % sobre el eje del flujo (desde arriba o la izquierda). */
  lineaPorcentaje: number;
  /** Ancho de la franja de conteo, en % del largo del canal en la imagen. */
  franjaAncho: number;
  sentido: SentidoFlujo;
  distanciaMaxima: number;
}

export const CONTROLES_INICIALES: Controles = {
  umbral: 100,
  areaMinima: 6,
  // Cerca de la salida (con el agua hacia abajo), donde es difícil que se devuelvan.
  lineaPorcentaje: 75,
  franjaAncho: 10,
  sentido: "abajo",
  distanciaMaxima: 20,
};

/** Lado mayor del cuadro que se procesa. Más chico es más rápido en teléfonos baratos. */
export const LADO_PROCESO = 320;

const CUADROS_DE_GRACIA = 3;

/** Reduce el video para procesarlo, conservando la proporción y sin agrandarlo nunca. */
export function tamanoProceso(anchoVideo: number, altoVideo: number, ladoMayor = LADO_PROCESO) {
  const escala = Math.min(1, ladoMayor / Math.max(anchoVideo, altoVideo));
  return {
    ancho: Math.max(1, Math.round(anchoVideo * escala)),
    alto: Math.max(1, Math.round(altoVideo * escala)),
  };
}

export function flujoVertical(sentido: SentidoFlujo): boolean {
  return sentido === "abajo" || sentido === "arriba";
}

/** Convierte el porcentaje de la línea a píxeles sobre el eje del flujo. */
export function posicionLineaPx(porcentaje: number, sentido: SentidoFlujo, ancho: number, alto: number): number {
  const largo = flujoVertical(sentido) ? alto : ancho;
  return (Math.min(100, Math.max(0, porcentaje)) / 100) * largo;
}

/** Bordes de la franja en %, sin salirse del cuadro. */
export function franjaPorcentaje(c: Pick<Controles, "lineaPorcentaje" | "franjaAncho">): [number, number] {
  const medio = Math.max(0, c.franjaAncho) / 2;
  return [Math.max(0, c.lineaPorcentaje - medio), Math.min(100, c.lineaPorcentaje + medio)];
}

/** La franja de conteo en píxeles del cuadro. */
export function franjaPx(c: Controles, ancho: number, alto: number): Franja {
  const [a, b] = franjaPorcentaje(c);
  return { inicio: posicionLineaPx(a, c.sentido, ancho, alto), fin: posicionLineaPx(b, c.sentido, ancho, alto) };
}

export function configuracionMotor(c: Controles, ancho: number, alto: number): ConfiguracionMotor {
  return {
    franja: franjaPx(c, ancho, alto),
    detector: { umbral: c.umbral, areaMinima: c.areaMinima, areaTipica: null },
    rastreador: { distanciaMaxima: c.distanciaMaxima, cuadrosDeGracia: CUADROS_DE_GRACIA },
    posicionLinea: posicionLineaPx(c.lineaPorcentaje, c.sentido, ancho, alto),
    sentido: c.sentido,
    aprenderAreaTipica: true,
  };
}
