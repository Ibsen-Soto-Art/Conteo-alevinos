/** Cuadro RGBA con fondo iluminado y cuadrados oscuros, como lo entregaría un canvas. */
export function cuadroRgba(objetos: { x: number; y: number; lado: number }[], ancho = 80, alto = 120): ArrayBuffer {
  const datos = new Uint8ClampedArray(ancho * alto * 4).fill(230);
  for (const o of objetos) {
    for (let y = Math.max(0, o.y); y < Math.min(alto, o.y + o.lado); y++) {
      for (let x = Math.max(0, o.x); x < Math.min(ancho, o.x + o.lado); x++) {
        const i = (y * ancho + x) * 4;
        datos[i] = datos[i + 1] = datos[i + 2] = 30;
      }
    }
  }
  return datos.buffer;
}
