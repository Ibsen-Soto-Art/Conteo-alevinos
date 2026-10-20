import { areaMediana, detectarManchas, pesoDeMancha, type OpcionesDetector } from "./detector";
import { ModeloFondo, type EstadoFondo, type OpcionesFondo } from "./fondo";
import { clasificar, estadisticasDe, mediana, medida, perfilEnPixeles, pesoPorForma, unirPedazos, type EstadisticasLote, type Medida, type PerfilForma, type PerfilPx } from "./forma";
import { MedidorFlujo, type Flujo } from "./flujo";
import { CUADROS_PERSISTENCIA, actualizarConteo, avanzaConElFlujo, enFlujo, ladoDe, type Franja } from "./franja";
import { encontrarManchas, type Medidas } from "./manchas";
import { cerrar } from "./morfologia";
import { Rastreador, type OpcionesRastreador } from "./rastreador";
import type { CuadroGris, Deteccion, EventoConteo, Pista, SentidoFlujo } from "./tipos";

export interface ConfiguracionMotor {
  detector: OpcionesDetector;
  rastreador: OpcionesRastreador;
  /** Posición de la línea de conteo, en píxeles sobre el eje del flujo (si no hay franja). */
  posicionLinea: number;
  /** Franja de conteo (dos bordes, en píxeles sobre el eje del flujo). Sin franja, la línea. */
  franja?: Franja | null;
  sentido: SentidoFlujo;
  /**
   * Averiguar el sentido del agua: mientras no lo sabe cuenta a la vez con `sentido` y con el
   * contrario (con la franja a la misma distancia de su salida) y se queda con el sentido hacia
   * el que avanzan las manchas. Así no importa cómo esté montado el celular.
   */
  sentidoAutomatico?: boolean;
  /**
   * `sentido` es el que se decidió en el conteo anterior (guardado en el teléfono): se confirma con
   * la mitad del avance; corregirlo pide lo mismo de siempre.
   */
  sentidoConocido?: boolean;
  /** Si es verdadero y no hay área típica, la aprende de los primeros cuadros. */
  aprenderAreaTipica: boolean;
  /**
   * Perfil de la especie y tamaño (packages/domain/src/perfiles.ts). Con perfil, cada mancha se
   * mide y se descarta lo que no tiene forma de alevino; sin perfil, se cuenta toda mancha oscura.
   */
  perfil?: PerfilForma | null;
  /** Aprender el fondo del canal mientras cuenta (se cuenta con el umbral fijo hasta tenerlo). */
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
  /** Sentido del agua con que se cuenta (el elegido, o el de partida mientras lo averigua). */
  sentido: SentidoFlujo;
  /** Con sentido automático: si ya sabe hacia dónde corre el agua. */
  sentidoDecidido: boolean;
  /** Cada pista que cambió un total en este cuadro (de los dos sentidos mientras averigua). */
  eventos: EventoConteo[];
  /**
   * Con el sentido fijo: las manchas avanzan al revés de lo ajustado (el celular está montado al
   * revés). La franja no se mueve; la app avisa para que lo giren.
   */
  aguaAlReves: boolean;
}

const MUESTRAS_PARA_AREA = 60;
/** Cuadros sin moverse para considerar quieta una mancha (una hoja pegada, una marca). */
const CUADROS_QUIETO = 15;

function estaQuieta(pista: Pista): boolean {
  const r = pista.recorrido;
  if (pista.edad < CUADROS_QUIETO || r.length < CUADROS_QUIETO) return false;
  return Math.max(...r) - Math.min(...r) <= 2;
}
/**
 * Alevinos distintos (uno por pista contada) para aprender el tamaño del lote sin marcas ni Prueba
 * de 100. Antes eran 40 detecciones, que salían todas del primer objeto (se ve en decenas de
 * cuadros): con tallas disparejas, los más chicos que él se descartaban por tamaño.
 */
