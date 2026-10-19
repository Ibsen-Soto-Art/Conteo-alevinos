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
  /** Medidas de forma (solo con perfil de especie). */
  largo?: number;
  ancho?: number;
  angulo?: number;
  relacion?: number;
  solidez?: number;
  cuerpos?: number;
  /** Si se descartó, por qué: tamaño, forma, burbuja o quieto. */
  motivo?: "tamano" | "forma" | "burbuja" | "quieto";
}

export interface Pista {
  id: number;
  x: number;
  y: number;
  /** Alevinos que lleva: la mediana de los pesos de sus últimos cuadros (no el máximo). */
  peso: number;
  /** Pesos de los últimos cuadros. */
  pesos: number[];
  /** Desplazamiento del último cuadro, para predecir dónde estará en el siguiente. */
  vx: number;
  vy: number;
  /** Cuadros seguidos sin volver a verla. */
  perdida: number;
  contada: boolean;
}

/** Eje y sentido en que corre el agua por el canal. */
export type SentidoFlujo = "abajo" | "arriba" | "derecha" | "izquierda";
