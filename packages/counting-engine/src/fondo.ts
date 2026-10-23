import type { CuadroGris } from "./tipos";

export interface OpcionesFondo {
  /** Cuadros para dar el fondo por aprendido (~3 s): hasta entonces se adapta más rápido. */
  cuadrosParaAprender: number;
  /** Cuadros que mira antes de empezar a usar el fondo (~⅓ s); antes, el umbral fijo. */
  cuadrosParaUsar: number;
  /** Un píxel es «algo» (alevino, mano, basura) si es al menos así de más oscuro que el fondo. */
  contraste: number;
  /**
   * Además, más oscuro que este número de veces lo que varía ese píxel con el canal vacío: donde
   * el agua hace ondas o brilla un reflejo, hace falta algo mucho más oscuro que una onda.
   */
  factorVariacion: number;
  /** Lo más que se le exige a un píxel: un alevino así de oscuro se ve aunque haya ondas. */
  contrasteMaximo: number;
  /** Qué tanto se acerca el fondo (y su variación) a cada cuadro donde no hay nada, ya aprendido. */
  ritmo: number;
  /** Lo mismo mientras aprende (los primeros segundos). */
  ritmoAprendiendo: number;
  /** Donde hay algo: muy lento, para que una hoja pegada termine siendo fondo. */
  ritmoPrimerPlano: number;
  /** Mientras aprende, qué tanto sube hacia un píxel mucho más claro (lo oscuro que había se fue). */
  subir: number;
  /** Mientras aprende, qué tanto baja hacia un píxel mucho más oscuro (un alevino que pasa). */
  bajar: number;
  /** Variación de un píxel quieto (ruido de la cámara) al empezar, en niveles de gris. */
  desviacionInicial: number;
}

export const OPCIONES_FONDO: OpcionesFondo = {
  cuadrosParaAprender: 90,
  cuadrosParaUsar: 10,
  contraste: 35,
  factorVariacion: 3,
  contrasteMaximo: 80,
  ritmo: 0.02,
  ritmoAprendiendo: 0.1,
  ritmoPrimerPlano: 0.0005,
  subir: 0.5,
  bajar: 0.02,
  desviacionInicial: 4,
};

/**
 * - aprendiendo: mirando el canal (desde el cuadro 10 ya se usa, adaptándose más rápido).
 * - listo: ya sabe cómo es el canal vacío.
 */
export type EstadoFondo = "aprendiendo" | "listo";

/**
 * Aprende cómo se ve el canal vacío (con sus rayones, marcas y manchas fijas) y **cuánto varía
 * cada punto** (ondas del agua, reflejos), para contar solo lo que aparece encima y es más oscuro
 * que esa variación. No hace falta que el canal esté vacío: lo mucho más oscuro que pasa (un
 * alevino) casi no cambia el fondo, y lo mucho más claro que aparece (se fue lo que había) lo
 * cambia rápido. Lo fijo (marcas, rayones) sí termina en el fondo; lo que pasa, no.
 */
export class ModeloFondo {
  readonly op: OpcionesFondo;
  private fondo: Float32Array | null = null;
  private varianza: Float32Array | null = null;
  private vistos = 0;

  constructor(op: Partial<OpcionesFondo> = {}) {
    this.op = { ...OPCIONES_FONDO, ...op };
  }

  get estado(): EstadoFondo {
    return this.listo ? "listo" : "aprendiendo";
  }

  /** De 0 a 1, cuánto lleva aprendido. */
  get progreso(): number {
    return Math.min(1, this.vistos / this.op.cuadrosParaAprender);
  }

  get listo(): boolean {
    return this.vistos >= this.op.cuadrosParaAprender;
  }

  /** Ya se puede contar contra el fondo (aunque siga aprendiendo). */
  get usable(): boolean {
    return this.vistos >= Math.min(this.op.cuadrosParaUsar, this.op.cuadrosParaAprender);
  }

  /** El fondo aprendido (para buscar las marcas del canal), o null si aún no hay. */
  get imagen(): CuadroGrisFlotante | null {
    return this.fondo && this.dims ? { ...this.dims, datos: this.fondo } : null;
  }

  /** Lo que varía cada píxel con el canal vacío (desviación, en niveles de gris), o null. */
  get variacion(): CuadroGrisFlotante | null {
    return this.varianza && this.dims ? { ...this.dims, datos: this.varianza.map(Math.sqrt) } : null;
  }

  private dims: { ancho: number; alto: number } | null = null;

  /** Mira un cuadro sin contar (hasta quedar listo). Devuelve true cuando ya se puede usar. */
  aprender(cuadro: CuadroGris): boolean {
    if (this.listo && this.fondo) return true;
    const n = cuadro.ancho * cuadro.alto;
    const { datos } = cuadro;
    if (!this.fondo || this.fondo.length !== n) {
      this.fondo = Float32Array.from(datos);
      this.varianza = new Float32Array(n).fill(this.op.desviacionInicial ** 2);
      this.dims = { ancho: cuadro.ancho, alto: cuadro.alto };
      this.vistos = 1;
      return this.usable;
    }
    const { subir, bajar, contrasteMaximo, ritmoAprendiendo } = this.op;
    const fondo = this.fondo;
    const varianza = this.varianza!;
    for (let i = 0; i < n; i++) {
      const d = datos[i]! - fondo[i]!;
      if (d > contrasteMaximo) fondo[i]! += d * subir;
      else if (d < -contrasteMaximo) fondo[i]! += d * bajar;
      else {
        fondo[i]! += d * ritmoAprendiendo;
        varianza[i]! += (d * d - varianza[i]!) * ritmoAprendiendo;
      }
    }
    this.vistos++;
    return this.usable;
  }

  /**
   * Marca en `mascara` (1/0) lo que es más oscuro que el fondo (más que el contraste y que la
   * variación de ese punto), y actualiza el fondo y su variación: normal donde no hay nada, muy
   * lento donde hay algo.
   */
  primerPlano(cuadro: CuadroGris, mascara: Uint8Array) {
    const fondo = this.fondo!;
    const varianza = this.varianza!;
    const { datos } = cuadro;
    const { contraste, factorVariacion, contrasteMaximo, ritmoPrimerPlano } = this.op;
    const ritmo = this.listo ? this.op.ritmo : this.op.ritmoAprendiendo;
    const k2 = factorVariacion * factorVariacion;
    const minimo2 = contraste * contraste;
    const maximo2 = contrasteMaximo * contrasteMaximo;
    for (let i = 0; i < datos.length; i++) {
      const d = datos[i]! - fondo[i]!;
      // umbral² = clamp(k² · varianza, contraste², máximo²): sin raíces en cada píxel.
      const umbral2 = Math.min(maximo2, Math.max(minimo2, k2 * varianza[i]!));
      const algo = d < 0 && d * d > umbral2;
      mascara[i] = algo ? 1 : 0;
      if (algo) fondo[i]! += d * ritmoPrimerPlano;
      else {
        fondo[i]! += d * ritmo;
        varianza[i]! += (d * d - varianza[i]!) * ritmo;
      }
    }
    if (!this.listo) this.vistos++;
  }

  /** Para un lote o una sesión nueva: vuelve a aprender. */
  reiniciar() {
    this.fondo = null;
    this.varianza = null;
    this.dims = null;
    this.vistos = 0;
  }
}

export interface CuadroGrisFlotante {
  ancho: number;
  alto: number;
  datos: Float32Array;
}
