import type { Deteccion, Pista } from "./tipos";

export interface OpcionesRastreador {
  /** Distancia máxima (px) entre la posición predicha de un alevino y su detección. */
  distanciaMaxima: number;
  /** Cuadros que se espera a una pista perdida antes de borrarla. */
  cuadrosDeGracia: number;
}

/** Resultado de un cuadro para una pista: su posición anterior y la detección que le tocó. */
export interface Actualizacion {
  pista: Pista;
  antes: { x: number; y: number } | null;
  deteccion: number;
  /** La pista va pegada a otra (una sola mancha): `portador` es la que tiene la detección. */
  portador?: Pista;
  /** La pista nació de una mancha que se partió: `separadaDe` es la pista de esa mancha. */
  separadaDe?: Pista;
}

/** Cuadros que se recuerda una pista perdida, por si reaparece (~1 s). */
const CUADROS_MEMORIA = 30;
/** Cuadros que una pista puede ir pegada a otra (~5 s). */
const CUADROS_LLEVADA = 150;
/** Si la mancha de una pista crece así de golpe, se le pegó otra. */
const CRECE_SI_SE_PEGA = 1.3;
/** Si se achica así de golpe, se le separó un pedazo (u otro pez). */
const ACHICA_SI_SE_SEPARA = 0.75;
/** Cuadros seguidos con forma de alevino para tomar en serio una pista que desaparece. */
const CUADROS_PARA_LLEVAR = 3;

interface Llevada {
  pista: Pista;
  portador: Pista;
  /** Dónde va respecto a la que la lleva (se acerca a 0: van en la misma mancha). */
  dx: number;
  dy: number;
  desde: number;
}

/**
 * Sigue cada mancha entre cuadros emparejando por cercanía, para que un mismo
 * alevino no se cuente dos veces. Cada pista predice su siguiente posición con la
 * velocidad del último cuadro, así un alevino rápido no se pierde. Si una pista se pierde
 * (una burbuja la tapa, la luz parpadea) y algo aparece donde debía estar, hereda su historia.
 *
 * Pegados: si una pista desaparece justo donde la mancha de al lado crece de golpe, no se pierde:
 * va «llevada» por esa mancha (se mueve con ella y cruza la franja con ella) y, cuando se
 * separan, recupera su identidad. Si en cambio aparece una mancha nueva justo donde otra se
 * achicó de golpe, la nueva se marca como separada de aquella (el motor reparte su conteo).
 */
export class Rastreador {
  private pistas: Pista[] = [];
  private perdidas: { pista: Pista; vistoEn: number }[] = [];
  private llevadas: Llevada[] = [];
  private cuadro = 0;
  private siguienteId = 1;

  constructor(private readonly op: OpcionesRastreador) {}

