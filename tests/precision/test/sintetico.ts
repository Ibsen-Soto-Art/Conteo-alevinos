import { execFileSync } from "node:child_process";

/**
 * Genera con ffmpeg un video de prueba: fondo iluminado y `peces` manchas oscuras que bajan
 * y cruzan la línea (50 %), una cada 0,5 s, en un video vertical de 360 × 640 como el del celular.
 * Con `acostado`, el video se guarda girado con la marca de rotación, como lo hacen los celulares.
 */
export function videoSintetico(ruta: string, peces: number, { acostado = false } = {}) {
  const segundos = peces * 0.5 + 3;
  const entradas = Array.from({ length: peces }, (_, i) => `[p${i}]`).join("");
  let filtro = `color=c=0x1E1E1E:s=16x16:r=30:d=${segundos},split=${peces}${entradas};`;
  let anterior = "0:v";
  for (let i = 0; i < peces; i++) {
    const x = 60 + ((i * 90) % 240);
    filtro += `[${anterior}][p${i}]overlay=x=${x}:y='(t-${i * 0.5})*200-20'[v${i}];`;
    anterior = `v${i}`;
  }
  // Acostado: la imagen se guarda girada 90° a la derecha y se anota que hay que girarla de vuelta.
  if (acostado) filtro += `[${anterior}]transpose=1[girado];`;
  const salidaGenerada = acostado ? `${ruta}.acostado.mp4` : ruta;
  execFileSync("ffmpeg", [
    "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", `color=c=0xE6E6E6:s=360x640:r=30:d=${segundos}`,
    "-filter_complex", filtro.slice(0, -1),
    "-map", acostado ? "[girado]" : `[${anterior}]`,
    "-c:v", "mpeg4", "-q:v", "3",
    salidaGenerada,
  ]);
  if (acostado) {
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-display_rotation", "90", "-i", salidaGenerada, "-c", "copy", ruta]);
  }
}
