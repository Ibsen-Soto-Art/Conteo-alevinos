import { flujoVertical, type Controles, type Deteccion, type SentidoFlujo } from "@contador/counting-engine";

// Los ajustes y su paso a configuración viven en el motor: la app y el script de
// precisión (tests/precision) cuentan con exactamente lo mismo.
export {
  CONTROLES_INICIALES,
  LADO_PROCESO,
  configuracionMotor,
  flujoVertical,
  franjaPorcentaje,
  posicionLineaPx,
  tamanoProceso,
  type Controles,
} from "@contador/counting-engine";

/**
 * Dónde queda la línea de conteo dentro de una vista que muestra el video con
 * `object-fit: cover` (recortado y centrado). Devuelve píxeles de la vista sobre el eje del flujo.
 */
export function lineaEnVista(
  porcentaje: number,
  sentido: SentidoFlujo,
  video: { ancho: number; alto: number },
  vista: { ancho: number; alto: number },
): number {
  const escala = Math.max(vista.ancho / video.ancho, vista.alto / video.alto);
  const vertical = flujoVertical(sentido);
  const largoVideo = (vertical ? video.alto : video.ancho) * escala;
  const largoVista = vertical ? vista.alto : vista.ancho;
  return (Math.min(100, Math.max(0, porcentaje)) / 100) * largoVideo - (largoVideo - largoVista) / 2;
}

/**
 * Pasa un punto del cuadro procesado (320 px) a la vista que muestra el video con
 * `object-fit: cover`. Devuelve también la escala, para el tamaño de las marcas.
 */
export function puntoEnVista(
  x: number,
  y: number,
  proceso: { ancho: number; alto: number },
  vista: { ancho: number; alto: number },
): { x: number; y: number; escala: number } {
  const escala = Math.max(vista.ancho / proceso.ancho, vista.alto / proceso.alto);
  return {
    x: x * escala - (proceso.ancho * escala - vista.ancho) / 2,
    y: y * escala - (proceso.alto * escala - vista.alto) / 2,
    escala,
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
      /** Brillo medio del cuadro (0 a 255), para avisar «Poca luz». */
      brillo: number;
      /** Milisegundos que tardó el motor en este cuadro. */
      ms: number;
    }
  | { tipo: "error"; mensaje: string };