  /** Devuelve, por cada pista vista en este cuadro, su posición anterior y su detección. */
  actualizar(detecciones: Deteccion[]): Actualizacion[] {
    this.cuadro++;
    // Cómo estaba cada pista antes de este cuadro (para ver si su mancha creció o se achicó).
    const previo = new Map(this.pistas.map((p) => [p, { x: p.x, y: p.y, area: p.areaUltima, seguidos: p.seguidos, prediccion: predecir(p) }]));
    const pares: { d2: number; p: number; d: number }[] = [];
    const max2 = this.op.distanciaMaxima ** 2;
    this.pistas.forEach((pista, p) => {
      const { x, y } = predecir(pista);
      detecciones.forEach((det, d) => {
        const d2 = (x - det.x) ** 2 + (y - det.y) ** 2;
        if (d2 <= max2) pares.push({ d2, p, d });
      });
    });
    pares.sort((a, b) => a.d2 - b.d2);

    const detDePista = new Map<number, number>();
    const detUsada = new Set<number>();
    const deteccionDe = new Map<Pista, number>();
    const resultado: Actualizacion[] = [];

    for (const { p, d } of pares) {
      if (detDePista.has(p) || detUsada.has(d)) continue;
      detDePista.set(p, d);
      detUsada.add(d);
      const pista = this.pistas[p]!;
      deteccionDe.set(pista, d);
      // La que lleva a otras cuenta solo por ella: las llevadas cuentan por sí mismas.
      const llevando = this.llevadas.filter((l) => l.portador === pista).length;
      resultado.push({ pista, antes: mover(pista, detecciones[d]!, pista.perdida + 1, llevando), deteccion: d });
    }

    // Las que no se vieron: ¿se pegaron a la mancha de al lado, que creció de golpe?
    this.pistas.forEach((pista, p) => {
      if (detDePista.has(p)) return;
      const antes = previo.get(pista)!;
      if (pista.perdida === 0 && antes.seguidos >= CUADROS_PARA_LLEVAR) {
        const portador = this.buscarPortador(antes.prediccion, previo, deteccionDe, detecciones);
        if (portador) {
          this.llevadas.push({ pista, portador, dx: pista.x - portador.x, dy: pista.y - portador.y, desde: this.cuadro });
          pista.llevadaPor = portador.id;
          pista.perdida = -1; // marca: sale de la lista de pistas sin pasar a perdidas
          return;
        }
      }
      pista.perdida++;
      pista.seguidos = 0;
    });
    this.pistas = this.pistas.filter((p) => p.perdida !== -1);

    // Las llevadas se mueven con su portador (y cruzan la franja con él).
    this.llevadas = this.llevadas.filter((l) => {
      const d = deteccionDe.get(l.portador);
      if (d === undefined || this.cuadro - l.desde > CUADROS_LLEVADA) {
        // El portador se perdió o va demasiado tiempo pegada: queda como perdida normal.
        l.pista.llevadaPor = null;
        l.pista.perdida = 1;
        l.pista.seguidos = 0;
        this.perdidas.push({ pista: l.pista, vistoEn: this.cuadro - 1 });
        return false;
      }
      l.dx *= 0.5;
      l.dy *= 0.5;
      const antes = { x: l.pista.x, y: l.pista.y };
      l.pista.vx = l.portador.vx;
      l.pista.vy = l.portador.vy;
      l.pista.x = l.portador.x + l.dx;
      l.pista.y = l.portador.y + l.dy;
      resultado.push({ pista: l.pista, antes, deteccion: d, portador: l.portador });
      return true;
    });

    for (const pista of this.pistas) {
      if (pista.perdida > this.op.cuadrosDeGracia) this.perdidas.push({ pista, vistoEn: this.cuadro - pista.perdida });
    }
    this.pistas = this.pistas.filter((p) => p.perdida <= this.op.cuadrosDeGracia);
    this.perdidas = this.perdidas.filter((p) => this.cuadro - p.vistoEn <= CUADROS_MEMORIA);

    detecciones.forEach((det, d) => {
      if (detUsada.has(d)) return;
      // 1. Una llevada que se separa de su portador: recupera su identidad. Si la mancha que se
      //    achicó lleva pistas pegadas, el pedazo que sale es una de ellas (no una pista nueva).
      const madre = this.buscarMadre(det, previo, deteccionDe, detecciones);
      const separada = this.soltarLlevada(det, deteccionDe, detecciones, madre);
      if (separada) {
        this.pistas.push(separada.pista);
        resultado.push({ pista: separada.pista, antes: mover(separada.pista, det, 1, 0), deteccion: d });
        reiniciarPeso(separada.portador, detecciones[deteccionDe.get(separada.portador)!]!);
        return;
      }
      // 2. Una pista perdida hace poco que debería estar aquí.
      const heredada = this.recuperar(det);
      if (heredada) {
        this.pistas.push(heredada.pista);
        resultado.push({ pista: heredada.pista, antes: heredada.antes, deteccion: d });
        return;
      }
      // 3. Nueva; si nace donde una mancha se achicó de golpe, es un pedazo de ella.
      const pista = nuevaPista(this.siguienteId++, det);
      if (det.motivo === undefined) anotarMedidas(pista, det);
      if (madre) {
        pista.separadaDe = madre.id;
        reiniciarPeso(madre, detecciones[deteccionDe.get(madre)!]!);
      }
      this.pistas.push(pista);
      resultado.push({ pista, antes: null, deteccion: d, ...(madre ? { separadaDe: madre } : {}) });
    });

    return resultado;
  }