const PISTAS_PARA_LOTE = 15;
/** Alevinos sueltos contados para saber el área de uno y pesar por área las manchas redondas. */
const SUELTOS_PARA_AREA = 10;

export const SENTIDO_CONTRARIO: Record<SentidoFlujo, SentidoFlujo> = { abajo: "arriba", arriba: "abajo", derecha: "izquierda", izquierda: "derecha" };
/** Cuánto deben avanzar las manchas en total (en largos del canal) para decidir el sentido. */
export const AVANCE_PARA_DECIDIR = 1.5;
/** Lo mismo para confirmar el sentido del conteo anterior. */
export const AVANCE_PARA_CONFIRMAR = 0.75;
/**
 * Con el sentido fijo, lo que se recuerda del avance de cada cuadro al siguiente (se olvida en
 * unos 8 s): así el aviso de «agua al revés» se apaga solo si giran el celular.
 */
const MEMORIA_AVANCE = 0.997;

type MedidaContado = { largo: number; ancho: number; area: number; relacion: number };

/** Un conteo con un sentido del agua: su rastreador, su total y lo medido de lo que contó. */
interface Conteo {
  sentido: SentidoFlujo;
  rastreador: Rastreador;
  total: number;
  /** Una medida (mediana de sus cuadros) por cada alevino suelto contado: lo que aprende la Prueba de 100. */
  medidas: MedidaContado[];
  /** Detecciones quietas en el último cuadro (índices en la lista de manchas). */
  quietas: Set<number>;
}

/** Motor de conteo clásico: umbral + seguimiento + cruce de línea. No necesita entrenamiento. */
export class MotorConteo {
  /** Uno solo; dos (un sentido y el contrario) mientras averigua el sentido. */
  private conteos: Conteo[];
  /** Lo que avanzaron las manchas con `config.sentido` (negativo: al revés), para decidir. */
  private avance = 0;
  /** Con el sentido fijo: avance reciente de las manchas (negativo: van al revés) y el aviso. */
  private vigilancia = 0;
  private alReves = false;
  /** El total que se informó en el último cuadro (de él salen los sumados). */
  private totalInformado = 0;
  private muestras: Deteccion[] = [];
  /** Área típica aprendida del lote. Se guarda aparte para que cambiar el detector no la borre. */
  private areaAprendida: number | null = null;
  private fondo: ModeloFondo | null;
  private mascara = new Uint8Array(0);
  private temporal = new Uint8Array(0);
  /** La máscara antes del cierre: con ella se miden las manchas (ver encontrarManchas). */
  private original = new Uint8Array(0);
  private loteAprendido: EstadisticasLote | null = null;
  private medidorFlujo = new MedidorFlujo();
  /** Cuadros procesados y eventos del cuadro actual (registro de conteo). */
  private numeroCuadro = 0;
  private tiempoCuadro: number | null = null;
  private eventos: EventoConteo[] = [];
  /** Momentos (ms) de los últimos cuadros, para saber cuántos por segundo se procesan. */
  private tiempos: number[] = [];
  /** Largo del canal sobre el eje del flujo en el último cuadro (para no pasarse con la franja). */
  private largoEje = 0;

  constructor(private config: ConfiguracionMotor) {
    this.conteos = this.crearConteos();
    this.fondo = config.fondo ? new ModeloFondo(config.fondo) : null;
  }

  private crearConteos(): Conteo[] {
    const nuevo = (sentido: SentidoFlujo): Conteo => ({ sentido, rastreador: new Rastreador(this.config.rastreador), total: 0, medidas: [], quietas: new Set() });
    const { sentido, sentidoAutomatico } = this.config;
    this.avance = 0;
    this.totalInformado = 0;
    return sentidoAutomatico ? [nuevo(sentido), nuevo(SENTIDO_CONTRARIO[sentido])] : [nuevo(sentido)];
  }

