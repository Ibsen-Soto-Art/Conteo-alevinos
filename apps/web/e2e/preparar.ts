import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { PECES_CANAL, PECES_POR_VUELTA, VIDEO_CAMARA, VIDEO_CANAL, VIDEO_PECES } from "./video";

/**
 * Antes de las pruebas: genera con ffmpeg el video que Chromium usa como cámara falsa.
 * Canal iluminado y vacío unos segundos (para que la app aprenda el fondo) y luego filas de
 * alevinos (elipses oscuras alargadas) que bajan y cruzan la franja de conteo.
 */
export default function preparar() {
  prepararCanal();
  if (existsSync(VIDEO_CAMARA)) return;
  mkdirSync(dirname(VIDEO_CAMARA), { recursive: true });

  const { ancho, alto, vacio, segundos, filas, porFila, anchoPez, largoPez, velocidad, separacion } = VIDEO_PECES;
  const entradas = Array.from({ length: PECES_POR_VUELTA }, (_, i) => `[p${i}]`).join("");
  // Un alevino: elipse oscura con transparencia alrededor.
  const rx = anchoPez / 2;
  const ry = largoPez / 2;
  let filtro =
    `color=c=0x1E1E1E:s=${anchoPez}x${largoPez}:r=30:d=${segundos},format=rgba,` +
    `geq=r=30:g=30:b=30:a='if(lte(pow((X-${rx - 0.5})/${rx},2)+pow((Y-${ry - 0.5})/${ry},2),1),255,0)',` +
    `split=${PECES_POR_VUELTA}${entradas};`;
  let anterior = "0:v";
  const hueco = ancho / porFila;
  for (let f = 0; f < filas; f++) {
    for (let k = 0; k < porFila; k++) {
      const i = f * porFila + k;
      // Cada fila un poco corrida para que no vayan siempre por el mismo carril.
      const x = Math.round(hueco * k + (hueco - anchoPez) / 2 + ((f % 3) - 1) * 12);
      const inicio = (vacio + f * separacion).toFixed(2);
      filtro += `[${anterior}][p${i}]overlay=x=${x}:y='(t-${inicio})*${velocidad}-${largoPez + 4}'[v${i}];`;
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

/**
 * Video del canal para el laboratorio (360 × 640, 30 cuadros/s): mesa oscura, canal iluminado con
 * las 4 marcas de 2 × 2 cm (24 px: 12 px/cm), 3 s vacío y 6 alevinos de 2 × 0,5 cm que bajan.
 */
function prepararCanal() {
  if (existsSync(VIDEO_CANAL)) return;
  mkdirSync(dirname(VIDEO_CANAL), { recursive: true });
  const segundos = 3 + PECES_CANAL * 0.6 + 4;
  const marca = 24;
  const canal = { x: 40, y: 20, ancho: 280, alto: 600 };
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
  for (let i = 0; i < PECES_CANAL; i++) {
    filtro +=
      `color=c=0x1E1E1E:s=6x24:r=30:d=${segundos},format=rgba,` +
      `geq=r=30:g=30:b=30:a='if(lte(pow((X-2.5)/3,2)+pow((Y-11.5)/12,2),1),255,0)'[f${i}];` +
      `[${anterior}][f${i}]overlay=x=${100 + ((i * 47) % 150)}:y='(t-${(3 + i * 0.6).toFixed(1)})*160-28'[v${i}];`;
    anterior = `v${i}`;
  }
  execFileSync(
    "ffmpeg",
    [
      "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", `color=c=0x202020:s=360x640:r=30:d=${segundos}`,
      "-filter_complex", filtro.slice(0, -1),
      "-map", `[${anterior}]`,
      "-c:v", "libvpx", "-b:v", "1M", "-g", "1",
      VIDEO_CANAL,
    ],
    { stdio: "inherit" },
  );
}