  /** La pista de este cuadro cuya mancha creció de golpe y cubre `punto`: se le pegó otra. */
  private buscarPortador(
    punto: { x: number; y: number },
    previo: Map<Pista, { area: number }>,
    deteccionDe: Map<Pista, number>,
    detecciones: Deteccion[],
  ): Pista | null {
    let mejor: Pista | null = null;
    let mejorD = Infinity;
    for (const [pista, d] of deteccionDe) {
      const det = detecciones[d]!;
      const antes = previo.get(pista);
      if (!antes || det.motivo !== undefined || det.area < CRECE_SI_SE_PEGA * antes.area) continue;
      const dist = Math.hypot(det.x - punto.x, det.y - punto.y);
      if (dist <= Math.max(this.op.distanciaMaxima * 0.6, (det.largo ?? 0) / 2) && dist < mejorD) {
        mejor = pista;
        mejorD = dist;
      }
    }
    return mejor;
  }

  /** La pista de este cuadro cuya mancha se achicó de golpe cerca de `det`: `det` se le separó. */
  private buscarMadre(det: Deteccion, previo: Map<Pista, { x: number; y: number; area: number }>, deteccionDe: Map<Pista, number>, detecciones: Deteccion[]): Pista | null {
    if (det.motivo !== undefined) return null;
    let mejor: Pista | null = null;
    let mejorD = Infinity;
    for (const [pista, d] of deteccionDe) {
      const antes = previo.get(pista);
      if (!antes || detecciones[d]!.area > ACHICA_SI_SE_SEPARA * antes.area) continue;
      const dist = Math.hypot(det.x - antes.x, det.y - antes.y);
      if (dist <= Math.max(this.op.distanciaMaxima, Math.sqrt(antes.area)) && dist < mejorD) {
        mejor = pista;
        mejorD = dist;
      }
    }
    return mejor;
  }

  /**
   * La llevada que se separó en `det`: una de las que lleva `madre` (la mancha que se achicó a su
   * lado), o la más cercana a `det` cuyo portador sigue al lado.
   */
  private soltarLlevada(det: Deteccion, deteccionDe: Map<Pista, number>, detecciones: Deteccion[], madre: Pista | null): Llevada | null {
    let mejor = -1;
    let mejorD = Infinity;
    this.llevadas.forEach((l, i) => {
      const d = deteccionDe.get(l.portador);
      if (d === undefined) return;
      const alcance = l.portador === madre ? Infinity : Math.max(this.op.distanciaMaxima, (detecciones[d]!.largo ?? 0) * 0.75);
      const dist = Math.hypot(det.x - l.pista.x, det.y - l.pista.y);
      if (dist <= alcance && dist < mejorD) {
        mejor = i;
        mejorD = dist;
      }
    });
    if (mejor < 0) return null;
    const [l] = this.llevadas.splice(mejor, 1);
    l!.pista.llevadaPor = null;
    l!.pista.perdida = 0;
    return l!;
  }

  /** Busca una pista perdida hace poco que debería estar donde apareció esta detección. */
  private recuperar(det: Deteccion): { pista: Pista; antes: { x: number; y: number } } | null {
    let mejor = -1;
    let mejorD2 = Infinity;
    this.perdidas.forEach(({ pista, vistoEn }, i) => {
      const k = this.cuadro - vistoEn;
      // Donde debía estar si siguió igual, o cerca de donde se vio (si se detuvo o se dio vuelta).
      const d2 = Math.min(
        (pista.x + pista.vx * k - det.x) ** 2 + (pista.y + pista.vy * k - det.y) ** 2,
        (pista.x - det.x) ** 2 + (pista.y - det.y) ** 2,
      );
      // Mientras más tiempo perdida, más margen.
      const margen = this.op.distanciaMaxima * (1 + 0.15 * k);
      if (d2 <= margen * margen && d2 < mejorD2) {
        mejor = i;
        mejorD2 = d2;
      }
    });
    if (mejor < 0) return null;
    const { pista, vistoEn } = this.perdidas[mejor]!;
    this.perdidas.splice(mejor, 1);
    pista.recuperada++;
    const antes = mover(pista, det, this.cuadro - vistoEn, 0);
    return { pista, antes };
  }

