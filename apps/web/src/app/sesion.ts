import {
  cantidadBolsa,
  descartarBolsa,
  nuevaBolsa,
  siguienteNumero,
  totalConteo,
  type Bolsa,
  type Conteo,
  type EstadisticasMedidas,
  type Lote,
} from "@contador/domain";
import type { Especie, Talla } from "../shared/catalogo";
import type { ConteoGuardado } from "../shared/datos/repositorio";
import type { ConteoEnCurso } from "./enCurso";

export type { ConteoGuardado };

export interface EstadoSesion {
  finca: string;
  especie: Especie | null;
  talla: Talla | null;
  /** Lo que va contando la app durante la prueba de 100. */
  pruebaEnVivo: number;
  /** Lo que contó la app en la prueba de 100 al terminarla; null mientras no se haya hecho. */
  pruebaApp: number | null;
  /** Lo que midió la prueba de 100 de los alevinos del lote (tamaño y forma), si alcanzó. */
  pruebaEstadisticas: EstadisticasMedidas | null;
  /** Se crea al aceptar una prueba de 100 buena; guarda el factor de calibración. */
  lote: Lote | null;
  /** Alevinos por bolsa; null = sin meta, el usuario cierra cada bolsa. */
  meta: number | null;
  /** Se abre al empezar a contar y se cierra al terminar. */
  conteo: Conteo | null;
  /** Lo que contó la app en la bolsa abierta, sin corregir. */
  crudo: number;
  /** Bolsas cerradas del conteo abierto, incluidas las descartadas. */
  bolsas: Bolsa[];
  pausado: boolean;
  /** Conteos terminados, el más reciente primero. */
  historial: ConteoGuardado[];
  /** Si lo último que se intentó guardar en el teléfono quedó guardado. */
  guardado: boolean;
}

export type Accion =
  | { tipo: "empezar" }
  | { tipo: "elegirEspecie"; especie: Especie }
  | { tipo: "elegirTalla"; talla: Talla }
  | { tipo: "sumarPrueba"; cantidad: number }
  | { tipo: "resultadoPrueba"; contados: number; estadisticas?: EstadisticasMedidas | null }
  | { tipo: "repetirPrueba" }
  /** «Volver a cero» durante la prueba: el conteo vuelve a 0, el pez y el tamaño siguen. */
  | { tipo: "pruebaACero" }
  | { tipo: "aceptarPrueba"; lote: Lote }
  | { tipo: "fijarMeta"; meta: number | null }
  | { tipo: "empezarConteo"; conteo: Conteo }
  | { tipo: "sumar"; cantidad: number }
  | { tipo: "pausar" }
  | { tipo: "seguir" }
  /** «Volver a cero» en Contando: solo la bolsa abierta vuelve a 0. */
  | { tipo: "bolsaACero" }
  | { tipo: "cerrarBolsa"; id: string; cerradaEn: string }
  | { tipo: "deshacerCierre" }
  | { tipo: "terminar"; fin: string }
  | { tipo: "cargarHistorial"; historial: ConteoGuardado[] }
  /** Al abrir la app: el conteo que quedó abierto (la página se cerró contando). */
  | { tipo: "restaurar"; enCurso: ConteoEnCurso }
  /** Terminar un conteo sin ninguna bolsa: se cierra y no va al historial. */
  | { tipo: "abandonarConteo" }
  | { tipo: "guardado"; ok: boolean };

export const META_PASO = 100;
export const META_MINIMA = 100;
export const META_MAXIMA = 10_000;
export const META_INICIAL = 1_000;
/** Cuando faltan estos o menos para la meta, la pantalla se pone ámbar. */
export const AVISO_FALTAN = 50;

export function cambiarMeta(meta: number, delta: number): number {
  return Math.min(META_MAXIMA, Math.max(META_MINIMA, meta + delta));
}

export function factor(e: EstadoSesion): number {
  return e.lote?.calibracion?.factor ?? 1;
}

export function numeroBolsaAbierta(e: EstadoSesion): number {
  return siguienteNumero(e.bolsas);
}

/**
 * Alevinos en la bolsa abierta: lo que contó la app corregido con el factor. Empieza en 0;
 * los 100 de la prueba no van en la bolsa, se devuelven al tanque.
 */
export function enBolsa(e: EstadoSesion): number {
  return cantidadBolsa(e.crudo, factor(e));
}

export function totalHoy(e: EstadoSesion): number {
  return totalConteo(e.bolsas) + enBolsa(e);
}

/** La bolsa que se guardaría al cerrar ahora. */
export function bolsaAlCerrar(e: EstadoSesion, id: string, cerradaEn: string): Bolsa | null {
  if (!e.conteo) return null;
  return nuevaBolsa({
    id,
    conteoId: e.conteo.id,
    numero: numeroBolsaAbierta(e),
    crudo: e.crudo,
    factor: factor(e),
    cerradaEn,
  });
}

/** La última bolsa válida, que es la que «Deshacer» descarta. */
export function ultimaBolsaValida(e: EstadoSesion): Bolsa | undefined {
  return e.bolsas.findLast((b) => b.estado === "valida");
}

