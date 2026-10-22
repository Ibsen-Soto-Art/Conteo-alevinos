/**
 * Prende la linterna (el flash) del celular si el navegador lo deja. Chrome en Android lo deja con
 * la restricción «torch»; otros navegadores (Safari en iPhone, en las pruebas hechas) no la ofrecen:
 * entonces no hace nada. Devuelve si quedó prendida. Se apaga sola al cerrar la cámara.
 */
export async function prenderLinterna(pista: MediaStreamTrack | undefined): Promise<boolean> {
  try {
    const capacidades = pista?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
    if (!pista || !capacidades?.torch) return false;
    await pista.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] });
    return true;
  } catch {
    return false;
  }
}