  get activas(): readonly Pista[] {
    return this.pistas;
  }

  /** A cero: sin pistas y los números vuelven a empezar en 1 (el registro de cada vuelta es igual). */
  reiniciar() {
    this.pistas = [];
    this.perdidas = [];
    this.llevadas = [];
    this.siguienteId = 1;
  }
}

function nuevaPista(id: number, det: Deteccion): Pista {
  const aceptada = det.motivo === undefined;
  return {
    id,
    x: det.x,
    y: det.y,
    peso: aceptada ? det.peso : 1,
    pesos: aceptada ? [det.peso] : [],
    aceptadas: [aceptada],
    seguidos: aceptada ? 1 : 0,
    vx: 0,
    vy: 0,
    perdida: 0,
    contada: false,
    edad: 0,
    recorrido: [],
    ladoExterior: null,
    saldo: 0,
    aporte: 0,
    pesoContado: 0,
    medidas: [],
    medida: false,
    unida: aceptada && (det.pedazos ?? 1) > 1,
    nacioEnFranja: false,
    recuperada: 0,
    areaUltima: det.area,
    separadaDe: null,
    llevadaPor: null,
  };
}

/**
 * Lleva la pista a la detección (que está a `cuadros` cuadros de su última posición).
 * `llevando`: cuántas pistas van pegadas a esta; su peso se descuenta (cuentan por sí mismas).
 */
function mover(pista: Pista, det: Deteccion, cuadros: number, llevando: number): { x: number; y: number } {
  const antes = { x: pista.x, y: pista.y };
  pista.vx = (det.x - pista.x) / cuadros;
  pista.vy = (det.y - pista.y) / cuadros;
  pista.x = det.x;
  pista.y = det.y;
  pista.areaUltima = det.area;
  // Lo descartado se sigue (para no perderle la pista) pero no cuenta para el peso ni las medidas.
  const aceptada = det.motivo === undefined;
  pista.aceptadas.push(aceptada);
  if (pista.aceptadas.length > CUADROS_PESO) pista.aceptadas.shift();
  pista.seguidos = aceptada ? pista.seguidos + 1 : 0;
  if (aceptada) {
    if ((det.pedazos ?? 1) > 1) pista.unida = true;
    anotarPeso(pista, Math.max(1, det.peso - llevando));
    // Las medidas de una mancha con otra pegada no son las de un alevino.
    if (llevando === 0) anotarMedidas(pista, det);
  }
  pista.perdida = 0;
  return antes;
}

/** Se le separó un pedazo: su peso es desde ahora el de su mancha actual, no el de antes. */
function reiniciarPeso(pista: Pista, det: Deteccion) {
  if (det.motivo !== undefined) return;
  pista.pesos = [det.peso];
  pista.peso = det.peso;
}

/** Guarda las medidas del cuadro (si la detección las trae) para aprender el tamaño del lote. */
function anotarMedidas(pista: Pista, det: Deteccion) {
  if (det.largo === undefined || det.ancho === undefined || det.relacion === undefined) return;
  pista.medidas.push({ largo: det.largo, ancho: det.ancho, area: det.area, relacion: det.relacion });
  if (pista.medidas.length > CUADROS_PESO) pista.medidas.shift();
}

/** Cuadros que se miran para el peso de una pista. */
const CUADROS_PESO = 15;

/**
 * El peso de la pista es la mediana (la de abajo, si son pares) de sus últimos cuadros: un solo
 * cuadro raro (un pez que se pone de lado, dos que se rozan un momento) no cambia cuántos son.
 */
function anotarPeso(pista: Pista, peso: number) {
  pista.pesos.push(peso);
  if (pista.pesos.length > CUADROS_PESO) pista.pesos.shift();
  const orden = [...pista.pesos].sort((a, b) => a - b);
  pista.peso = orden[(orden.length - 1) >> 1]!;
}

/** Dónde debería estar la pista en el cuadro actual, contando los cuadros que lleva perdida. */
export function predecir(pista: Pista): { x: number; y: number } {
  const cuadros = pista.perdida + 1;
  return { x: pista.x + pista.vx * cuadros, y: pista.y + pista.vy * cuadros };
}
