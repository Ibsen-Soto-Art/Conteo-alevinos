import { useCallback, useEffect, useMemo, useRef } from "react";
import type { MensajeAlMotor, MensajeDelMotor } from "./protocolo";

/**
 * Arranca el motor en un Web Worker. Solo deja un cuadro en camino a la vez:
 * si el teléfono es lento se saltan cuadros en vez de acumular atraso.
 */
export function useMotor(alResponder: (r: MensajeDelMotor) => void) {
  const worker = useRef<Worker | null>(null);
  const ocupado = useRef(false);
  const callback = useRef(alResponder);
  callback.current = alResponder;

  useEffect(() => {
    const w = new Worker(new URL("./motor.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e: MessageEvent<MensajeDelMotor>) => {
      ocupado.current = false;
      callback.current(e.data);
    };
    worker.current = w;
    return () => {
      w.terminate();
      worker.current = null;
      ocupado.current = false;
    };
  }, []);

  const enviar = useCallback((msg: MensajeAlMotor, transferir: Transferable[] = []) => {
    worker.current?.postMessage(msg, transferir);
  }, []);

  /** Envía un cuadro si el motor está libre. Devuelve false si lo saltó. */
  const enviarCuadro = useCallback((ancho: number, alto: number, rgba: ArrayBuffer, tiempo?: number) => {
    if (!worker.current || ocupado.current) return false;
    ocupado.current = true;
    worker.current.postMessage({ tipo: "cuadro", ancho, alto, rgba, ...(tiempo === undefined ? {} : { tiempo }) } satisfies MensajeAlMotor, [rgba]);
    return true;
  }, []);

  const libre = useCallback(() => !ocupado.current, []);

  return useMemo(() => ({ enviar, enviarCuadro, libre }), [enviar, enviarCuadro, libre]);
}
