import type { Especie, Talla } from "../shared/catalogo";

export interface BolsaCerrada {
  numero: number;
  cantidad: number;
}

export interface ConteoGuardado {
  id: string;
  /** Fecha ISO de cuando se terminó. */
  fecha: string;
  especie: Especie;
  talla: Talla;
  bolsas: number[];
}

export interface EstadoSesion {
  finca: string;
  especie: Especie | null;
  talla: Talla | null;
  /** Lo que contó la app en la prueba de 100; null mientras no se haya hecho. */
  pruebaApp: number | null;
  /** Alevinos por bolsa; null = sin meta, el usuario cierra cada bolsa. */
  meta: number | null;
  /** Alevinos en la bolsa abierta. */
  enBolsa: number;
  /** Bolsas cerradas en el conteo de hoy. */
  bolsas: BolsaCerrada[];
  pausado: boolean;
  /** Conteos terminados, el más reciente primero. */
  historial: ConteoGuardado[];
}

export type Accion =
  | { tipo: "empezar" }
  | { tipo: "elegirEspecie"; especie: Especie }
  | { tipo: "elegirTalla"; talla: Talla }
  | { tipo: "resultadoPrueba"; contados: number }
  | { tipo: "repetirPrueba" }
  | { tipo: "fijarMeta"; meta: number | null }
  | { tipo: "sumar"; cantidad: number }
  | { tipo: "pausar" }
  | { tipo: "seguir" }
  | { tipo: "cerrarBolsa" }
  | { tipo: "deshacerCierre" }
  | { tipo: "terminar"; id: string; fecha: string };

export const META_PASO = 100;
export const META_MINIMA = 100;
export const META_MAXIMA = 10_000;
export const META_INICIAL = 1_000;
/** Cuando faltan estos o menos para la meta, la pantalla se pone ámbar. */
export const AVISO_FALTAN = 50;

export function cambiarMeta(meta: number, delta: number): number {
  return Math.min(META_MAXIMA, Math.max(META_MINIMA, meta + delta));
}

export function totalHoy(e: EstadoSesion): number {
  return e.bolsas.reduce((s, b) => s + b.cantidad, 0) + e.enBolsa;
}

export function numeroBolsaAbierta(e: EstadoSesion): number {
  return e.bolsas.length + 1;
}

export function reducir(e: EstadoSesion, a: Accion): EstadoSesion {
  switch (a.tipo) {
    case "empezar":
      return { ...e, especie: null, talla: null, pruebaApp: null, enBolsa: 0, bolsas: [], pausado: false };
    case "elegirEspecie":
      return { ...e, especie: a.especie };
    case "elegirTalla":
      return { ...e, talla: a.talla };
    case "resultadoPrueba":
      return { ...e, pruebaApp: a.contados };
    case "repetirPrueba":
      return { ...e, pruebaApp: null };
    case "fijarMeta":
      return { ...e, meta: a.meta };
    case "sumar":
      return e.pausado ? e : { ...e, enBolsa: e.enBolsa + a.cantidad };
    case "pausar":
      return { ...e, pausado: true };
    case "seguir":
      return { ...e, pausado: false };
    case "cerrarBolsa":
      return {
        ...e,
        bolsas: [...e.bolsas, { numero: numeroBolsaAbierta(e), cantidad: e.enBolsa }],
        enBolsa: 0,
        pausado: false,
      };
    case "deshacerCierre": {
      const ultima = e.bolsas.at(-1);
      if (!ultima) return e;
      return { ...e, bolsas: e.bolsas.slice(0, -1), enBolsa: ultima.cantidad };
    }
    case "terminar": {
      if (!e.especie || !e.talla || e.bolsas.length === 0) return e;
      const conteo: ConteoGuardado = {
        id: a.id,
        fecha: a.fecha,
        especie: e.especie,
        talla: e.talla,
        bolsas: e.bolsas.map((b) => b.cantidad),
      };
      return { ...e, historial: [conteo, ...e.historial], bolsas: [], enBolsa: 0, pausado: false };
    }
  }
}

/** Datos de ejemplo para ver las pantallas mientras no hay base de datos ni motor conectados. */
export function estadoDeEjemplo(ahora = new Date()): EstadoSesion {
  const ayer = new Date(ahora.getTime() - 86_400_000);
  ayer.setHours(15, 40, 0, 0);
  return {
    finca: "Finca La Esperanza",
    especie: "cachama",
    talla: "pequeno",
    pruebaApp: 97,
    meta: META_INICIAL,
    enBolsa: 763,
    bolsas: [
      { numero: 1, cantidad: 1003 },
      { numero: 2, cantidad: 1001 },
    ],
    pausado: false,
    historial: [
      {
        id: "ejemplo-1",
        fecha: ayer.toISOString(),
        especie: "tilapia",
        talla: "mediano",
        bolsas: [1002, 1000, 1004, 1001, 1003, 1000, 1002, 1001, 1000, 1003, 1002, 532],
      },
    ],
  };
}
