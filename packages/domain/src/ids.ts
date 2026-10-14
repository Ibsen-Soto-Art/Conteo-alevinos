/**
 * Identificador UUID versión 7: los primeros 48 bits son la hora en milisegundos y el resto
 * es azar. Se crea en el teléfono sin señal y no choca con los de otros teléfonos; además
 * ordena por fecha de creación.
 */
export function uuidV7(
  ahora = Date.now(),
  aleatorio: (b: Uint8Array<ArrayBuffer>) => void = (b) => void crypto.getRandomValues(b),
): string {
  const b = new Uint8Array(16);
  aleatorio(b);
  let t = ahora;
  for (let i = 5; i >= 0; i--) {
    b[i] = t % 256;
    t = Math.floor(t / 256);
  }
  b[6] = 0x70 | (b[6]! & 0x0f); // versión 7
  b[8] = 0x80 | (b[8]! & 0x3f); // variante RFC 9562
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
