import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Registra el service worker (la app queda guardada en el teléfono y abre sin internet).
 * Si hay una versión nueva, se aplica solo cuando es seguro: en el Inicio y sin un
 * conteo abierto. Así la app nunca se recarga a mitad de una bolsa.
 */
export function useActualizacion(esSeguro: boolean) {
  const {
    needRefresh: [hayNueva],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (hayNueva && esSeguro) void updateServiceWorker(true);
  }, [hayNueva, esSeguro, updateServiceWorker]);
}
