import type { CuadroGris } from "./tipos";

export interface OpcionesFondo {
  /** Cuadros seguidos con el canal quieto para dar el fondo por aprendido (~3 s). */
  cuadrosParaAprender: number;
  /** Un píxel es «algo» (alevino, mano, basura) si es así de más oscuro que el fondo. */
  contraste: number;
  /** Fracción de píxeles que pueden cambiar sin que se considere movimiento (ruido de la cámara). */
  fraccionMovimiento: number;
  /** Qué tanto se acerca el fondo a cada cuadro en las zonas sin nada (luz que cambia despacio). */
  ritmo: number;
  /** Lo mismo donde hay algo: muy lento, para que una hoja pegada termine siendo fondo. */
  ritmoPrimerPlano: number;
  /** Si en este tiempo nunca hubo canal quieto, se sigue sin fondo (con el umbral fijo). */
  cuadrosMaximosEspera: number;
}

export const OPCIONES_FONDO: OpcionesFondo = {
  cuadrosParaAprender: 90,
  contraste: 35,
  fraccionMovimiento: 0.002,
  ritmo: 0.02,
  ritmoPrimerPlano: 0.0005,
  cuadrosMaximosEspera: 600,
};

/**
 * - aprendiendo: mirando el canal vacío.
 * - esperando: vio movimiento mientras aprendía; vuelve a empezar cuando el canal esté quieto.
 * - listo: ya sabe cómo es el canal vacío.
 * - sin-fondo: nunca hubo canal quieto; se cuenta con el umbral fijo.
 */
export type EstadoFondo = "aprendiendo" | "esperando" | "listo" | "sin-fondo";

/**
 * Aprende cómo se ve el canal vacío (con sus rayones, marcas y manchas fijas) para contar
 * solo lo que aparece encima. Mientras aprende, si algo se mueve, espera en vez de aprender mal.
 */
export class ModeloFondo {
  readonly op: OpcionesFondo;
  private fondo: Float32Array | null = null;
  private quietos = 0;
  private vistos = 0;
  private _estado: EstadoFondo = "aprendiendo";

  constructor(op: Partial<OpcionesFondo> = {}) {
    this.op = { ...OPCIONES_FONDO, ...op };
  }

  get estado(): EstadoFondo {
    return this._estado;
  }

  /** De 0 a 1, cuánto lleva aprendido (para el aviso en pantalla). */
  get progreso(): number {
    if (this._estado === "listo" || this._estado === "sin-fondo") return 1;
    return Math.min(1, this.quietos / this.op.cuadrosParaAprender);
  }

  get listo(): boolean {
    return this._estado === "listo";
  }

  /** El fondo aprendido (para buscar las marcas del canal), o null si aún no hay. */
  get imagen(): CuadroGrisFlotante | null {
    return this.fondo && this.dims ? { ...this.dims, datos: this.fondo } : null;
  }

  private dims: { ancho: number; alto: number } | null = null;

  /** Mientras aprende: mira un cuadro. Devuelve true cuando el fondo quedó listo. */
  aprender(cuadro: CuadroGris): boolean {
    if (this._estado === "listo" || this._estado === "sin-fondo") return true;
    const n = cuadro.ancho * cuadro.alto;
    if (!this.fondo || this.fondo.length !== n) {
      this.fondo = Float32Array.from(cuadro.datos);
      this.dims = { ancho: cuadro.ancho, alto: cuadro.alto };
      this.quietos = 0;
      this.vistos = 1;
      return false;
    }
    this.vistos++;
    let cambiados = 0;
    const { datos } = cuadro;
    for (let i = 0; i < n; i++) if (Math.abs(datos[i]! - this.fondo[i]!) > this.op.contraste) cambiados++;

    if (cambiados > Math.max(20, n * this.op.fraccionMovimiento)) {
      // Algo se movió: lo aprendido puede tener alevinos. Se empieza otra vez desde este cuadro.
      this._estado = "esperando";
      this.fondo.set(datos);
      this.quietos = 0;
    } else {
      this._estado = "aprendiendo";
      this.quietos++;
      const k = 1 / (this.quietos + 1);
      for (let i = 0; i < n; i++) this.fondo[i]! += (datos[i]! - this.fondo[i]!) * k;
    }

    if (this.quietos >= this.op.cuadrosParaAprender) this._estado = "listo";
    else if (this.vistos >= this.op.cuadrosMaximosEspera) this._estado = "sin-fondo";
    return this.listo || this._estado === "sin-fondo";
  }

  /**
   * Marca en `mascara` (1/0) lo que es más oscuro que el fondo, y actualiza el fondo:
   * normal donde no hay nada, muy lento donde hay algo.
   */
  primerPlano(cuadro: CuadroGris, mascara: Uint8Array) {
    const fondo = this.fondo!;
    const { datos } = cuadro;
    const { contraste, ritmo, ritmoPrimerPlano } = this.op;
    for (let i = 0; i < datos.length; i++) {
      const diferencia = fondo[i]! - datos[i]!;
      const algo = diferencia > contraste;
      mascara[i] = algo ? 1 : 0;
      fondo[i]! += (datos[i]! - fondo[i]!) * (algo ? ritmoPrimerPlano : ritmo);
    }
  }

  /** Para un lote o una sesión nueva: vuelve a aprender. */
  reiniciar() {
    this.fondo = null;
    this.dims = null;
    this.quietos = 0;
    this.vistos = 0;
    this._estado = "aprendiendo";
  }
}

export interface CuadroGrisFlotante {
  ancho: number;
  alto: number;
  datos: Float32Array;
}
