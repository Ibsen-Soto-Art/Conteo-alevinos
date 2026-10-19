import type { SentidoFlujo } from "@contador/counting-engine";
import { CONTROLES_INICIALES, type Controles } from "./protocolo";

const CLAVE = "contador.ajustesMotor";

/**
 * Ajustes del motor que se afinan en /laboratorio y usa la app en el mismo teléfono.
 * Si no hay nada guardado (o el navegador no deja leer), se usan los de fábrica.
 */
export function leerAjustes(almacen: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): Controles {
  try {
    const guardado = almacen?.getItem(CLAVE);
    if (!guardado) return CONTROLES_INICIALES;
    const datos = JSON.parse(guardado) as Partial<Controles>;
    return { ...CONTROLES_INICIALES, ...datos };
  } catch {
    return CONTROLES_INICIALES;
  }
}

export function guardarAjustes(c: Controles, almacen: Pick<Storage, "setItem"> | undefined = globalThis.localStorage) {
  try {
    almacen?.setItem(CLAVE, JSON.stringify(c));
  } catch {
    // Sin almacenamiento (modo privado): los ajustes valen solo mientras la página esté abierta.
  }
}

const CLAVE_SENTIDO = "contador.sentidoAgua";
const SENTIDOS: SentidoFlujo[] = ["abajo", "arriba", "derecha", "izquierda"];

/** El sentido del agua que se decidió en el último conteo de este teléfono, o null. */
export function leerSentidoGuardado(almacen: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): SentidoFlujo | null {
  try {
    const s = almacen?.getItem(CLAVE_SENTIDO);
    return SENTIDOS.find((x) => x === s) ?? null;
  } catch {
    return null;
  }
}

export function guardarSentido(s: SentidoFlujo, almacen: Pick<Storage, "setItem"> | undefined = globalThis.localStorage) {
  try {
    almacen?.setItem(CLAVE_SENTIDO, s);
  } catch {
    // Sin almacenamiento: el próximo conteo lo vuelve a averiguar desde «abajo».
  }
}

/**
 * Ajustes con que cuenta la app del campesino. De /laboratorio solo los de detección; el sentido
 * del agua parte del que se decidió en el último conteo (si hay) y la franja va cerca de la
 * salida de ese sentido. El motor lo confirma o lo corrige con los alevinos que pasan.
 */
export function ajustesDelCampesino(almacen: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): {
  ajustes: Controles;
  sentidoConocido: boolean;
} {
  const guardado = leerSentidoGuardado(almacen);
  const sentido = guardado ?? CONTROLES_INICIALES.sentido;
  const { lineaPorcentaje, franjaAncho } = CONTROLES_INICIALES;
  // La línea se mide desde arriba (o la izquierda): si el agua sube, la salida está arriba.
  const haciaElInicio = sentido === "arriba" || sentido === "izquierda";
  return {
    ajustes: { ...leerAjustes(almacen), sentido, lineaPorcentaje: haciaElInicio ? 100 - lineaPorcentaje : lineaPorcentaje, franjaAncho },
    sentidoConocido: guardado !== null,
  };
}
