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
}

/** Cuadros que se recuerda una pista perdida, por si reaparece (~1 s). */
const CUADROS_MEMORIA = 30;

/**
 * Sigue cada mancha entre cuadros emparejando por cercanía, para que un mismo
 * alevino no se cuente dos veces. Cada pista predice su siguiente posición con la
 * velocidad del último cuadro, así un alevino rápido no se pierde. Si una pista se pierde
 * (una burbuja la tapa, la luz parpadea) y algo aparece donde debía estar, hereda su historia.
 */
export class Rastreador {
  private pistas: Pista[] = [];
  private perdidas: { pista: Pista; vistoEn: number }[] = [];
  private cuadro = 0;
  private siguienteId = 1;

  constructor(private readonly op: OpcionesRastreador) {}

  /** Devuelve, por cada pista vista en este cuadro, su posición anterior y su detección. */
  actualizar(detecciones: Deteccion[]): Actualizacion[] {
    this.cuadro++;
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
    const resultado: Actualizacion[] = [];

    for (const { p, d } of pares) {
      if (detDePista.has(p) || detUsada.has(d)) continue;
      detDePista.set(p, d);
      detUsada.add(d);
      const pista = this.pistas[p]!;
      resultado.push({ pista, antes: mover(pista, detecciones[d]!, pista.perdida + 1), deteccion: d });
    }

    this.pistas.forEach((pista, p) => {
      if (detDePista.has(p)) return;
      pista.perdida++;
      pista.seguidos = 0;
    });
    for (const pista of this.pistas) {
      if (pista.perdida > this.op.cuadrosDeGracia) this.perdidas.push({ pista, vistoEn: this.cuadro - pista.perdida });
    }
    this.pistas = this.pistas.filter((p) => p.perdida <= this.op.cuadrosDeGracia);
    this.perdidas = this.perdidas.filter((p) => this.cuadro - p.vistoEn <= CUADROS_MEMORIA);

    detecciones.forEach((det, d) => {
      if (detUsada.has(d)) return;
      const heredada = this.recuperar(det);
      if (heredada) {
        this.pistas.push(heredada.pista);
        resultado.push({ pista: heredada.pista, antes: heredada.antes, deteccion: d });
        return;
      }
      const pista = nuevaPista(this.siguienteId++, det);
      if (det.motivo === undefined) anotarMedidas(pista, det);
      this.pistas.push(pista);
      resultado.push({ pista, antes: null, deteccion: d });
    });

    return resultado;
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
    const antes = mover(pista, det, this.cuadro - vistoEn);
    return { pista, antes };
  }

  get activas(): readonly Pista[] {
    return this.pistas;
  }

  reiniciar() {
    this.pistas = [];
    this.perdidas = [];
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
  };
}

/** Lleva la pista a la detección (que está a `cuadros` cuadros de su última posición). */
function mover(pista: Pista, det: Deteccion, cuadros: number): { x: number; y: number } {
  const antes = { x: pista.x, y: pista.y };
  pista.vx = (det.x - pista.x) / cuadros;
  pista.vy = (det.y - pista.y) / cuadros;
  pista.x = det.x;
  pista.y = det.y;
  // Lo descartado se sigue (para no perderle la pista) pero no cuenta para el peso ni las medidas.
  const aceptada = det.motivo === undefined;
  pista.aceptadas.push(aceptada);
  if (pista.aceptadas.length > CUADROS_PESO) pista.aceptadas.shift();
  pista.seguidos = aceptada ? pista.seguidos + 1 : 0;
  if (aceptada) {
    if ((det.pedazos ?? 1) > 1) pista.unida = true;
    anotarPeso(pista, det.peso);
    anotarMedidas(pista, det);
  }
  pista.perdida = 0;
  return antes;
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
