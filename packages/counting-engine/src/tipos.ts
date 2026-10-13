/** Cuadro en escala de grises: un byte por píxel, 0 = negro, 255 = blanco. */
export interface CuadroGris {
  ancho: number;
  alto: number;
  datos: Uint8Array | Uint8ClampedArray;
}

/** Zona del cuadro donde está el canal. Fuera de ella no se busca nada. */
export interface Zona {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export interface Deteccion {
  x: number;
  y: number;
  area: number;
  /** Alevinos estimados en la mancha: 1 normalmente, más si vienen pegados. */
  peso: number;
}

export interface Pista {
  id: number;
  x: number;
  y: number;
  peso: number;
  /** Cuadros seguidos sin volver a verla. */
  perdida: number;
  contada: boolean;
}

/** Eje y sentido en que corre el agua por el canal. */
export type SentidoFlujo = "abajo" | "arriba" | "derecha" | "izquierda";