  /**
   * El conteo que se muestra (franja, pistas, sentido): el elegido, o el de partida mientras no se
   * sabe el sentido. Su total no: mientras averigua se informa el menor de los dos (ver `totalMostrado`).
   */
  private get mostrado(): Conteo {
    return this.conteos[0]!;
  }

  /** Mientras averigua el sentido, el menor de los dos conteos: el número nunca se pasa. */
  private get totalMostrado(): number {
    return Math.min(...this.conteos.map((c) => c.total));
  }

  /** El que va ganando: de él salen las medidas de lo contado (Prueba de 100). */
  private get lider(): Conteo {
    return this.conteos.reduce((a, b) => (b.total > a.total ? b : a));
  }

  /** Sentido del agua con que se cuenta. */
  get sentido(): SentidoFlujo {
    return this.mostrado.sentido;
  }

  get sentidoDecidido(): boolean {
    return this.conteos.length === 1;
  }

  /** `tiempo`: momento del cuadro en ms (para medir cuadros por segundo y la velocidad en px/s). */
  procesar(cuadro: CuadroGris, tiempo?: number): ResultadoCuadro {
    const estadoFondo = () => (this.fondo ? { estado: this.fondo.estado, progreso: this.fondo.progreso } : null);
    this.numeroCuadro++;
    this.tiempoCuadro = tiempo ?? null;
    this.eventos = [];
    if (tiempo !== undefined) {
      // El tiempo volvió atrás (un video que se repite desde el inicio): lo medido antes no vale.
      if (this.tiempos.length > 0 && tiempo <= this.tiempos[this.tiempos.length - 1]!) this.tiempos = [];
      this.tiempos.push(tiempo);
      if (this.tiempos.length > 30) this.tiempos.shift();
    }
    this.largoEje = this.config.sentido === "abajo" || this.config.sentido === "arriba" ? cuadro.alto : cuadro.ancho;

    // Se cuenta desde el primer cuadro: mientras aprende el fondo, con el umbral fijo.
    if (this.fondo && !this.fondo.listo) this.fondo.aprender(cuadro);

    const { detecciones, descartadas } = this.config.perfil || this.fondo ? this.detectar(cuadro) : this.detectarComoAntes(cuadro);

    // Lo descartado también se sigue: así algo que a veces parece alevino conserva su historia.
    const todas = [...detecciones, ...descartadas];
    for (const c of this.conteos) this.contarCon(c, todas);
    this.decidirSentido();
    this.vigilarSentido();

    const elegido = this.mostrado;
    const { quietas } = elegido;
    const total = this.totalMostrado;
    const sumados = total - this.totalInformado;
    this.totalInformado = total;
    const franja = this.franja;
    const flujo = this.medidorFlujo.observar(elegido.rastreador.activas, franja.fin - franja.inicio, this.cuadrosPorSegundo);
    return {
      flujo,
      total,
      sumadosEnEsteCuadro: sumados,
      detecciones: detecciones.filter((_, i) => !quietas.has(i)),
      descartadas: [
        ...descartadas.filter((_, i) => !quietas.has(detecciones.length + i)),
        ...todas.filter((_, i) => quietas.has(i)).map((d) => ({ ...d, motivo: "quieto" as const })),
      ],
      pistas: elegido.rastreador.activas,
      fondo: estadoFondo(),
      perfil: this.perfilPx(),
      sentido: elegido.sentido,
      sentidoDecidido: this.sentidoDecidido,
      eventos: this.eventos,
      aguaAlReves: this.alReves,
    };
  }

