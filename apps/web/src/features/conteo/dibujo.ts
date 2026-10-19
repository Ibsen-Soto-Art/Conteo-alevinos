import type { Deteccion, Zona } from "@contador/counting-engine";
import { flujoVertical, franjaPorcentaje, posicionLineaPx, type Controles, type MensajeDelMotor } from "./protocolo";

type Resultado = Extract<MensajeDelMotor, { tipo: "resultado" }>;

const COLOR_LINEA = "#ffd400";
const COLOR_MANCHA = "#00e5ff";
const COLOR_PISTA = "#ff8a00";
const COLOR_CONTADA = "#39ff6a";
const COLOR_MARCA = "#39ff6a";

/** Color de cada motivo de descarte (en el laboratorio, con su nombre escrito al lado). */
export const COLOR_DESCARTE: Record<NonNullable<Deteccion["motivo"]>, string> = {
  tamano: "#ff4fd8",
  forma: "#ff5a4f",
  burbuja: "#8f8bff",
  quieto: "#9aa5ad",
};

/**
 * Lo que se escribe junto a cada mancha: aceptada, «largo×ancho ·peso» (en px del recorte);
 * descartada, el motivo y sus medidas.
 */
export function etiquetaMancha(d: Deteccion): string {
  const medidas = d.largo !== undefined && d.ancho !== undefined ? `${Math.round(d.largo)}×${Math.round(d.ancho)}` : `${d.area} px`;
  if (d.motivo) return `${{ tamano: "tamaño", forma: "forma", burbuja: "burbuja", quieto: "quieto" }[d.motivo]} ${medidas}`;
  return `${medidas} ·${d.peso}`;
}

/** Un «+1 #12» que se dibuja un momento donde una pista cambió el contador. */
export interface Destello {
  x: number;
  y: number;
  texto: string;
  /** Verde si sumó, rojo si restó; gris si fue del sentido que no se muestra. */
  color: string;
}

/** Recuadro girado de una mancha (largo × ancho en su ángulo); sin medidas, un círculo de su área. */
function recuadro(ctx: CanvasRenderingContext2D, d: Deteccion, k: number) {
  ctx.beginPath();
  if (d.largo !== undefined && d.ancho !== undefined && d.angulo !== undefined) {
    ctx.save();
    ctx.translate(d.x * k, d.y * k);
    ctx.rotate(d.angulo);
    ctx.rect((-d.largo / 2) * k - 2, (-d.ancho / 2) * k - 2, d.largo * k + 4, d.ancho * k + 4);
    ctx.restore();
  } else {
    ctx.arc(d.x * k, d.y * k, Math.max(4, Math.sqrt(d.area / Math.PI) * k + 3), 0, Math.PI * 2);
  }
  ctx.stroke();
}

/**
 * Marca en rojo los píxeles que el detector ve como alevino (más oscuros que el umbral),
 * para ajustar el umbral a ojo. Usa los mismos pesos de gris que el motor.
 */
export function pintarMascara(rgba: Uint8ClampedArray, umbral: number, destino: Uint8ClampedArray) {
  for (let i = 0; i < rgba.length; i += 4) {
    const gris = (rgba[i]! * 77 + rgba[i + 1]! * 150 + rgba[i + 2]! * 29) >> 8;
    const esAlevino = gris < umbral;
    destino[i] = 255;
    destino[i + 1] = 0;
    destino[i + 2] = 80;
    destino[i + 3] = esAlevino ? 170 : 0;
  }
}

/**
 * Dibuja el recorte del canal (la zona del video que ve el motor), la máscara, la franja de
 * conteo, las manchas y las pistas. Sin recorte, el video entero.
 */
