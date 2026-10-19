import { areaMediana, detectarManchas, pesoDeMancha, type OpcionesDetector } from "./detector";
import { ModeloFondo, type EstadoFondo, type OpcionesFondo } from "./fondo";
import { clasificar, estadisticasDe, perfilEnPixeles, pesoPorForma, unirPedazos, type EstadisticasLote, type PerfilForma, type PerfilPx } from "./forma";
import { MedidorFlujo, type Flujo } from "./flujo";
import { actualizarConteo, enFlujo, ladoDe, type Franja } from "./franja";
import { encontrarManchas, type Medidas } from "./manchas";
import { cerrar } from "./morfologia";
import { Rastreador, type OpcionesRastreador } from "./rastreador";
import type { CuadroGris, Deteccion, Pista, SentidoFlujo } from "./tipos";

export interface ConfiguracionMotor {
  detector: OpcionesDetector;
  rastreador: OpcionesRastreador;
  /** Posición de la línea de conteo, en píxeles sobre el eje del flujo (si no hay franja). */
  posicionLinea: number;
  /** Franja de conteo (dos bordes, en píxeles sobre el eje del flujo). Sin franja, la línea. */
  franja?: Franja | null;
  sentido: SentidoFlujo;
  /** Si es verdadero y no hay área típica, la aprende de los primeros cuadros. */
  aprenderAreaTipica: boolean;
  /**
   * Perfil de la especie y tamaño (packages/domain/src/perfiles.ts). Con perfil, cada mancha se
   * mide y se descarta lo que no tiene forma de alevino; sin perfil, se cuenta toda mancha oscura.
   */
  perfil?: PerfilForma | null;
  /** Aprender el canal vacío antes de contar. Sin esto se usa el umbral fijo del detector. */
  fondo?: Partial<OpcionesFondo> | null;
  /** Píxeles por centímetro, si se encontraron las marcas del canal. */
  pxPorCm?: number | null;
  /** Lo que midió la Prueba de 100 de este lote. */
  lote?: EstadisticasLote | null;
}

export interface ResultadoCuadro {
  /** Total crudo, sin factor de calibración. */
  total: number;
  sumadosEnEsteCuadro: number;
  /** Manchas que pueden ser alevinos. */
  detecciones: Deteccion[];
  /** Manchas descartadas, con su motivo (para el laboratorio). */
  descartadas: Deteccion[];
  pistas: readonly Pista[];
  /** Cómo va el fondo; null si no se usa fondo. */
  fondo: { estado: EstadoFondo; progreso: number } | null;
  /** El perfil en píxeles con el que se midió este cuadro; null sin perfil. */
  perfil: PerfilPx | null;
  /** Qué tan rápido pasan los alevinos frente al límite de la franja; null si nada se mueve. */
  flujo: Flujo | null;
}

const MUESTRAS_PARA_AREA = 60;
/** Cuadros sin moverse para considerar quieta una mancha (una hoja pegada, una marca). */
const CUADROS_QUIETO = 15;

function estaQuieta(pista: Pista): boolean {
  const r = pista.recorrido;
  if (pista.edad < CUADROS_QUIETO || r.length < CUADROS_QUIETO) return false;
  return Math.max(...r) - Math.min(...r) <= 2;
}
const MUESTRAS_PARA_LOTE = 40;

/** Motor de conteo clásico: umbral + seguimiento + cruce de línea. No necesita entrenamiento. */
export class MotorConteo {
  private rastreador: Rastreador;
  private total = 0;
  private muestras: Deteccion[] = [];
  /** Área típica aprendida del lote. Se guarda aparte para que cambiar el detector no la borre. */
  private areaAprendida: number | null = null;
  private fondo: ModeloFondo | null;
  private mascara = new Uint8Array(0);
  private temporal = new Uint8Array(0);
  /** La máscara antes del cierre: con ella se miden las manchas (ver encontrarManchas). */
  private original = new Uint8Array(0);
  /** Medidas de alevinos sueltos para aprender el lote cuando no viene de la Prueba de 100. */
  private muestrasLote: Medidas[] = [];
  private loteAprendido: EstadisticasLote | null = null;
  private medidorFlujo = new MedidorFlujo();
  /** Momentos (ms) de los últimos cuadros, para saber cuántos por segundo se procesan. */
  private tiempos: number[] = [];
  /** Largo del canal sobre el eje del flujo en el último cuadro (para no pasarse con la franja). */
  private largoEje = 0;

  constructor(private config: ConfiguracionMotor) {
    this.rastreador = new Rastreador(config.rastreador);
    this.fondo = config.fondo ? new ModeloFondo(config.fondo) : null;
  }

