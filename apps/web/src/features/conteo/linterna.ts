/**
 * La linterna (el flash) del celular, si el navegador deja manejarla. Chrome en Android la deja
 * con la restricción «torch»; otros navegadores (Safari en iPhone, en las pruebas hechas) no la
 * ofrecen: entonces el botón no aparece. Se apaga sola al cerrar la cámara.
 */

type ConCapacidades = MediaTrackCapabilities & { torch?: boolean };

/** Si este celular deja prender y apagar la linterna desde la página. */
export function linternaDisponible(pista: MediaStreamTrack | undefined): boolean {
  try {
    return Boolean((pista?.getCapabilities?.() as ConCapacidades | undefined)?.torch);
  } catch {
    return false;
  }
}

/** Prende o apaga la linterna. Devuelve si quedó como se pidió. */
export async function ponerLinterna(pista: MediaStreamTrack | undefined, prendida: boolean): Promise<boolean> {
  if (!pista || !linternaDisponible(pista)) return false;
  try {
    await pista.applyConstraints({ advanced: [{ torch: prendida } as MediaTrackConstraintSet] });
    return true;
  } catch {
    return false;
  }
}

/** Compatibilidad: prenderla (devuelve si quedó prendida). */
export function prenderLinterna(pista: MediaStreamTrack | undefined): Promise<boolean> {
  return ponerLinterna(pista, true);
}

const CLAVE = "contador.linterna";

/** Lo que eligió la persona la última vez: prendida (por defecto) o apagada. */
export function linternaPreferida(almacen: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): boolean {
  try {
    return almacen?.getItem(CLAVE) !== "apagada";
  } catch {
    return true;
  }
}

export function guardarLinternaPreferida(prendida: boolean, almacen: Pick<Storage, "setItem"> | undefined = globalThis.localStorage) {
  try {
    almacen?.setItem(CLAVE, prendida ? "prendida" : "apagada");
  } catch {
    // Sin almacenamiento: vale solo mientras la página esté abierta.
  }
}
