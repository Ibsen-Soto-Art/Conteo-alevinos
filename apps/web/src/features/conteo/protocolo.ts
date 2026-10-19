import {
  flujoVertical,
  type AnalisisCanal,
  type Controles,
  type Deteccion,
  type EstadisticasLote,
  type EstadoFondo,
  type Flujo,
  type Franja,
  type PerfilForma,
  type SentidoFlujo,
} from "@contador/counting-engine";

// Los ajustes y su paso a configuración viven en el motor: la app y el script de
// precisión (tests/precision) cuentan con exactamente lo mismo.
export {
  CONTROLES_INICIALES,
  LADO_PROCESO,
  franjaPx,
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
 * Pasa un punto de una imagen (`proceso`) a la vista que la muestra con `object-fit: cover`
 * y `object-position: posicion` (fracciones de 0 a 1; por defecto centrada). Devuelve también la
 * escala, para el tamaño de las marcas.
 */
export function puntoEnVista(
  x: number,
  y: number,
  proceso: { ancho: number; alto: number },
  vista: { ancho: number; alto: number },
  posicion: { x: number; y: number } = { x: 0.5, y: 0.5 },
): { x: number; y: number; escala: number } {
  const escala = Math.max(vista.ancho / proceso.ancho, vista.alto / proceso.alto);
  return {
    x: x * escala - (proceso.ancho * escala - vista.ancho) * posicion.x,
    y: y * escala - (proceso.alto * escala - vista.alto) * posicion.y,
    escala,
  };
}

/**
 * Qué parte del video mostrar (para `object-position`) para que la franja de conteo siempre se
 * vea, aunque la vista sea una franja ancha y baja: el punto de la franja queda a la vista.
 */
export function posicionParaVerFranja(
  zona: { x: number; y: number; ancho: number; alto: number },
  video: { ancho: number; alto: number },
  ajustes: Pick<Controles, "lineaPorcentaje" | "sentido">,
): { x: number; y: number } {
  const centro = Math.min(1, Math.max(0, ajustes.lineaPorcentaje / 100));
  const cx = (zona.x + zona.ancho / 2) / video.ancho;
  const cy = (zona.y + zona.alto / 2) / video.alto;
  return flujoVertical(ajustes.sentido)
    ? { x: cx, y: (zona.y + centro * zona.alto) / video.alto }
    : { x: (zona.x + centro * zona.ancho) / video.ancho, y: cy };
}

/** Cómo se pone el video en la vista: punto de la vista = punto del video × escala + (dx, dy). */
export interface Encuadre {
  escala: number;
  dx: number;
  dy: number;
}

/** Como `object-fit: cover` con `object-position: posicion` (fracciones de 0 a 1). */
export function encuadreCubrir(
  video: { ancho: number; alto: number },
  vista: { ancho: number; alto: number },
  posicion: { x: number; y: number } = { x: 0.5, y: 0.5 },
): Encuadre {
  const escala = Math.max(vista.ancho / video.ancho, vista.alto / video.alto);
  return { escala, dx: -(video.ancho * escala - vista.ancho) * posicion.x, dy: -(video.alto * escala - vista.alto) * posicion.y };
}

/**
 * Todo el canal (`zona`, en píxeles del video) a la vista, lo más grande posible y centrado dentro
 * del espacio libre: la vista menos `arriba` y `abajo` px tapados por avisos y por el contador.
 */
export function encuadreCanal(
  zona: { x: number; y: number; ancho: number; alto: number },
  vista: { ancho: number; alto: number },
  { arriba = 0, abajo = 0 }: { arriba?: number; abajo?: number } = {},
): Encuadre {
  const libre = Math.max(1, vista.alto - arriba - abajo);
  const escala = Math.min(vista.ancho / zona.ancho, libre / zona.alto);
  return {
    escala,
    dx: vista.ancho / 2 - (zona.x + zona.ancho / 2) * escala,
    dy: arriba + libre / 2 - (zona.y + zona.alto / 2) * escala,
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

/** Lo que el motor necesita para contar: ajustes, tamaño del recorte y lo que se sabe del pez. */
export interface ConfiguracionContar {
  controles: Controles;
  ancho: number;
  alto: number;
  /** Perfil de la especie y tamaño (packages/domain/src/perfiles.ts); null = contar sin filtro de forma. */
  perfil?: PerfilForma | null;
  /** Píxeles por cm en el recorte, si se encontraron las 4 marcas del canal. */
  pxPorCm?: number | null;
  /** Lo que midió la Prueba de 100 de este lote. */
  lote?: EstadisticasLote | null;
  /** Aprender el fondo del canal mientras cuenta. */
  fondo?: boolean;
  /** Averiguar hacia dónde corre el agua (la app del campesino siempre lo hace). */
  sentidoAutomatico?: boolean;
  /** El sentido de `controles` es el decidido en el conteo anterior: se confirma más rápido. */
  sentidoConocido?: boolean;
}

export type MensajeAlMotor =
  /** Un cuadro completo para buscar el canal y sus marcas; con `ultimo` contesta el análisis. */
  | { tipo: "canal"; ancho: number; alto: number; rgba: ArrayBuffer; ultimo: boolean }
  | ({ tipo: "configurar" } & ConfiguracionContar)
  | { tipo: "cuadro"; ancho: number; alto: number; rgba: ArrayBuffer }
  /** Contador a cero para una bolsa nueva; conserva lo aprendido del lote. */
  | { tipo: "reiniciar" }
  /** Lote nuevo: vuelve a aprender el tamaño de un alevino. */
  | { tipo: "olvidarArea" }
  /** Volver a mirar el canal vacío (se empieza a contar, se movió el celular). */
  | { tipo: "reiniciarFondo" }
  /** Lo que se midió de los alevinos contados desde el último «a cero» (la Prueba de 100). */
  | { tipo: "estadisticas" };

export type MensajeDelMotor =
  | {
      tipo: "resultado";
      /** Total crudo, sin factor de calibración. */
      total: number;
      sumados: number;
      detecciones: Deteccion[];
      /** Manchas descartadas, con su motivo (tamaño, forma, burbuja, quieto). */
      descartadas: Deteccion[];
      pistas: PistaVista[];
      areaTipica: number | null;
      ancho: number;
      alto: number;
      /** Brillo medio del cuadro (0 a 255), para avisar «Poca luz». */
      brillo: number;
      /** Milisegundos que tardó el motor en este cuadro. */
      ms: number;
      /** Cómo va el aprendizaje del canal vacío; null si no se usa fondo. */
      fondo: { estado: EstadoFondo; progreso: number } | null;
      /** Franja de conteo en píxeles del recorte. */
      franja: Franja;
      /** De dónde sale el tamaño de un alevino: Prueba de 100, marcas, o todavía no se sabe. */
      origenTamano: "lote" | "escala" | "amplio" | null;
      /** Qué tan rápido pasan frente al límite de la franja; null si nada se mueve. */
      flujo: Flujo | null;
      /** Cuadros por segundo que procesa el motor. */
      cuadrosPorSegundo: number | null;
      /** Sentido del agua con que cuenta (el elegido, o el que va ganando mientras lo averigua). */
      sentido: SentidoFlujo;
      sentidoDecidido: boolean;
    }
  | { tipo: "estadisticas"; estadisticas: EstadisticasLote | null; anchoRecorte: number }
  /** Análisis del canal, en píxeles del cuadro completo que se analizó (`ancho` × `alto`). */
  | { tipo: "canal"; analisis: AnalisisCanal; ancho: number; alto: number }
  | { tipo: "error"; mensaje: string };
