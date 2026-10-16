import { spawn } from "node:child_process";

/**
 * Lee videos con ffmpeg (debe estar instalado). Los celulares guardan el video acostado y
 * anotan que hay que girarlo: ffmpeg lo gira solo, y aquí se calcula el tamaño ya girado.
 */

export async function medidasVideo(ruta: string): Promise<{ ancho: number; alto: number }> {
  const salida = await ejecutar("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height:stream_tags=rotate:stream_side_data=rotation",
    "-of", "json",
    ruta,
  ]);
  const flujo = JSON.parse(salida).streams?.[0];
  if (!flujo?.width || !flujo?.height) throw new Error("no tiene video");
  const rotacion = Number(
    flujo.side_data_list?.find((d: { rotation?: number }) => d.rotation !== undefined)?.rotation ?? flujo.tags?.rotate ?? 0,
  );
  const girado = Math.abs(rotacion) % 180 === 90;
  return girado ? { ancho: flujo.height, alto: flujo.width } : { ancho: flujo.width, alto: flujo.height };
}

/** Entrega cada cuadro del video, ya reducido a ancho × alto, en RGBA (como un canvas en la app). */
export async function* cuadrosRgba(ruta: string, ancho: number, alto: number): AsyncGenerator<Uint8ClampedArray> {
  const ffmpeg = spawn(
    "ffmpeg",
    [
      "-v", "error",
      "-i", ruta,
      "-vf", `scale=${ancho}:${alto}`,
      // Un cuadro de salida por cada cuadro del video: sin repetir ni saltar (videos de celular con fps variable).
      "-fps_mode", "passthrough",
      "-f", "rawvideo",
      "-pix_fmt", "rgba",
      "pipe:1",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let errores = "";
  ffmpeg.stderr.on("data", (d) => (errores += d));
  const terminado = new Promise<number>((resolver, rechazar) => {
    ffmpeg.on("error", rechazar);
    ffmpeg.on("close", (codigo) => resolver(codigo ?? 1));
  });

  const tamano = ancho * alto * 4;
  let pendiente: Buffer = Buffer.alloc(0);
  for await (const trozo of ffmpeg.stdout as AsyncIterable<Buffer>) {
    pendiente = pendiente.length === 0 ? trozo : Buffer.concat([pendiente, trozo]);
    while (pendiente.length >= tamano) {
      const cuadro = new Uint8ClampedArray(tamano);
      cuadro.set(pendiente.subarray(0, tamano));
      pendiente = pendiente.subarray(tamano);
      yield cuadro;
    }
  }
  const codigo = await terminado;
  if (codigo !== 0) throw new Error(`ffmpeg no pudo leer el video: ${errores.trim() || `código ${codigo}`}`);
}

function ejecutar(programa: string, argumentos: string[]): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const p = spawn(programa, argumentos, { stdio: ["ignore", "pipe", "pipe"] });
    let salida = "";
    let errores = "";
    p.stdout.on("data", (d) => (salida += d));
    p.stderr.on("data", (d) => (errores += d));
    p.on("error", (e) => rechazar(new Error(`No se pudo ejecutar ${programa}. ¿Está instalado ffmpeg? (${e.message})`)));
    p.on("close", (codigo) => (codigo === 0 ? resolver(salida) : rechazar(new Error(errores.trim() || `${programa} terminó con ${codigo}`))));
  });
}