  /** Sigue las manchas con el rastreador de un conteo y cuenta lo que cruza su franja. */
  private contarCon(c: Conteo, todas: Deteccion[]) {
    const franja = this.franjaDe(c.sentido);
    c.quietas = new Set();
    for (const { pista, deteccion, portador, separadaDe } of c.rastreador.actualizar(todas)) {
      pista.edad++;
      pista.recorrido.push(enFlujo(pista, c.sentido));
      if (pista.recorrido.length > CUADROS_QUIETO) pista.recorrido.shift();
      // Nació de una mancha que se partió: hereda cómo iba esa mancha frente a la franja.
      if (separadaDe) c.total += heredarDeLaMadre(pista, separadaDe, this.esOtroPez(pista, separadaDe));
      // Una pista nueva que nace dentro de la franja se supone venida de arriba (no se vio antes).
      if (pista.ladoExterior === null) {
        const lado = ladoDe(pista, franja, c.sentido);
        pista.nacioEnFranja = lado === "dentro";
        pista.ladoExterior = lado === "despues" ? "despues" : "antes";
      }
      if (estaQuieta(pista)) {
        if (!portador) c.quietas.add(deteccion);
        continue;
      }
      // Pegada a otra: cruza con ella y suma si la que la lleva es confiable.
      const cambio = actualizarConteo(pista, franja, c.sentido, portador ? avanzaConElFlujo(portador) : avanzaConElFlujo(pista));
      c.total += cambio;
      if (cambio > 0) {
        medirContado(pista, c.medidas);
        this.aprenderLote(c.medidas);
      }
      if (cambio !== 0) this.eventos.push(this.evento(pista, cambio, c, portador));
    }
  }

  /**
   * Lo que se separó de una mancha, ¿es otro pez o un pedazo? Otro pez tiene forma de alevino
   * entero (alargado) y mide al menos el 60 % de lo que quedó de la mancha; un pedazo (la cola
   * que se corta en el borde del recorte, una aleta) es corto y rechoncho.
   */
  private esOtroPez(hija: Pista, madre: Pista): boolean {
    const [h] = hija.medidas;
    // Sin perfil (o sin medidas) no se sabe la forma: otro pez si tiene al menos la mitad del área.
    if (!this.config.perfil || !h || madre.medidas.length === 0) return hija.areaUltima >= 0.5 * madre.areaUltima;
    // El mismo límite de «alevino entero» que usa unirPedazos sin tamaño, y comparada con lo que
    // quedó de la madre (no con su promedio: si iban dos pegados, su promedio es el de los dos).
    const quedo = madre.medidas[madre.medidas.length - 1]!;
    return h.relacion >= this.config.perfil.relacionArriba[0] * 0.7 && h.largo >= 0.6 * quedo.largo;
  }

  private evento(pista: Pista, cambio: number, c: Conteo, portador?: Pista): EventoConteo {
    const de = (k: "largo" | "ancho" | "area") => (pista.medidas.length ? mediana(pista.medidas.map((m) => m[k])) : null);
    return {
      cuadro: this.numeroCuadro,
      tiempo: this.tiempoCuadro,
      id: pista.id,
      x: pista.x,
      y: pista.y,
      cambio,
      peso: pista.pesoContado,
      pesos: [...pista.pesos],
      largo: de("largo"),
      ancho: de("ancho"),
      area: de("area"),
      cuadrosSeguidos: pista.edad,
      sentido: c.sentido,
      decidido: this.conteos.length === 1,
      unida: pista.unida,
      nacioEnFranja: pista.nacioEnFranja,
      recuperada: pista.recuperada,
      separadaDe: pista.separadaDe,
      llevadaPor: portador?.id ?? null,
    };
  }

  /**
   * Con sentido automático: suma lo que avanzó cada mancha que se mueve (sobre el eje del canal) y,
   * cuando entre todas avanzaron 1,5 largos del canal hacia un lado, se queda con ese conteo. Si el
   * sentido de partida viene del conteo anterior, para confirmarlo basta la mitad.
   */
  private decidirSentido() {
    if (this.conteos.length < 2) return;
    const [principal] = this.conteos;
    for (const p of principal!.rastreador.activas) {
      const r = p.recorrido;
      if (p.perdida > 0 || p.edad < CUADROS_PERSISTENCIA || r.length < 2 || estaQuieta(p)) continue;
      const paso = r[r.length - 1]! - r[r.length - 2]!;
      if (Math.abs(paso) < this.config.rastreador.distanciaMaxima) this.avance += paso;
    }
    const confirmar = (this.config.sentidoConocido ? AVANCE_PARA_CONFIRMAR : AVANCE_PARA_DECIDIR) * this.largoEje;
    if (this.avance >= confirmar) this.conteos = [this.conteos[0]!];
    else if (this.avance <= -AVANCE_PARA_DECIDIR * this.largoEje) this.conteos = [this.conteos[1]!];
  }

