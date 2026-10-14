import { useEffect } from "react";

/** Mantiene la pantalla encendida mientras `activo` (se vuelve a pedir al regresar a la app). */
export function useWakeLock(activo: boolean) {
  useEffect(() => {
    if (!activo || !("wakeLock" in navigator)) return;
    let bloqueo: WakeLockSentinel | null = null;
    let vivo = true;
    const pedir = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock
        .request("screen")
        .then((b) => {
          if (vivo) bloqueo = b;
          else void b.release();
        })
        .catch(() => {});
    };
    pedir();
    document.addEventListener("visibilitychange", pedir);
    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", pedir);
      void bloqueo?.release();
    };
  }, [activo]);
}
