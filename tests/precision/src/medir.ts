import { MotorConteo, aGris, configuracionMotor, tamanoProceso, type Controles } from "@contador/counting-engine";
import { cuadrosRgba, medidasVideo } from "./video";

export interface Medida {
  /** Lo que contó el motor, sin factor de calibración. */
  crudo: number;
  cuadros: number;
  tamano: { ancho: number; alto: number };
}

/**
 * Pasa el video por el motor igual que la app: cada cuadro reducido a 320 px de lado mayor,
 * convertido a gris con los mismos pesos, con los mismos ajustes y sin saltarse cuadros.
 */
export async function contarVideo(ruta: string, ajustes: Controles): Promise<Medida> {
  const video = await medidasVideo(ruta);
  const tamano = tamanoProceso(video.ancho, video.alto);
  const motor = new MotorConteo(configuracionMotor(ajustes, tamano.ancho, tamano.alto));
  const gris = new Uint8Array(tamano.ancho * tamano.alto);
  let crudo = 0;
  let cuadros = 0;
  for await (const rgba of cuadrosRgba(ruta, tamano.ancho, tamano.alto)) {
    crudo = motor.procesar(aGris(rgba, tamano.ancho, tamano.alto, gris)).total;
    cuadros++;
  }
  return { crudo, cuadros, tamano };
}