export function reducir(e: EstadoSesion, a: Accion): EstadoSesion {
  switch (a.tipo) {
    case "empezar":
      // Con un conteo abierto no se empieza otro: primero hay que terminarlo (desde el Inicio).
      if (e.conteo) return e;
      return {
        ...e,
        especie: null,
        talla: null,
        pruebaEnVivo: 0,
        pruebaApp: null,
        pruebaEstadisticas: null,
        lote: null,
        conteo: null,
        crudo: 0,
        bolsas: [],
        pausado: false,
      };
    case "elegirEspecie":
      return { ...e, especie: a.especie };
    case "elegirTalla":
      return { ...e, talla: a.talla };
    case "sumarPrueba":
      return e.pruebaApp === null ? { ...e, pruebaEnVivo: Math.max(0, e.pruebaEnVivo + a.cantidad) } : e;
    case "resultadoPrueba":
      return { ...e, pruebaApp: a.contados, pruebaEstadisticas: a.estadisticas ?? null };
    case "repetirPrueba":
    case "pruebaACero":
      return { ...e, pruebaEnVivo: 0, pruebaApp: null, pruebaEstadisticas: null };
    case "aceptarPrueba":
      return { ...e, lote: a.lote };
    case "fijarMeta":
      return { ...e, meta: a.meta };
    case "empezarConteo":
      // Nunca encima de uno abierto (por ejemplo, volviendo atrás hasta «Empezar a contar»).
      if (e.conteo) return e;
      return { ...e, conteo: a.conteo, crudo: 0, bolsas: [], pausado: false };
    case "sumar":
      // Negativo si se devuelve uno ya contado; nunca baja de 0.
      return e.pausado || !e.conteo ? e : { ...e, crudo: Math.max(0, e.crudo + a.cantidad) };
    case "pausar":
      return { ...e, pausado: true };
    case "seguir":
      return { ...e, pausado: false };
    case "bolsaACero":
      return { ...e, crudo: 0 };
    case "cerrarBolsa": {
      const bolsa = bolsaAlCerrar(e, a.id, a.cerradaEn);
      if (!bolsa) return e;
      return { ...e, bolsas: [...e.bolsas, bolsa], crudo: 0, pausado: false };
    }
    case "deshacerCierre": {
      const ultima = ultimaBolsaValida(e);
      if (!ultima) return e;
      // La bolsa no se borra: queda descartada y su conteo vuelve al contador.
      return {
        ...e,
        bolsas: e.bolsas.map((b) => (b.id === ultima.id ? descartarBolsa(b) : b)),
        crudo: ultima.crudo,
      };
    }
    case "terminar": {
      if (!e.conteo || !e.lote || totalConteo(e.bolsas) === 0) return e;
      const validas = e.bolsas.filter((b) => b.estado === "valida");
      const conteo: ConteoGuardado = {
        id: e.conteo.id,
        fecha: a.fin,
        especie: e.lote.especie,
        talla: e.lote.talla,
        bolsas: validas.map((b) => b.cantidad),
      };
      return { ...e, historial: [conteo, ...e.historial], conteo: null, bolsas: [], crudo: 0, pausado: false };
    }
    case "cargarHistorial":
      return { ...e, historial: a.historial };
    case "restaurar": {
      const r = a.enCurso;
      return { ...e, especie: r.especie, talla: r.talla, lote: r.lote, meta: r.meta, conteo: r.conteo, crudo: r.crudo, bolsas: r.bolsas, pausado: r.pausado };
    }
    case "abandonarConteo":
      return { ...e, conteo: null, crudo: 0, bolsas: [], pausado: false };
    case "guardado":
      return { ...e, guardado: a.ok };
  }
}

export function estadoInicial(): EstadoSesion {
  return {
    finca: "Mi finca",
    especie: null,
    talla: null,
    pruebaEnVivo: 0,
    pruebaApp: null,
    pruebaEstadisticas: null,
    lote: null,
    meta: META_INICIAL,
    conteo: null,
    crudo: 0,
    bolsas: [],
    pausado: false,
    historial: [],
    guardado: true,
  };
}

/**
 * Datos de ejemplo (?demo) para ver las pantallas sin hacer un conteo de verdad. Con `conConteo`,
 * un conteo abierto con dos bolsas (para Contando y Bolsa lista); sin él, el lote listo y la
 * prueba hecha, antes de empezar a contar (las demás pantallas).
 */
export function estadoDeEjemplo(ahora = new Date(), { conConteo = true } = {}): EstadoSesion {
  const ayer = new Date(ahora.getTime() - 86_400_000);
  ayer.setHours(15, 40, 0, 0);
  const lote: Lote = {
    id: "ejemplo-lote",
    especie: "cachama",
    talla: "pequeno",
    creadoEn: ahora.toISOString(),
    calibracion: { pasadas: [{ contadosAMano: 100, contadosPorApp: 97 }], factor: 100 / 97 },
  };
  const conteo: Conteo = { id: "ejemplo-conteo", loteId: lote.id, metaPorBolsa: META_INICIAL, inicio: ahora.toISOString(), fin: null };
  const bolsa = (numero: number, crudo: number): Bolsa =>
    nuevaBolsa({ id: `ejemplo-bolsa-${numero}`, conteoId: conteo.id, numero, crudo, factor: 100 / 97, cerradaEn: ahora.toISOString() });
  return {
    ...estadoInicial(),
    finca: "Finca La Esperanza",
    especie: "cachama",
    talla: "pequeno",
    pruebaEnVivo: 97,
    pruebaApp: 97,
    lote,
    conteo: conConteo ? conteo : null,
    crudo: conConteo ? 740 : 0,
    bolsas: conConteo ? [bolsa(1, 973), bolsa(2, 971)] : [],
    historial: [
      {
        id: "ejemplo-1",
        fecha: ayer.toISOString(),
        especie: "pangasius",
        talla: "mediano",
        bolsas: [1002, 1000, 1004, 1001, 1003, 1000, 1002, 1001, 1000, 1003, 1002, 532],
      },
    ],
  };
}
