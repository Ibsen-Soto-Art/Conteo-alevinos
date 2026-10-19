import {
  CUADROS_ANALISIS,
  LADO_ANALISIS,
  canalEnVideo,
  escalarEstadisticas,
  geometriaDe,
  tamanoProceso,
  type Controles,
  type EstadisticasLote,
  type Geometria,
  type PerfilForma,
} from "@contador/counting-engine";
import type { MensajeAlMotor, MensajeDelMotor } from "./protocolo";

// La geometría del canal vive en el motor: el script de precisión la usa igual.
export {
  CUADROS_ANALISIS,
  LADO_ANALISIS,
  LADO_RECORTE,
  canalEnVideo,
  escalarEstadisticas,
  geometriaDe,
  recorteAVideo,
  type CanalVideo,
  type Geometria,
} from "@contador/counting-engine";

export interface EnvioMotor {
  enviar(msg: MensajeAlMotor, transferir?: Transferable[]): void;
  enviarCuadro(ancho: number, alto: number, rgba: ArrayBuffer, tiempo?: number): boolean;
  libre(): boolean;
}

export interface OpcionesCaptura {
  ajustes: Controles;
  perfil: PerfilForma | null;
  lote: EstadisticasLote | null;
  /** Aprender el fondo del canal mientras cuenta. */
  fondo: boolean;
  /** Averiguar hacia dónde corre el agua. */
  sentidoAutomatico?: boolean;
  /** El sentido de los ajustes es el decidido en el conteo anterior. */
  sentidoConocido?: boolean;
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

  /**
   * Llamar con cada cuadro nuevo del video. Dice qué hizo: mandó un cuadro para buscar el canal,
   * uno para contar, o nada (esperando el canal, motor ocupado, video sin cargar).
   * `tiempo`: momento del cuadro en ms (para procesar un video cuadro por cuadro).
   */
  cuadro(tiempo?: number): "canal" | "contar" | "nada" {
    const v = this.video;
    if (v.readyState < 2 || v.videoWidth === 0) return "nada";
    if (this.fase === "canal") {
      const t = tamanoProceso(v.videoWidth, v.videoHeight, LADO_ANALISIS);
      this.dibujar(0, 0, v.videoWidth, v.videoHeight, t.ancho, t.alto);
      const img = this.ctx.getImageData(0, 0, t.ancho, t.alto);
      const ultimo = ++this.enviados >= CUADROS_ANALISIS;
      this.motor.enviar({ tipo: "canal", ancho: t.ancho, alto: t.alto, rgba: img.data.buffer, ultimo }, [img.data.buffer]);
      if (ultimo) this.fase = "esperandoCanal";
      return "canal";
    }
    const g = this.geometriaActual;
    if (this.fase !== "contar" || !g || !this.motor.libre()) return "nada";
    const { zona } = g.canal;
    this.dibujar(zona.x, zona.y, zona.ancho, zona.alto, g.recorte.ancho, g.recorte.alto);
    const img = this.ctx.getImageData(0, 0, g.recorte.ancho, g.recorte.alto);
    this.op.alRecorte?.(img);
    return this.motor.enviarCuadro(g.recorte.ancho, g.recorte.alto, img.data.buffer, tiempo) ? "contar" : "nada";
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
  cambiar(parcial: Partial<Pick<OpcionesCaptura, "ajustes" | "perfil" | "lote" | "fondo" | "sentidoAutomatico">>) {
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
      lote: this.op.lote ? escalarEstadisticas(this.op.lote, g.recorte.ancho) : null,
      fondo: this.op.fondo,
      sentidoAutomatico: Boolean(this.op.sentidoAutomatico),
      sentidoConocido: Boolean(this.op.sentidoConocido),
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
 * Procesa un video grabado cuadro por cuadro, sin saltarse ninguno y siempre igual: adelanta el
 * video de a un cuadro (`cuadrosPorSegundo`), manda el cuadro y espera la respuesta del motor
 * antes de seguir. `esperarRespuesta` se resuelve con el próximo mensaje del motor.
 * Devuelve la función para parar.
 */
export function recorrerCuadroPorCuadro(
  video: HTMLVideoElement,
  captura: Pick<Captura, "cuadro">,
  esperarRespuesta: () => Promise<void>,
  cuadrosPorSegundo: number,
  alAvanzar?: (segundo: number) => void,
  alTerminar?: () => void,
): () => void {
  let vivo = true;
  const ir = (t: number) =>
    new Promise<void>((listo) => {
      video.addEventListener("seeked", () => listo(), { once: true });
      video.currentTime = t;
    });
  void (async () => {
    video.pause();
    const paso = 1 / cuadrosPorSegundo;
    for (let i = 0; vivo && i * paso <= video.duration; i++) {
      const t = i * paso;
      await ir(t);
      // Mientras busca el canal el motor contesta solo al último cuadro; si está ocupado, se espera.
      for (let intento = 0; vivo && intento < 50; intento++) {
        const hizo = captura.cuadro(t * 1000);
        if (hizo === "canal") break;
        await esperarRespuesta();
        if (hizo === "contar") break;
      }
      alAvanzar?.(t);
    }
    if (vivo) alTerminar?.();
  })();
  return () => {
    vivo = false;
  };
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
