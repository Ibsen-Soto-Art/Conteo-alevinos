import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { VIDEO_CAMARA, VIDEO_PECES } from "./video";

/**
 * Antes de las pruebas: genera con ffmpeg el video que Chromium usa como cámara falsa.
 * Fondo iluminado y 10 manchas oscuras que bajan por el canal y cruzan la línea (50 %),
 * una cada 0,6 s, en un video vertical como el del teléfono.
 */
export default function preparar() {
  if (existsSync(VIDEO_CAMARA)) return;
  mkdirSync(dirname(VIDEO_CAMARA), { recursive: true });

  const { ancho, alto, segundos, peces, lado, velocidad, separacion } = VIDEO_PECES;
  const entradas = Array.from({ length: peces }, (_, i) => `[p${i}]`).join("");
  let filtro = `color=c=0x1E1E1E:s=${lado}x${lado}:r=30:d=${segundos},split=${peces}${entradas};`;
  let anterior = "0:v";
  for (let i = 0; i < peces; i++) {
    const x = 40 + ((i * 70) % (ancho - 80));
    filtro += `[${anterior}][p${i}]overlay=x=${x}:y='(t-${i * separacion})*${velocidad}-${lado + 4}'[v${i}];`;
    anterior = `v${i}`;
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
