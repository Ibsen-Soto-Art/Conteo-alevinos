import { areaMediana, detectarManchas, type OpcionesDetector } from "./detector";
import { marcarSiCruza } from "./linea";
import { Rastreador, type OpcionesRastreador } from "./rastreador";
import type { CuadroGris, Deteccion, Pista, SentidoFlujo } from "./tipos";

export interface ConfiguracionMotor {
  detector: OpcionesDetector;
  rastreador: OpcionesRastreador;
  /** Posición de la línea de conteo, en píxeles sobre el eje del flujo. */
  posicionLinea: number;
  sentido: SentidoFlujo;
  /** Si es verdadero y no hay área típica, la aprende de los primeros cuadros. */
  aprenderAreaTipica: boolean;
}

export interface ResultadoCuadro {
  /** Total crudo, sin factor de calibración. */
  total: number;
  sumadosEnEsteCuadro: number;
  detecciones: Deteccion[];
  pistas: readonly Pista[];
}

const MUESTRAS_PARA_AREA = 60;

/** Motor de conteo clásico: umbral + seguimiento + cruce de línea. No necesita entrenamiento. */
export class MotorConteo {
  private rastreador: Rastreador;
  private total = 0;
  private muestras: Deteccion[] = [];
  /** Área típica aprendida del lote. Se guarda aparte para que cambiar el detector no la borre. */
  private areaAprendida: number | null = null;

  constructor(private config: ConfiguracionMotor) {
    this.rastreador = new Rastreador(config.rastreador);
  }

  procesar(cuadro: CuadroGris): ResultadoCuadro {
    const detecciones = detectarManchas(cuadro, { ...this.config.detector, areaTipica: this.areaTipica });
    this.aprenderArea(detecciones);

    let sumados = 0;
    for (const { pista, antes } of this.rastreador.actualizar(detecciones)) {
      sumados += marcarSiCruza(pista, antes, this.config.posicionLinea, this.config.sentido);
    }
    this.total += sumados;
    return { total: this.total, sumadosEnEsteCuadro: sumados, detecciones, pistas: this.rastreador.activas };
  }

  /** Vuelve el contador a cero (nueva bolsa) sin olvidar lo aprendido del lote. */
  reiniciarConteo() {
    this.total = 0;
    this.rastreador.reiniciar();
  }

  actualizarConfiguracion(parcial: Partial<ConfiguracionMotor>) {
    this.config = { ...this.config, ...parcial };
    if (parcial.rastreador) this.rastreador = new Rastreador(this.config.rastreador);
  }

  /** El área fijada en la configuración manda; si no hay, la aprendida del lote. */
  get areaTipica(): number | null {
    return this.config.detector.areaTipica ?? this.areaAprendida;
  }

  /** Para un lote nuevo: olvida el área aprendida y la vuelve a aprender. */
  olvidarAreaTipica() {
    this.areaAprendida = null;
    this.muestras = [];
  }

  private aprenderArea(detecciones: Deteccion[]) {
    if (!this.config.aprenderAreaTipica || this.areaTipica !== null) return;
    this.muestras.push(...detecciones);
    if (this.muestras.length >= MUESTRAS_PARA_AREA) {
      this.areaAprendida = areaMediana(this.muestras);
      this.muestras = [];
    }
  }
}

/** Convierte RGBA (de un canvas) a gris con los pesos habituales de luminancia. */
export function aGris(rgba: Uint8ClampedArray, ancho: number, alto: number, destino?: Uint8Array): CuadroGris {
  const datos = destino ?? new Uint8Array(ancho * alto);
  for (let i = 0, j = 0; j < datos.length; i += 4, j++) {
    datos[j] = (rgba[i]! * 77 + rgba[i + 1]! * 150 + rgba[i + 2]! * 29) >> 8;
  }
  return { ancho, alto, datos };
}
