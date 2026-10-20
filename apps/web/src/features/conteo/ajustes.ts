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

/**
 * Ajustes con que cuenta la app del campesino. De /laboratorio solo los de detección (umbral, área
 * mínima, distancia). El agua corre siempre hacia abajo en la pantalla y la franja va fija cerca
 * de la salida (abajo): si el celular está al revés, la app avisa en vez de mover la franja.
 */
export function ajustesDelCampesino(almacen: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): Controles {
  const { sentido, lineaPorcentaje, franjaAncho } = CONTROLES_INICIALES;
  return { ...leerAjustes(almacen), sentido, lineaPorcentaje, franjaAncho };
}
