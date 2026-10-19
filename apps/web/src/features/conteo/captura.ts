import {
  tamanoProceso,
  type AnalisisCanal,
  type Controles,
  type EstadisticasLote,
  type Marca,
  type PerfilForma,
  type Zona,
} from "@contador/counting-engine";
import type { MensajeAlMotor, MensajeDelMotor } from "./protocolo";

/** Lado mayor del cuadro completo con que se busca el canal y sus marcas. */
export const LADO_ANALISIS = 640;
/** Lado mayor del recorte del canal que se cuenta (más detalle que reducir todo el cuadro a 320). */
export const LADO_RECORTE = 480;
/** Cuadros que se combinan para buscar el canal (los alevinos que pasan desaparecen). */
export const CUADROS_ANALISIS = 8;

/** El canal en píxeles del video. */
export interface CanalVideo {
  zona: Zona;
  marcas: Marca[];
  /** Píxeles del video por centímetro; null sin las 4 marcas. */
  pxPorCm: number | null;
  fuente: AnalisisCanal["fuente"];
}

/** Dónde está el canal y a qué tamaño se cuenta. */
export interface Geometria {
  canal: CanalVideo;
  /** Tamaño del recorte que recibe el motor. */
  recorte: { ancho: number; alto: number };
  /** Píxeles por centímetro en el recorte; null sin las 4 marcas. */
  pxPorCmRecorte: number | null;
}

/** Pasa el análisis (hecho en un cuadro de `analizado`) a píxeles del video. */
export function canalEnVideo(a: AnalisisCanal, analizado: { ancho: number; alto: number }, video: { ancho: number; alto: number }): CanalVideo {
  const k = video.ancho / analizado.ancho;
  return {
    zona: { x: a.zona.x * k, y: a.zona.y * k, ancho: a.zona.ancho * k, alto: a.zona.alto * k },
    marcas: a.marcas.map((m) => ({ x: m.x * k, y: m.y * k, lado: m.lado * k })),
    pxPorCm: a.pxPorCm === null ? null : a.pxPorCm * k,
    fuente: a.fuente,
  };
}

/** El recorte del canal: lado mayor hasta 480 px (sin agrandar) y la escala en ese recorte. */
export function geometriaDe(canal: CanalVideo, ladoRecorte = LADO_RECORTE): Geometria {
  const recorte = tamanoProceso(canal.zona.ancho, canal.zona.alto, ladoRecorte);
  return { canal, recorte, pxPorCmRecorte: canal.pxPorCm === null ? null : (canal.pxPorCm * recorte.ancho) / canal.zona.ancho };
}

/** Pasa un punto del recorte a píxeles del video. */
export function recorteAVideo(x: number, y: number, g: Geometria): { x: number; y: number } {
  const { zona } = g.canal;
  return { x: zona.x + (x * zona.ancho) / g.recorte.ancho, y: zona.y + (y * zona.alto) / g.recorte.alto };
}

export interface EnvioMotor {
  enviar(msg: MensajeAlMotor, transferir?: Transferable[]): void;
  enviarCuadro(ancho: number, alto: number, rgba: ArrayBuffer): boolean;
  libre(): boolean;
}

export interface OpcionesCaptura {
  ajustes: Controles;
  perfil: PerfilForma | null;
  lote: EstadisticasLote | null;
  /** Aprender el canal vacío antes de contar. */
  fondo: boolean;
  /** Cuando se sabe dónde está el canal. */
  alGeometria?: (g: Geometria) => void;
  /** Cada recorte que va al motor (el laboratorio pinta encima lo que el umbral ve). */
  alRecorte?: (img: ImageData) => void;
}

/**
 * Lleva los cuadros de la cámara (o de un video) al motor: primero unos cuadros completos para
 * encontrar el canal y sus marcas; después solo el recorte del canal, con el perfil y el fondo.
 */