  /** `tiempo`: momento del cuadro en ms (para medir cuadros por segundo y la velocidad en px/s). */
  procesar(cuadro: CuadroGris, tiempo?: number): ResultadoCuadro {
    const estadoFondo = () => (this.fondo ? { estado: this.fondo.estado, progreso: this.fondo.progreso } : null);
    if (tiempo !== undefined) {
      this.tiempos.push(tiempo);
      if (this.tiempos.length > 30) this.tiempos.shift();
    }
    this.largoEje = this.config.sentido === "abajo" || this.config.sentido === "arriba" ? cuadro.alto : cuadro.ancho;

    // Mientras aprende el canal vacío no se cuenta nada.
    if (this.fondo && !this.fondo.listo && this.fondo.estado !== "sin-fondo") {
      this.fondo.aprender(cuadro);
      return { total: this.total, sumadosEnEsteCuadro: 0, detecciones: [], descartadas: [], pistas: this.rastreador.activas, fondo: estadoFondo(), perfil: this.perfilPx(), flujo: null };
    }

    const { detecciones, descartadas } = this.config.perfil || this.fondo ? this.detectar(cuadro) : this.detectarComoAntes(cuadro);

    const { sentido } = this.config;
    const franja = this.franja;
    let sumados = 0;
    const quietas = new Set<number>();
    for (const { pista, deteccion } of this.rastreador.actualizar(detecciones)) {
      pista.edad++;
      pista.recorrido.push(enFlujo(pista, sentido));
      if (pista.recorrido.length > CUADROS_QUIETO) pista.recorrido.shift();
      // Una pista nueva que nace dentro de la franja se supone venida de arriba (no se vio antes).
      if (pista.ladoExterior === null) pista.ladoExterior = ladoDe(pista, franja, sentido) === "despues" ? "despues" : "antes";
      if (estaQuieta(pista)) {
        quietas.add(deteccion);
        continue;
      }
      sumados += actualizarConteo(pista, franja, sentido);
    }
    this.total += sumados;
    const flujo = this.medidorFlujo.observar(this.rastreador.activas, franja.fin - franja.inicio, this.cuadrosPorSegundo);
    return {
      flujo,
      total: this.total,
      sumadosEnEsteCuadro: sumados,
      detecciones: detecciones.filter((_, i) => !quietas.has(i)),
      descartadas: [...descartadas, ...detecciones.filter((_, i) => quietas.has(i)).map((d) => ({ ...d, motivo: "quieto" as const }))],
      pistas: this.rastreador.activas,
      fondo: estadoFondo(),
      perfil: this.perfilPx(),
    };
  }

  /** Sin perfil ni fondo: umbral fijo y cada mancha cuenta por su área (como la primera versión). */
  private detectarComoAntes(cuadro: CuadroGris) {
    const detecciones = detectarManchas(cuadro, { ...this.config.detector, areaTipica: this.areaTipica });
    this.aprenderArea(detecciones);
    return { detecciones, descartadas: [] as Deteccion[] };
  }

  /** Con fondo y/o perfil: máscara contra el fondo, cierre, medidas y filtro de forma. */
  private detectar(cuadro: CuadroGris): { detecciones: Deteccion[]; descartadas: Deteccion[] } {
    const { ancho, alto, datos } = cuadro;
    const n = ancho * alto;
    if (this.mascara.length !== n) {
      this.mascara = new Uint8Array(n);
      this.temporal = new Uint8Array(n);
    }
    if (this.fondo?.listo) {
      this.fondo.primerPlano(cuadro, this.mascara);
    } else {
      const umbral = this.config.detector.umbral;
      for (let i = 0; i < n; i++) this.mascara[i] = datos[i]! < umbral ? 1 : 0;
    }

    const perfil = this.perfilPx();
    let original: Uint8Array | undefined;
    if (perfil && perfil.radioCierre > 0) {
      if (this.original.length !== n) this.original = new Uint8Array(n);
      this.original.set(this.mascara);
      original = this.original;
      cerrar(this.mascara, ancho, alto, perfil.radioCierre, this.temporal);
    }
    const encontradas = encontrarManchas(this.mascara, ancho, alto, perfil ? 3 : this.config.detector.areaMinima, this.config.detector.zona, original);
    const manchas = perfil ? unirPedazos(encontradas, perfil) : encontradas;

    const detecciones: Deteccion[] = [];
    const descartadas: Deteccion[] = [];
    for (const m of manchas) {
      const d = aDeteccion(m, perfil?.largoTipico ? pesoPorForma(m, perfil) : pesoDeMancha(m.area, this.areaTipica));
      if (!perfil) {
        detecciones.push(d);
        continue;
      }
      const c = clasificar(m, perfil);
      if (c.acepta) {
        detecciones.push(d);
        this.aprenderLote(m, perfil);
      } else if (m.area >= perfil.areaMinima) {
        descartadas.push({ ...d, motivo: c.motivo });
      }
    }
    if (!perfil) this.aprenderArea(detecciones);
    return { detecciones, descartadas };
  }

