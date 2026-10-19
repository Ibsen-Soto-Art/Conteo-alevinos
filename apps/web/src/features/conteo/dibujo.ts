import { flujoVertical, franjaPorcentaje, posicionLineaPx, type Controles, type MensajeDelMotor } from "./protocolo";

type Resultado = Extract<MensajeDelMotor, { tipo: "resultado" }>;

const COLOR_LINEA = "#ffd400";
const COLOR_MANCHA = "#00e5ff";
const COLOR_PISTA = "#ff8a00";
const COLOR_CONTADA = "#39ff6a";

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

/** Dibuja el video, la máscara, la línea de conteo, las manchas y las pistas. */
export function dibujarEscena(
  ctx: CanvasRenderingContext2D,
  video: CanvasImageSource,
  mascara: CanvasImageSource | null,
  resultado: Resultado | null,
  controles: Controles,
  proceso: { ancho: number; alto: number },
) {
  const { width: W, height: H } = ctx.canvas;
  const k = W / proceso.ancho;

  ctx.drawImage(video, 0, 0, W, H);
  if (mascara) ctx.drawImage(mascara, 0, 0, W, H);

  // franja de conteo: banda sombreada con sus dos bordes
  const [a, b] = franjaPorcentaje(controles).map((p) => posicionLineaPx(p, controles.sentido, proceso.ancho, proceso.alto) * k);
  const vertical = flujoVertical(controles.sentido);
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

  if (!resultado || resultado.ancho !== proceso.ancho) return;

  // manchas detectadas: un círculo del tamaño de su área
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLOR_MANCHA;
  for (const d of resultado.detecciones) {
    const r = Math.max(4, Math.sqrt(d.area / Math.PI) * k + 3);
    ctx.beginPath();
    ctx.arc(d.x * k, d.y * k, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // pistas: naranja mientras viajan, verde cuando ya se contaron
  ctx.font = "bold 16px system-ui, sans-serif";
  for (const p of resultado.pistas) {
    ctx.fillStyle = p.contada ? COLOR_CONTADA : COLOR_PISTA;
    ctx.beginPath();
    ctx.arc(p.x * k, p.y * k, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(p.peso > 1 ? `${p.id}×${p.peso}` : String(p.id), p.x * k + 7, p.y * k - 7);
  }
}
