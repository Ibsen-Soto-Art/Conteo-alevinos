/**
 * Cierre morfológico (dilatar y luego erosionar) de una máscara 1/0, con un cuadrado de
 * lado 2·radio+1. Une los pedazos de un mismo pez (cabeza, cuerpo, cola separados por bandas
 * oscuras o aletas transparentes) sin agrandar el resultado.
 *
 * Se hace por filas y por columnas (es separable), así cuesta poco aunque el radio crezca.
 * Fuera del cuadro se considera vacío al dilatar y lleno al erosionar, para no comerse los bordes.
 */
export function cerrar(mascara: Uint8Array, ancho: number, alto: number, radio: number, temporal?: Uint8Array): Uint8Array {
  if (radio <= 0) return mascara;
  const tmp = temporal && temporal.length >= mascara.length ? temporal : new Uint8Array(mascara.length);
  pasar(mascara, tmp, ancho, alto, radio, true, true);
  pasar(tmp, mascara, ancho, alto, radio, false, true);
  pasar(mascara, tmp, ancho, alto, radio, true, false);
  pasar(tmp, mascara, ancho, alto, radio, false, false);
  return mascara;
}

/** Una pasada de dilatación (máximo) o erosión (mínimo), por filas o por columnas. */
function pasar(origen: Uint8Array, destino: Uint8Array, ancho: number, alto: number, r: number, porFilas: boolean, dilatar: boolean) {
  const lineas = porFilas ? alto : ancho;
  const largo = porFilas ? ancho : alto;
  const paso = porFilas ? 1 : ancho;
  const fuera = dilatar ? 0 : 1;
  for (let l = 0; l < lineas; l++) {
    const inicio = porFilas ? l * ancho : l;
    // Cuenta de unos dentro de la ventana [i - r, i + r]; los de fuera del cuadro valen `fuera`.
    let unos = fuera * r;
    for (let k = 0; k <= Math.min(r, largo - 1); k++) unos += origen[inicio + k * paso]!;
    if (r > largo - 1) unos += fuera * (r - (largo - 1));
    for (let i = 0; i < largo; i++) {
      destino[inicio + i * paso] = dilatar ? (unos > 0 ? 1 : 0) : unos === 2 * r + 1 ? 1 : 0;
      const sale = i - r;
      const entra = i + r + 1;
      unos -= sale >= 0 ? origen[inicio + sale * paso]! : fuera;
      unos += entra < largo ? origen[inicio + entra * paso]! : fuera;
    }
  }
}
