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
  /** Si ya aporta al total (para dibujarla en verde). */
  contada: boolean;
  /** Cuadros en que se ha visto (también los de la pista perdida que heredó). */
  edad: number;
  /** Últimas posiciones sobre el eje del flujo, para saber si avanza con el agua o está quieta. */
  recorrido: number[];
  /** Último lado de la franja en que estuvo por fuera: antes (arriba) o después (abajo). */
  ladoExterior: "antes" | "despues" | null;
  /** Veces que cruzó la franja con el flujo menos las que la cruzó contra el flujo. */
  saldo: number;
  /** Lo que aporta al total ahora: máx(0, saldo) × peso con que se contó. */
  aporte: number;
  pesoContado: number;
  /** De sus últimos cuadros, cuáles tuvieron forma de alevino (con perfil, lo descartado también se sigue). */
  aceptadas: boolean[];
  /** Cuadros seguidos (sin perderse) en que tuvo forma de alevino. */
  seguidos: number;
  /** Medidas de sus últimos cuadros (con perfil), para aprender el tamaño del lote. */
  medidas: { largo: number; ancho: number; area: number; relacion: number }[];
  /** Si ya se usaron sus medidas para el lote. */
  medida: boolean;
}

/** Eje y sentido en que corre el agua por el canal. */
export type SentidoFlujo = "abajo" | "arriba" | "derecha" | "izquierda";
