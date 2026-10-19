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
  /** Manchas que se unieron para formarla (un pez partido en pedazos); 1 si es una sola. */
  pedazos?: number;
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
  /** Para el registro: alguna vez fue pedazos unidos. */
  unida: boolean;
  /** Para el registro: nació dentro de la franja (no se vio llegar). */
  nacioEnFranja: boolean;
  /** Para el registro: veces que heredó una pista perdida. */
  recuperada: number;
  /** Área de su última mancha (para ver si se le pegó otra o se le separó una). */
  areaUltima: number;
  /** Si nació de una mancha que se partió: el ID de esa pista. */
  separadaDe: number | null;
  /** Mientras va pegada a otra (una sola mancha): el ID de la que la lleva. */
  llevadaPor: number | null;
}

/** Un cambio del total causado por una pista (para el registro de /laboratorio). */
export interface EventoConteo {
  /** Número del cuadro procesado (desde que se creó el motor). */
  cuadro: number;
  /** Momento del cuadro en ms, si se sabe. */
  tiempo: number | null;
  id: number;
  /** Dónde estaba la pista (px del recorte). */
  x: number;
  y: number;
  /** Lo que cambió el total de su sentido: +1, +2, −1… */
  cambio: number;
  /** Peso con que se contó (alevinos que lleva la pista) y los pesos de sus últimos cuadros. */
  peso: number;
  pesos: number[];
  /** Medianas de sus últimas medidas (px del recorte); null sin perfil. */
  largo: number | null;
  ancho: number | null;
  area: number | null;
  /** Cuadros que se ha seguido la pista. */
  cuadrosSeguidos: number;
  /** Sentido del conteo en que pasó y si ya estaba decidido. */
  sentido: SentidoFlujo;
  decidido: boolean;
  unida: boolean;
  nacioEnFranja: boolean;
  recuperada: number;
  /** Nació de una mancha que se partió: el ID de esa pista. */
  separadaDe: number | null;
  /** Cruzó mientras iba pegada a otra: el ID de la que la llevaba. */
  llevadaPor: number | null;
}

/** Eje y sentido en que corre el agua por el canal. */
export type SentidoFlujo = "abajo" | "arriba" | "derecha" | "izquierda";