export function dibujarEscena(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  recorte: Zona | null,
  mascara: CanvasImageSource | null,
  resultado: Resultado | null,
  controles: Controles,
  proceso: { ancho: number; alto: number },
  marcas: { x: number; y: number; lado: number }[] = [],
  destellos: Destello[] = [],
) {
  const { width: W, height: H } = ctx.canvas;
  const k = W / proceso.ancho;

  if (recorte) ctx.drawImage(video, recorte.x, recorte.y, recorte.ancho, recorte.alto, 0, 0, W, H);
  else ctx.drawImage(video, 0, 0, W, H);
  if (mascara) ctx.drawImage(mascara, 0, 0, W, H);

  // franja de conteo: banda sombreada con sus dos bordes (la del motor, que puede haber
  // averiguado el sentido; sin resultado, la de los ajustes)
  const conMotor = resultado && resultado.ancho === proceso.ancho;
  const [a, b] = conMotor
    ? [resultado.franja.inicio * k, resultado.franja.fin * k]
    : franjaPorcentaje(controles).map((p) => posicionLineaPx(p, controles.sentido, proceso.ancho, proceso.alto) * k);
  const vertical = flujoVertical(conMotor ? resultado.sentido : controles.sentido);
  ctx.fillStyle = "rgb(255 212 0 / 0.12)";
  if (vertical) ctx.fillRect(0, a!, W, b! - a!);
  else ctx.fillRect(a!, 0, b! - a!, H);
  ctx.strokeStyle = COLOR_LINEA;
  ctx.lineWidth = 3;
  ctx.setLineDash([16, 10]);
  ctx.beginPath();
  for (const borde of [a!, b!]) {
    if (vertical) {
      ctx.moveTo(0, borde);
      ctx.lineTo(W, borde);
    } else {
      ctx.moveTo(borde, 0);
      ctx.lineTo(borde, H);
    }
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // marcas del canal encontradas (cuadros verdes)
  ctx.strokeStyle = COLOR_MARCA;
  ctx.lineWidth = 3;
  for (const m of marcas) ctx.strokeRect((m.x - m.lado / 2) * k, (m.y - m.lado / 2) * k, m.lado * k, m.lado * k);

  if (!resultado || resultado.ancho !== proceso.ancho) return;

  ctx.font = "bold 13px system-ui, sans-serif";
  ctx.lineWidth = 2;
  // descartadas: recuadro punteado, del color de su motivo y con el motivo escrito
  ctx.setLineDash([4, 4]);
  for (const d of resultado.descartadas) {
    const color = COLOR_DESCARTE[d.motivo ?? "forma"];
    ctx.strokeStyle = color;
    recuadro(ctx, d, k);
    ctx.fillStyle = color;
    ctx.fillText(etiquetaMancha(d), d.x * k + ((d.largo ?? 8) / 2) * k + 6, d.y * k + 4);
  }
  ctx.setLineDash([]);

  // aceptadas: recuadro con largo×ancho y peso
  for (const d of resultado.detecciones) {
    ctx.strokeStyle = COLOR_MANCHA;
    recuadro(ctx, d, k);
    ctx.fillStyle = COLOR_MANCHA;
    ctx.fillText(etiquetaMancha(d), d.x * k + ((d.largo ?? 8) / 2) * k + 6, d.y * k + 4);
  }

  // pistas: naranja mientras viajan, verde cuando ya se contaron
  ctx.font = "bold 16px system-ui, sans-serif";
  for (const p of resultado.pistas) {
    ctx.fillStyle = p.contada ? COLOR_CONTADA : COLOR_PISTA;
    ctx.beginPath();
    ctx.arc(p.x * k, p.y * k, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(p.peso > 1 ? `#${p.id}×${p.peso}` : `#${p.id}`, p.x * k + 7, p.y * k - 7);
  }

  // destellos: quién cambió el contador y cuánto
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgb(0 0 0 / 0.7)";
  for (const d of destellos) {
    ctx.strokeText(d.texto, d.x * k - 20, d.y * k - 18);
    ctx.fillStyle = d.color;
    ctx.fillText(d.texto, d.x * k - 20, d.y * k - 18);
  }
}