  /**
   * La franja de conteo; sin franja, una línea en la posición de siempre. Con el perfil, la escala
   * y los cuadros por segundo, se ensancha (desde su centro) lo necesario para que un alevino a la
   * velocidad máxima del perfil se vea al menos 3 cuadros dentro de ella.
   */
  get franja(): Franja {
    const base = this.config.franja ?? { inicio: this.config.posicionLinea, fin: this.config.posicionLinea };
    const { perfil, pxPorCm } = this.config;
    const cps = this.cuadrosPorSegundo;
    if (!this.config.franja || !perfil || !pxPorCm || !cps) return base;
    const minimo = Math.min((3 * perfil.velocidadCmS.maxima * pxPorCm) / cps, this.largoEje * 0.35);
    const ancho = base.fin - base.inicio;
    if (ancho >= minimo) return base;
    const centro = (base.inicio + base.fin) / 2;
    return { inicio: centro - minimo / 2, fin: centro + minimo / 2 };
  }

  /** Cuadros por segundo que está procesando (de los tiempos que llegan con cada cuadro). */
  get cuadrosPorSegundo(): number | null {
    const t = this.tiempos;
    if (t.length < 5) return null;
    const lapso = t[t.length - 1]! - t[0]!;
    return lapso > 0 ? ((t.length - 1) * 1000) / lapso : null;
  }

  /** El perfil en píxeles con lo mejor que se sepa del tamaño: Prueba de 100, escala o lo aprendido. */
  perfilPx(): PerfilPx | null {
    const { perfil, lote, pxPorCm, detector } = this.config;
    if (!perfil) return null;
    return perfilEnPixeles(perfil, { lote: lote ?? (pxPorCm ? null : this.loteAprendido), pxPorCm, areaMinima: detector.areaMinima });
  }

  /** Sin Prueba de 100 ni marcas: aprende el tamaño de los primeros alevinos sueltos que ve. */
  private aprenderLote(m: Medidas, perfil: PerfilPx) {
    if (this.config.lote || this.loteAprendido || perfil.origen !== "amplio") return;
    const suelto = m.cuerpos === 1 && m.relacion >= perfil.relacionArriba[0] * 0.8 && m.solidez >= perfil.solidezMinima;
    if (!suelto) return;
    this.muestrasLote.push(m);
    if (this.muestrasLote.length >= MUESTRAS_PARA_LOTE) {
      this.loteAprendido = estadisticasDe(this.muestrasLote);
      this.muestrasLote = [];
    }
  }

  /** Vuelve el contador a cero (nueva bolsa) sin olvidar lo aprendido del lote. */
  reiniciarConteo() {
    this.total = 0;
    this.rastreador.reiniciar();
    this.medidorFlujo.reiniciar();
  }

  actualizarConfiguracion(parcial: Partial<ConfiguracionMotor>) {
    this.config = { ...this.config, ...parcial };
    if (parcial.rastreador) this.rastreador = new Rastreador(this.config.rastreador);
    if ("fondo" in parcial) this.fondo = this.config.fondo ? new ModeloFondo(this.config.fondo) : null;
  }

  /** El área fijada en la configuración manda; si no hay, la del lote o la aprendida. */
  get areaTipica(): number | null {
    return this.config.detector.areaTipica ?? this.config.lote?.area.mediana ?? this.loteAprendido?.area.mediana ?? this.areaAprendida;
  }

  get estadisticasAprendidas(): EstadisticasLote | null {
    return this.loteAprendido;
  }

  /** Para un lote nuevo: olvida el tamaño aprendido y lo vuelve a aprender. */
  olvidarAreaTipica() {
    this.areaAprendida = null;
    this.muestras = [];
    this.loteAprendido = null;
    this.muestrasLote = [];
  }

  /** Vuelve a mirar el canal vacío (se movió el celular o cambió la luz). */
  reiniciarFondo() {
    this.fondo?.reiniciar();
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

function aDeteccion(m: Medidas, peso: number): Deteccion {
  return {
    x: m.x,
    y: m.y,
    area: m.area,
    peso,
    largo: m.largo,
    ancho: m.ancho,
    angulo: m.angulo,
    relacion: m.relacion,
    solidez: m.solidez,
    cuerpos: m.cuerpos,
  };
}

/** Convierte RGBA (de un canvas) a gris con los pesos habituales de luminancia. */
export function aGris(rgba: Uint8ClampedArray, ancho: number, alto: number, destino?: Uint8Array): CuadroGris {
  const datos = destino ?? new Uint8Array(ancho * alto);
  for (let i = 0, j = 0; j < datos.length; i += 4, j++) {
    datos[j] = (rgba[i]! * 77 + rgba[i + 1]! * 150 + rgba[i + 2]! * 29) >> 8;
  }
  return { ancho, alto, datos };
}
