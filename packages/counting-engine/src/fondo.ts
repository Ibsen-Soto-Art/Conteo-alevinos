import type { CuadroGris } from "./tipos";

export interface OpcionesFondo {
  /** Cuadros que mira antes de dar el fondo por aprendido (~3 s). Mientras tanto se cuenta con el umbral fijo. */
  cuadrosParaAprender: number;
  /** Un píxel es «algo» (alevino, mano, basura) si es así de más oscuro que el fondo. */
  contraste: number;
  /** Qué tanto se acerca el fondo a cada cuadro en las zonas sin nada (luz que cambia despacio). */
  ritmo: number;
  /** Lo mismo donde hay algo: muy lento, para que una hoja pegada termine siendo fondo. */
  ritmoPrimerPlano: number;
  /** Mientras aprende, qué tanto sube el fondo hacia un píxel más claro (lo que pasó ya se fue). */
  subir: number;
  /** Mientras aprende, qué tanto baja hacia un píxel más oscuro (puede ser un alevino que pasa). */
  bajar: number;
}

export const OPCIONES_FONDO: OpcionesFondo = {
  cuadrosParaAprender: 90,
  contraste: 35,
  ritmo: 0.02,
  ritmoPrimerPlano: 0.0005,
  subir: 0.5,
  bajar: 0.02,
};

/**
 * - aprendiendo: mirando el canal (se cuenta igual, con el umbral fijo).
 * - listo: ya sabe cómo es el canal vacío.
 */
export type EstadoFondo = "aprendiendo" | "listo";

/**
 * Aprende cómo se ve el canal vacío (con sus rayones, marcas y manchas fijas) para contar solo lo
 * que aparece encima. No hace falta que el canal esté vacío: los alevinos son más oscuros que el
 * fondo y pasan, así que el fondo sube rápido hacia lo claro y baja muy despacio hacia lo oscuro.
 * Lo fijo (marcas, rayones) sí termina en el fondo; lo que pasa, no.
 */
export class ModeloFondo {
  readonly op: OpcionesFondo;
  private fondo: Float32Array | null = null;
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

  /** El fondo aprendido (para buscar las marcas del canal), o null si aún no hay. */
  get imagen(): CuadroGrisFlotante | null {
    return this.fondo && this.dims ? { ...this.dims, datos: this.fondo } : null;
  }

  private dims: { ancho: number; alto: number } | null = null;

  /** Mientras aprende: mira un cuadro. Devuelve true cuando el fondo quedó listo. */
  aprender(cuadro: CuadroGris): boolean {
    if (this.listo) return true;
    const n = cuadro.ancho * cuadro.alto;
    const { datos } = cuadro;
    if (!this.fondo || this.fondo.length !== n) {
      this.fondo = Float32Array.from(datos);
      this.dims = { ancho: cuadro.ancho, alto: cuadro.alto };
      this.vistos = 1;
      return this.listo;
    }
    const { subir, bajar } = this.op;
    const fondo = this.fondo;
    for (let i = 0; i < n; i++) {
      const d = datos[i]! - fondo[i]!;
      fondo[i]! += d * (d > 0 ? subir : bajar);
    }
    this.vistos++;
    return this.listo;
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
    this.vistos = 0;
  }
}

export interface CuadroGrisFlotante {
  ancho: number;
  alto: number;
  datos: Float32Array;
}