export class Captura {
  private fase: "canal" | "esperandoCanal" | "contar" = "canal";
  private enviados = 0;
  private geometriaActual: Geometria | null = null;
  private readonly lienzo = document.createElement("canvas");
  private readonly ctx = this.lienzo.getContext("2d", { willReadFrequently: true })!;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly motor: EnvioMotor,
    private readonly op: OpcionesCaptura,
  ) {}

  get geometria(): Geometria | null {
    return this.geometriaActual;
  }

  /** Llamar con cada cuadro nuevo del video. */
  cuadro() {
    const v = this.video;
    if (v.readyState < 2 || v.videoWidth === 0) return;
    if (this.fase === "canal") {
      const t = tamanoProceso(v.videoWidth, v.videoHeight, LADO_ANALISIS);
      this.dibujar(0, 0, v.videoWidth, v.videoHeight, t.ancho, t.alto);
      const img = this.ctx.getImageData(0, 0, t.ancho, t.alto);
      const ultimo = ++this.enviados >= CUADROS_ANALISIS;
      this.motor.enviar({ tipo: "canal", ancho: t.ancho, alto: t.alto, rgba: img.data.buffer, ultimo }, [img.data.buffer]);
      if (ultimo) this.fase = "esperandoCanal";
      return;
    }
    const g = this.geometriaActual;
    if (this.fase !== "contar" || !g || !this.motor.libre()) return;
    const { zona } = g.canal;
    this.dibujar(zona.x, zona.y, zona.ancho, zona.alto, g.recorte.ancho, g.recorte.alto);
    const img = this.ctx.getImageData(0, 0, g.recorte.ancho, g.recorte.alto);
    this.op.alRecorte?.(img);
    this.motor.enviarCuadro(g.recorte.ancho, g.recorte.alto, img.data.buffer);
  }

  /** Llamar con cada respuesta del motor. */
  recibir(msg: MensajeDelMotor) {
    if (msg.tipo !== "canal" || this.fase !== "esperandoCanal") return;
    const v = this.video;
    const g = geometriaDe(canalEnVideo(msg.analisis, msg, { ancho: v.videoWidth, alto: v.videoHeight }));
    this.geometriaActual = g;
    this.configurar();
    // El mismo motor sirve a varias pantallas: al empezar se vuelve a mirar el canal vacío.
    this.motor.enviar({ tipo: "reiniciarFondo" });
    this.fase = "contar";
    this.op.alGeometria?.(g);
  }

  /** Cambia ajustes, perfil, lote o fondo sin volver a buscar el canal. */
  cambiar(parcial: Partial<Pick<OpcionesCaptura, "ajustes" | "perfil" | "lote" | "fondo">>) {
    Object.assign(this.op, parcial);
    if (this.geometriaActual) this.configurar();
  }

  /** Busca el canal otra vez (se movió el celular). */
  analizarDeNuevo() {
    this.fase = "canal";
    this.enviados = 0;
    this.geometriaActual = null;
  }

  private configurar() {
    const g = this.geometriaActual!;
    this.motor.enviar({
      tipo: "configurar",
      controles: this.op.ajustes,
      ancho: g.recorte.ancho,
      alto: g.recorte.alto,
      perfil: this.op.perfil,
      pxPorCm: g.pxPorCmRecorte,
      lote: this.op.lote,
      fondo: this.op.fondo,
    });
  }

  private dibujar(sx: number, sy: number, sw: number, sh: number, ancho: number, alto: number) {
    if (this.lienzo.width !== ancho || this.lienzo.height !== alto) {
      this.lienzo.width = ancho;
      this.lienzo.height = alto;
    }
    this.ctx.drawImage(this.video, sx, sy, sw, sh, 0, 0, ancho, alto);
  }
}

/**
 * Llama `alCuadro` con cada cuadro nuevo del video (requestVideoFrameCallback; sin él, cuando
 * cambia currentTime). Devuelve la función para parar.
 */
export function bucleDeCuadros(video: HTMLVideoElement, alCuadro: () => void): () => void {
  let vivo = true;
  let id = 0;
  let ultimoTiempo = -1;
  // En navegadores viejos no existe aunque TypeScript diga que sí.
  const conAviso = typeof video.requestVideoFrameCallback === "function";
  const siguiente = () => {
    if (!vivo) return;
    if (conAviso) {
      id = video.requestVideoFrameCallback(() => {
        alCuadro();
        siguiente();
      });
    } else {
      id = requestAnimationFrame(() => {
        if (video.currentTime !== ultimoTiempo) {
          ultimoTiempo = video.currentTime;
          alCuadro();
        }
        siguiente();
      });
    }
  };
  siguiente();
  return () => {
    vivo = false;
    if (conAviso) video.cancelVideoFrameCallback(id);
    else cancelAnimationFrame(id);
  };
}
