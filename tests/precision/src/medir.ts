import {
  CUADROS_ANALISIS,
  LADO_ANALISIS,
  MotorConteo,
  aGris,
  analizarCanal,
  canalEnVideo,
  combinarMaximo,
  configuracionMotor,
  geometriaDe,
  tamanoProceso,
  type AnalisisCanal,
  type Controles,
  type CuadroGris,
  type PerfilForma,
} from "@contador/counting-engine";
import { cuadrosRgba, medidasVideo } from "./video";

export interface Medida {
  /** Lo que contó el motor, sin factor de calibración. */
  crudo: number;
  cuadros: number;
  /** Tamaño del recorte del canal que recibió el motor. */
  tamano: { ancho: number; alto: number };
  /** Cómo encontró el canal: con las 4 marcas, por la luz o el cuadro entero. */
  canal: AnalisisCanal["fuente"];
  /** Píxeles por centímetro en el recorte; null sin las 4 marcas. */
  pxPorCm: number | null;
}

/**
 * Pasa el video por el motor igual que la app (`apps/web/src/features/conteo/captura.ts`):
 * 1. combina los primeros cuadros a 640 px y busca el canal y sus 4 marcas;
 * 2. recorta el canal a 480 px de lado mayor y lo pasa cuadro por cuadro, sin saltarse ninguno,
 *    con el perfil de la especie, la escala de las marcas y el fondo aprendido mientras cuenta;
 *    con `sentidoAutomatico`, averiguando hacia dónde corre el agua (como la app).
 * No hay Prueba de 100: el tamaño sale de las marcas o lo aprende el motor.
 */
export async function contarVideo(
  ruta: string,
  ajustes: Controles,
  perfil: PerfilForma | null = null,
  { sentidoAutomatico = false }: { sentidoAutomatico?: boolean } = {},
): Promise<Medida> {
  const video = await medidasVideo(ruta);
  const analizado = tamanoProceso(video.ancho, video.alto, LADO_ANALISIS);
  const primeros: CuadroGris[] = [];
  for await (const rgba of cuadrosRgba(ruta, analizado.ancho, analizado.alto, { maximo: CUADROS_ANALISIS })) {
    primeros.push(aGris(rgba, analizado.ancho, analizado.alto));
  }
  const g = geometriaDe(canalEnVideo(analizarCanal(combinarMaximo(primeros)), analizado, video));
  const { ancho, alto } = g.recorte;

  const motor = new MotorConteo({ ...configuracionMotor(ajustes, ancho, alto), perfil, pxPorCm: g.pxPorCmRecorte, lote: null, fondo: {}, sentidoAutomatico });
  const gris = new Uint8Array(ancho * alto);
  const msPorCuadro = 1000 / video.cuadrosPorSegundo;
  let crudo = 0;
  let cuadros = 0;
  for await (const rgba of cuadrosRgba(ruta, ancho, alto, { recorte: g.canal.zona })) {
    crudo = motor.procesar(aGris(rgba, ancho, alto, gris), cuadros * msPorCuadro).total;
    cuadros++;
  }
  return { crudo, cuadros, tamano: g.recorte, canal: g.canal.fuente, pxPorCm: g.pxPorCmRecorte };
}
