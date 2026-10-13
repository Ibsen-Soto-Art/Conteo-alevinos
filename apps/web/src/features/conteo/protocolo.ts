import type { ConfiguracionMotor, Deteccion, SentidoFlujo } from "@contador/counting-engine";

/** Lo que el usuario ajusta en la página. Las medidas en píxeles son a la resolución de proceso. */
export interface Controles {
  /** 0 a 255: más oscuro que esto es alevino. */
  umbral: number;
  areaMinima: number;
  /** Posición de la línea de conteo, de 0 a 100 % sobre el eje del flujo. */
  lineaPorcentaje: number;
  sentido: SentidoFlujo;
  distanciaMaxima: number;
}

export const CONTROLES_INICIALES: Controles = {
  umbral: 100,
  areaMinima: 6,
  lineaPorcentaje: 50,
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

export function configuracionMotor(c: Controles, ancho: number, alto: number): ConfiguracionMotor {
  return {
    detector: { umbral: c.umbral, areaMinima: c.areaMinima, areaTipica: null },
    rastreador: { distanciaMaxima: c.distanciaMaxima, cuadrosDeGracia: CUADROS_DE_GRACIA },
    posicionLinea: posicionLineaPx(c.lineaPorcentaje, c.sentido, ancho, alto),
    sentido: c.sentido,
    aprenderAreaTipica: true,
  };
}

/** Lo mínimo de cada pista que la página necesita para dibujarla. */
export interface PistaVista {
  id: number;
  x: number;
  y: number;
  peso: number;
  contada: boolean;
}

export type MensajeAlMotor =
  | { tipo: "configurar"; controles: Controles; ancho: number; alto: number }
  | { tipo: "cuadro"; ancho: number; alto: number; rgba: ArrayBuffer }
  /** Contador a cero para una bolsa nueva; conserva lo aprendido del lote. */
  | { tipo: "reiniciar" }
  /** Lote nuevo: vuelve a aprender el área típica de un alevino. */
  | { tipo: "olvidarArea" };

export type MensajeDelMotor =
  | {
      tipo: "resultado";
      /** Total crudo, sin factor de calibración. */
      total: number;
      sumados: number;
      detecciones: Deteccion[];
      pistas: PistaVista[];
      areaTipica: number | null;
      ancho: number;
      alto: number;
      /** Milisegundos que tardó el motor en este cuadro. */
      ms: number;
    }
  | { tipo: "error"; mensaje: string };
