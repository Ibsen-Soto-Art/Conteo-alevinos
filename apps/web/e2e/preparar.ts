import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { PECES_POR_VUELTA, VIDEO_CAMARA, VIDEO_PECES } from "./video";

/**
 * Antes de las pruebas: genera con ffmpeg el video que Chromium usa como cámara falsa.
 * Fondo iluminado y filas de manchas oscuras que bajan por el canal y cruzan la línea (50 %),
 * en un video vertical como el del teléfono.
 */
export default function preparar() {
  if (existsSync(VIDEO_CAMARA)) return;
  mkdirSync(dirname(VIDEO_CAMARA), { recursive: true });

  const { ancho, alto, segundos, filas, porFila, lado, velocidad, separacion } = VIDEO_PECES;
  const entradas = Array.from({ length: PECES_POR_VUELTA }, (_, i) => `[p${i}]`).join("");
  let filtro = `color=c=0x1E1E1E:s=${lado}x${lado}:r=30:d=${segundos},split=${PECES_POR_VUELTA}${entradas};`;
  let anterior = "0:v";
  const hueco = ancho / porFila;
  for (let f = 0; f < filas; f++) {
    for (let k = 0; k < porFila; k++) {
      const i = f * porFila + k;
      // Cada fila un poco corrida para que no vayan siempre por el mismo carril.
      const x = Math.round(hueco * k + (hueco - lado) / 2 + ((f % 3) - 1) * 12);
      filtro += `[${anterior}][p${i}]overlay=x=${x}:y='(t-${(f * separacion).toFixed(2)})*${velocidad}-${lado + 4}'[v${i}];`;
      anterior = `v${i}`;
    }
  }
  try {
    execFileSync(
      "ffmpeg",
      [
        "-loglevel", "error", "-y",
        "-f", "lavfi", "-i", `color=c=0xE6E6E6:s=${ancho}x${alto}:r=30:d=${segundos}`,
        "-filter_complex", filtro.slice(0, -1),
        "-map", `[${anterior}]`,
        "-q:v", "3",
        VIDEO_CAMARA,
      ],
      { stdio: "inherit" },
    );
  } catch (e) {
    throw new Error(`No se pudo generar el video de prueba. ¿Está instalado ffmpeg? (${e})`);
  }
}
