import { crearManejador } from "./manejador";
import type { MensajeAlMotor } from "./protocolo";

const ambito = self as unknown as DedicatedWorkerGlobalScope;
const manejar = crearManejador();

ambito.onmessage = (e: MessageEvent<MensajeAlMotor>) => {
  try {
    const respuesta = manejar(e.data);
    if (respuesta) ambito.postMessage(respuesta);
  } catch (error) {
    ambito.postMessage({ tipo: "error", mensaje: String(error) });
  }
};