  /**
   * Con el sentido fijo: suma (con memoria corta) lo que avanzan las manchas que se mueven. Si entre
   * todas retrocedieron 1,5 largos del canal, el agua corre al revés de lo ajustado; el aviso se
   * apaga cuando vuelven a avanzar.
   */
  private vigilarSentido() {
    if (this.conteos.length !== 1 || this.config.sentidoAutomatico) return;
    this.vigilancia *= MEMORIA_AVANCE;
    for (const p of this.conteos[0]!.rastreador.activas) {
      const r = p.recorrido;
      if (p.perdida > 0 || p.edad < CUADROS_PERSISTENCIA || r.length < 2 || estaQuieta(p)) continue;
      const paso = r[r.length - 1]! - r[r.length - 2]!;
      if (Math.abs(paso) < this.config.rastreador.distanciaMaxima) this.vigilancia += paso;
    }
    if (this.vigilancia <= -AVANCE_PARA_DECIDIR * this.largoEje) this.alReves = true;
    else if (this.vigilancia >= 0) this.alReves = false;
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
      // Con perfil, el peso sale siempre de la forma (sin tamaño: lomos y área de uno vista).
      const d = aDeteccion(m, perfil ? pesoPorForma(m, perfil) : pesoDeMancha(m.area, this.areaTipica));
      if (!perfil) {
        detecciones.push(d);
        continue;
      }
      const c = clasificar(m, perfil);
      if (c.acepta) {
        detecciones.push(d);
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
    return this.franjaDe(this.mostrado.sentido);
  }

  /** La franja para un sentido: el contrario la tiene en espejo, a la misma distancia de su salida. */
  private franjaDe(sentido: SentidoFlujo): Franja {
    let base = this.config.franja ?? { inicio: this.config.posicionLinea, fin: this.config.posicionLinea };
    if (sentido !== this.config.sentido) base = { inicio: this.largoEje - base.fin, fin: this.largoEje - base.inicio };
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
    return {
      ...perfilEnPixeles(perfil, { lote: lote ?? (pxPorCm ? null : this.loteAprendido), pxPorCm, areaMinima: detector.areaMinima }),
      ...this.unoVisto(),
    };
  }

  /**
   * Área mediana y largo (mediana y dispersión) de los alevinos sueltos ya contados (desde
   * arriba), si son al menos SUELTOS_PARA_AREA: «uno» medido en este canal y con estos objetos.
   */
  private unoVisto(): { areaUnoVista: number | null; largoUnoVisto: Medida | null } {
    const minimo = (this.config.perfil?.relacionArriba[0] ?? 0) * 0.7;
    const sueltos = this.lider.medidas.filter((m) => m.relacion >= minimo);
    if (sueltos.length < SUELTOS_PARA_AREA) return { areaUnoVista: null, largoUnoVisto: null };
    return { areaUnoVista: mediana(sueltos.map((m) => m.area)), largoUnoVisto: medida(sueltos.map((m) => m.largo)) };
  }

  /**
   * Sin Prueba de 100 ni marcas: aprende el tamaño del lote de los primeros alevinos sueltos que
   * cuenta, uno por pista (la mediana de sus medidas), cuando ya son PISTAS_PARA_LOTE distintos.
   */
  private aprenderLote(medidas: MedidaContado[]) {
    if (this.config.lote || this.config.pxPorCm || this.loteAprendido || !this.config.perfil) return;
    const [minimo] = this.config.perfil.relacionArriba;
    // Desde arriba y solos: los de lado (más anchos) no dicen el tamaño de uno visto desde arriba.
    const sueltos = medidas.filter((m) => m.relacion >= minimo * 0.8);
    if (sueltos.length >= PISTAS_PARA_LOTE) this.loteAprendido = estadisticasDe(sueltos);
  }

  /** Vuelve el contador a cero (nueva bolsa) sin olvidar lo aprendido del lote. */
  reiniciarConteo() {
    for (const c of this.conteos) {
      c.total = 0;
      c.rastreador.reiniciar();
      c.medidas = [];
    }
    this.totalInformado = 0;
    this.medidorFlujo.reiniciar();
  }

  /**
   * Medidas de los alevinos sueltos contados desde el último «a cero»: mediana y dispersión de
   * largo, ancho, área y relación largo/ancho. Es lo que la Prueba de 100 aprende del lote.
   */
  get estadisticasDelConteo(): EstadisticasLote | null {
    const { medidas } = this.lider;
    return medidas.length >= 2 ? estadisticasDe(medidas) : null;
  }

  actualizarConfiguracion(parcial: Partial<ConfiguracionMotor>) {
    const antes = this.config;
    this.config = { ...this.config, ...parcial };
    const cambiaSentido =
      antes.sentido !== this.config.sentido ||
      Boolean(antes.sentidoAutomatico) !== Boolean(this.config.sentidoAutomatico) ||
      Boolean(antes.sentidoConocido) !== Boolean(this.config.sentidoConocido);
    if (parcial.rastreador || cambiaSentido) this.conteos = this.crearConteos();
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
  }

  /**
   * Empieza a mirar el canal otra vez (pantalla nueva, se movió el celular): vuelve a aprender el
   * fondo y, con sentido automático, vuelve a averiguar el sentido. El total vuelve a 0.
   */
  reiniciarFondo() {
    this.fondo?.reiniciar();
    this.tiempos = [];
    this.vigilancia = 0;
    this.alReves = false;
    if (this.config.sentidoAutomatico) this.conteos = this.crearConteos();
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

/**
 * Una pista nueva salió de la mancha de `madre` (se partió). Devuelve cuánto cambia el total.
 * - Un pedazo nunca cuenta solo: queda como si ya hubiera pasado la franja, sin saldo.
 * - Otro pez hereda el lado de la franja y el saldo de la madre; si la madre ya estaba contada,
 *   se le pasa parte de su peso: entre las dos suman lo mismo, o lo que faltaba si la mancha
 *   pegada valía 1 y eran dos peces.
 */
function heredarDeLaMadre(hija: Pista, madre: Pista, otroPez: boolean): number {
  if (!otroPez) {
    hija.ladoExterior = "despues";
    hija.saldo = 0;
    return 0;
  }
  hija.ladoExterior = madre.ladoExterior;
  hija.saldo = madre.saldo;
  if (madre.aporte <= 0) return 0;
  const k = Math.max(1, hija.peso);
  const antes = madre.aporte;
  const vueltas = Math.max(0, madre.saldo);
  madre.pesoContado = Math.max(1, madre.pesoContado - k);
  madre.aporte = vueltas * madre.pesoContado;
  hija.pesoContado = k;
  hija.aporte = vueltas * k;
  hija.contada = hija.aporte > 0;
  return madre.aporte + hija.aporte - antes;
}

/** Un alevino suelto (peso 1) que se acaba de contar: su medida es la mediana de sus cuadros. */
function medirContado(pista: Pista, medidas: MedidaContado[]) {
  if (pista.medida || pista.pesoContado !== 1 || pista.medidas.length === 0) return;
  pista.medida = true;
  const de = (k: keyof MedidaContado) => mediana(pista.medidas.map((m) => m[k]));
  medidas.push({ largo: de("largo"), ancho: de("ancho"), area: de("area"), relacion: de("relacion") });
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
    pedazos: m.pedazos,
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
