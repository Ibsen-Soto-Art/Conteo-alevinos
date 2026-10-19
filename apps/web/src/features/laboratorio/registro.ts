import type { EventoConteo } from "@contador/counting-engine";

/** Una fila del registro de conteo de /laboratorio: un evento y cuándo pasó. */
export interface FilaRegistro extends EventoConteo {
  /** Hora del reloj (cámara) o segundo del video (video cargado), ya escrita. */
  hora: string;
  /** Total que mostraba el laboratorio después del cuadro. */
  totalMostrado: number;
  /** Píxeles por centímetro del recorte, si se encontraron las marcas. */
  pxPorCm: number | null;
}

export const COLUMNAS_REGISTRO = [
  "hora",
  "cuadro",
  "id",
  "cambio",
  "total_mostrado",
  "peso",
  "pesos_ultimos_cuadros",
  "largo_px",
  "ancho_px",
  "area_px",
  "largo_cm",
  "ancho_cm",
  "cuadros_seguidos",
  "sentido",
  "sentido_decidido",
  "pedazos_unidos",
  "nacio_en_franja",
  "recuperada",
  "separada_de",
  "llevada_por",
] as const;

const redondo = (n: number | null, d = 1) => (n === null ? "" : n.toFixed(d));

/** Los valores de una fila, en el orden de COLUMNAS_REGISTRO. */
export function valoresFila(f: FilaRegistro): string[] {
  const cm = (px: number | null) => (px === null || !f.pxPorCm ? "" : (px / f.pxPorCm).toFixed(2));
  return [
    f.hora,
    String(f.cuadro),
    String(f.id),
    (f.cambio > 0 ? "+" : "") + f.cambio,
    String(f.totalMostrado),
    String(f.peso),
    f.pesos.join(" "),
    redondo(f.largo),
    redondo(f.ancho),
    redondo(f.area, 0),
    cm(f.largo),
    cm(f.ancho),
    String(f.cuadrosSeguidos),
    f.sentido,
    f.decidido ? "si" : "no",
    f.unida ? "si" : "no",
    f.nacioEnFranja ? "si" : "no",
    String(f.recuperada),
    f.separadaDe === null ? "" : String(f.separadaDe),
    f.llevadaPor === null ? "" : String(f.llevadaPor),
  ];
}

/** El registro en CSV (con comas), para copiar o descargar y abrir en una hoja de cálculo. */
export function registroCsv(filas: FilaRegistro[]): string {
  const celda = (c: string) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);
  return [COLUMNAS_REGISTRO.join(","), ...filas.map((f) => valoresFila(f).map(celda).join(","))].join("\n") + "\n";
}

/** Un resumen para ver de un vistazo qué subió el contador: total sumado por cada tipo de evento. */
export function resumenRegistro(filas: FilaRegistro[], sentido: string | null) {
  const del = sentido ? filas.filter((f) => f.sentido === sentido) : filas;
  const suma = (pred: (f: FilaRegistro) => boolean) => del.filter(pred).reduce((s, f) => s + f.cambio, 0);
  return {
    total: suma(() => true),
    conPesoMayorQue1: suma((f) => f.cambio > 0 && f.peso > 1),
    extraPorPeso: del.filter((f) => f.cambio > 0 && f.peso > 1).reduce((s, f) => s + (f.cambio - f.cambio / f.peso), 0),
    restas: suma((f) => f.cambio < 0),
    nacidasEnFranja: suma((f) => f.nacioEnFranja),
    recuperadas: suma((f) => f.recuperada > 0),
    unidas: suma((f) => f.unida),
    separadas: suma((f) => f.separadaDe !== null),
    llevadas: suma((f) => f.llevadaPor !== null),
  };
}
