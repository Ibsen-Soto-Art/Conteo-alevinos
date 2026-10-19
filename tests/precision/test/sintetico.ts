import { execFileSync } from "node:child_process";

/** Píxeles por centímetro en los videos de prueba: las marcas de 2 cm miden 24 px. */
export const PX_POR_CM = 12;

export type Objeto = "pez" | "burbuja" | "basura";

/**
 * Genera con ffmpeg un video de prueba como el del canal (vertical, 360 × 640, 30 cuadros/s):
 * mesa oscura, canal iluminado con las 4 marcas de cinta de 2 × 2 cm en las esquinas, unos segundos
 * de canal vacío y luego los `objetos` bajando uno cada 0,5 s, que cruzan la franja de conteo:
 * - pez: elipse oscura de 4 × 0,7 cm (una cachama mediana vista desde arriba);
 * - burbuja: anillo oscuro con el centro claro;
 * - basura: una cruz (un pedazo de hoja o ramita).
 * Con `vacio`: segundos de canal vacío al empezar (0 = alevinos desde el primer cuadro).
 * Con `acostado`, el video se guarda girado con la marca de rotación, como lo hacen los celulares.
 */
export function videoSintetico(ruta: string, objetos: Objeto[] | number, { acostado = false, vacio = 4 } = {}) {
  const lista: Objeto[] = typeof objetos === "number" ? Array.from({ length: objetos }, () => "pez") : objetos;
  const segundos = vacio + lista.length * 0.5 + 4.5;
  const marca = 2 * PX_POR_CM;
  const canal = { x: 40, y: 20, ancho: 280, alto: 600 };

  // Cada figura: un cuadro oscuro con transparencia fuera de la forma.
  const figuras: Record<Objeto, { ancho: number; alto: number; forma: string }> = {
    pez: { ancho: 8, alto: 48, forma: "lte(pow((X-3.5)/4,2)+pow((Y-23.5)/24,2),1)" },
    burbuja: { ancho: 16, alto: 16, forma: "between(hypot(X-7.5,Y-7.5),4.5,8)" },
    basura: { ancho: 22, alto: 22, forma: "lt(abs(X-10.5),2.5)+lt(abs(Y-10.5),2.5)" },
  };
  let filtro =
    `[0:v]drawbox=x=${canal.x}:y=${canal.y}:w=${canal.ancho}:h=${canal.alto}:color=0xE6E6E6:t=fill` +
    [
      [canal.x + 4, canal.y + 4],
      [canal.x + canal.ancho - 4 - marca, canal.y + 4],
      [canal.x + 4, canal.y + canal.alto - 4 - marca],
      [canal.x + canal.ancho - 4 - marca, canal.y + canal.alto - 4 - marca],
    ]
      .map(([x, y]) => `,drawbox=x=${x}:y=${y}:w=${marca}:h=${marca}:color=black:t=fill`)
      .join("") +
    "[c0];";
  let anterior = "c0";
  lista.forEach((tipo, i) => {
    const f = figuras[tipo];
    const x = 100 + ((i * 47) % 150);
    filtro +=
      `color=c=0x1E1E1E:s=${f.ancho}x${f.alto}:r=30:d=${segundos},format=rgba,` +
      `geq=r=30:g=30:b=30:a='if(${f.forma},255,0)'[f${i}];` +
      `[${anterior}][f${i}]overlay=x=${x}:y='(t-${vacio + i * 0.5})*160-${f.alto + 4}'[v${i}];`;
    anterior = `v${i}`;
  });
  // Acostado: la imagen se guarda girada 90° a la derecha y se anota que hay que girarla de vuelta.
  if (acostado) filtro += `[${anterior}]transpose=1[girado];`;
  const salidaGenerada = acostado ? `${ruta}.acostado.mp4` : ruta;
  execFileSync("ffmpeg", [
    "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", `color=c=0x202020:s=360x640:r=30:d=${segundos}`,
    "-filter_complex", filtro.slice(0, -1),
    "-map", acostado ? "[girado]" : `[${anterior}]`,
    "-c:v", "mpeg4", "-q:v", "3",
    salidaGenerada,
  ]);
  if (acostado) {
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-display_rotation", "90", "-i", salidaGenerada, "-c", "copy", ruta]);
  }
  return { segundos };
}
