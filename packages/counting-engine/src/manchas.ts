import type { Zona } from "./tipos";

/** Medidas de una mancha de la máscara: lo que permite decir si es un alevino, cuántos y cuál no. */
export interface Medidas {
  /** Centro. */
  x: number;
  y: number;
  /** Píxeles de la mancha. */
  area: number;
  /** Eje mayor y menor de la elipse equivalente (momentos de segundo orden), en px. */
  largo: number;
  ancho: number;
  /** Ángulo del eje mayor, en radianes (0 = horizontal). */
  angulo: number;
  /** largo ÷ ancho. */
  relacion: number;
  /** Área ÷ área de la envolvente convexa: 1 en una forma llena y lisa, poco en hojas y basura. */
  solidez: number;
  /** Fracción de huecos encerrados (área de huecos ÷ área con huecos): alta en burbujas (anillo claro). */
  hueco: number;
  /** Cuerpos lado a lado: 2 si se ven dos lomos separados en la cabeza y en la cola. */
  cuerpos: number;
  /** Caja [x0, y0, x1, y1) y vértices de la envolvente convexa [x, y, x, y, ...]. */
  caja: [number, number, number, number];
  envolvente: number[];
}

/**
 * Busca las manchas (píxeles en 1 unidos en cruz) de la máscara y mide cada una.
 * Las de menos de `areaMinima` píxeles se ignoran (ruido).
 */
export function encontrarManchas(mascara: Uint8Array, ancho: number, alto: number, areaMinima: number, zona?: Zona): Medidas[] {
  const x0 = Math.max(0, Math.floor(zona?.x ?? 0));
  const y0 = Math.max(0, Math.floor(zona?.y ?? 0));
  const x1 = Math.min(ancho, Math.floor((zona?.x ?? 0) + (zona?.ancho ?? ancho)));
  const y1 = Math.min(alto, Math.floor((zona?.y ?? 0) + (zona?.alto ?? alto)));

  const visto = new Uint8Array(ancho * alto);
  const pixeles = new Int32Array(ancho * alto);
  const manchas: Medidas[] = [];

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const inicio = y * ancho + x;
      if (visto[inicio] || !mascara[inicio]) continue;
      // Relleno con pila sobre el mismo arreglo de píxeles.
      let n = 0;
      let leido = 0;
      visto[inicio] = 1;
      pixeles[n++] = inicio;
      while (leido < n) {
        const j = pixeles[leido++]!;
        const px = j % ancho;
        const py = (j - px) / ancho;
        if (px > x0 && !visto[j - 1] && mascara[j - 1]) (visto[j - 1] = 1), (pixeles[n++] = j - 1);
        if (px < x1 - 1 && !visto[j + 1] && mascara[j + 1]) (visto[j + 1] = 1), (pixeles[n++] = j + 1);
        if (py > y0 && !visto[j - ancho] && mascara[j - ancho]) (visto[j - ancho] = 1), (pixeles[n++] = j - ancho);
        if (py < y1 - 1 && !visto[j + ancho] && mascara[j + ancho]) (visto[j + ancho] = 1), (pixeles[n++] = j + ancho);
      }
      if (n >= areaMinima) manchas.push(medir(pixeles, n, ancho));
    }
  }
  return manchas;
}

/** Mide la mancha formada por los primeros `n` índices de `pixeles`. */
export function medir(pixeles: Int32Array, n: number, ancho: number): Medidas {
  let sx = 0;
  let sy = 0;
  let cx0 = Infinity;
  let cy0 = Infinity;
  let cx1 = -Infinity;
  let cy1 = -Infinity;
  for (let k = 0; k < n; k++) {
    const j = pixeles[k]!;
    const x = j % ancho;
    const y = (j - x) / ancho;
    sx += x;
    sy += y;
    if (x < cx0) cx0 = x;
    if (x > cx1) cx1 = x;
    if (y < cy0) cy0 = y;
    if (y > cy1) cy1 = y;
  }
  const cx = sx / n;
  const cy = sy / n;
  let mu20 = 0;
  let mu02 = 0;
  let mu11 = 0;
  for (let k = 0; k < n; k++) {
    const j = pixeles[k]!;
    const dx = (j % ancho) - cx;
    const dy = (j - (j % ancho)) / ancho - cy;
    mu20 += dx * dx;
    mu02 += dy * dy;
    mu11 += dx * dy;
  }
  // + 1/12: cada píxel es un cuadrado de lado 1, no un punto.
  mu20 = mu20 / n + 1 / 12;
  mu02 = mu02 / n + 1 / 12;
  mu11 /= n;
  const medio = (mu20 + mu02) / 2;
  const raiz = Math.sqrt(((mu20 - mu02) / 2) ** 2 + mu11 ** 2);
  const largo = 4 * Math.sqrt(medio + raiz);
  const ancho_ = 4 * Math.sqrt(Math.max(medio - raiz, 1 / 12));
  const angulo = 0.5 * Math.atan2(2 * mu11, mu20 - mu02);

  // Rejilla local de la caja: 1 = mancha. Sirve para la envolvente, los huecos y los cuerpos.
  const w = cx1 - cx0 + 1;
  const h = cy1 - cy0 + 1;
  const local = new Uint8Array(w * h);
  for (let k = 0; k < n; k++) {
    const j = pixeles[k]!;
    const x = j % ancho;
    const y = (j - x) / ancho;
    local[(y - cy0) * w + (x - cx0)] = 1;
  }

  const envolvente = envolventeConvexa(local, w, h, cx0, cy0);
  const areaEnvolvente = areaPoligono(envolvente);
  const huecos = contarHuecos(local, w, h);

  return {
    x: cx,
    y: cy,
    area: n,
    largo,
    ancho: ancho_,
    angulo,
    relacion: largo / ancho_,
    solidez: areaEnvolvente > 0 ? Math.min(1, n / areaEnvolvente) : 1,
    hueco: huecos / (n + huecos),
    cuerpos: contarCuerpos(local, w, h, cx - cx0, cy - cy0, angulo, largo),
    caja: [cx0, cy0, cx1 + 1, cy1 + 1],
    envolvente,
  };
}

/** Envolvente convexa (cadena monótona) de las esquinas de los píxeles de cada fila. */
function envolventeConvexa(local: Uint8Array, w: number, h: number, ox: number, oy: number): number[] {
  const puntos: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    let min = -1;
    let max = -1;
    for (let x = 0; x < w; x++) {
      if (local[y * w + x]) {
        if (min < 0) min = x;
        max = x;
      }
    }
    if (min < 0) continue;
    puntos.push([ox + min, oy + y], [ox + max + 1, oy + y], [ox + min, oy + y + 1], [ox + max + 1, oy + y + 1]);
  }
  return envolventeDePuntos(puntos);
}

/** Envolvente convexa de puntos sueltos, como [x, y, x, y, ...] en sentido antihorario. */
export function envolventeDePuntos(puntos: [number, number][]): number[] {
  const p = [...puntos].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length <= 2) return p.flat();
  const cruz = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const abajo: [number, number][] = [];
  for (const q of p) {
    while (abajo.length >= 2 && cruz(abajo[abajo.length - 2]!, abajo[abajo.length - 1]!, q) <= 0) abajo.pop();
    abajo.push(q);
  }
  const arriba: [number, number][] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]!;
    while (arriba.length >= 2 && cruz(arriba[arriba.length - 2]!, arriba[arriba.length - 1]!, q) <= 0) arriba.pop();
    arriba.push(q);
  }
  return [...abajo.slice(0, -1), ...arriba.slice(0, -1)].flat();
}

export function areaPoligono(v: number[]): number {
  let a = 0;
  for (let i = 0; i < v.length; i += 2) {
    const j = (i + 2) % v.length;
    a += v[i]! * v[j + 1]! - v[j]! * v[i + 1]!;
  }
  return Math.abs(a) / 2;
}

/** Píxeles vacíos encerrados por la mancha (los que no se alcanzan desde el borde de la caja). */
function contarHuecos(local: Uint8Array, w: number, h: number): number {
  const fuera = new Uint8Array(w * h);
  const pila: number[] = [];
  const empujar = (i: number) => {
    if (!local[i] && !fuera[i]) {
      fuera[i] = 1;
      pila.push(i);
    }
  };
  for (let x = 0; x < w; x++) empujar(x), empujar((h - 1) * w + x);
  for (let y = 0; y < h; y++) empujar(y * w), empujar(y * w + w - 1);
  while (pila.length > 0) {
    const i = pila.pop()!;
    const x = i % w;
    if (x > 0) empujar(i - 1);
    if (x < w - 1) empujar(i + 1);
    if (i >= w) empujar(i - w);
    if (i < w * (h - 1)) empujar(i + w);
  }
  let huecos = 0;
  for (let i = 0; i < local.length; i++) if (!local[i] && !fuera[i]) huecos++;
  return huecos;
}

/**
 * Cuántos cuerpos van lado a lado. Se corta la mancha en rebanadas a lo largo del eje mayor y se
 * cuentan los tramos separados (con hueco de 2 px o más) en cada rebanada. Dos alevinos pegados
 * de lado tienen dos tramos cerca de la cabeza y cerca de la cola; un solo alevino, aunque tenga
 * la cola partida, los tiene solo en un extremo.
 */
function contarCuerpos(local: Uint8Array, w: number, h: number, cx: number, cy: number, angulo: number, largo: number): number {
  const c = Math.cos(angulo);
  const s = Math.sin(angulo);
  let umin = Infinity;
  let umax = -Infinity;
  let vmin = Infinity;
  let vmax = -Infinity;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!local[y * w + x]) continue;
      const dx = x - cx;
      const dy = y - cy;
      const u = dx * c + dy * s;
      const v = -dx * s + dy * c;
      if (u < umin) umin = u;
      if (u > umax) umax = u;
      if (v < vmin) vmin = v;
      if (v > vmax) vmax = v;
    }
  }
  const rebanadas = Math.max(4, Math.min(20, Math.floor(largo / 2.5)));
  const filas = Math.round(vmax - vmin) + 1;
  if (rebanadas < 4 || filas < 3) return 1;
  const ocupado = new Uint8Array(rebanadas * filas);
  const tramo = (umax - umin) / rebanadas || 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!local[y * w + x]) continue;
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.min(rebanadas - 1, Math.floor((dx * c + dy * s - umin) / tramo));
      ocupado[r * filas + Math.round(-dx * s + dy * c - vmin)] = 1;
    }
  }
  const tramos = (r: number) => {
    let cuenta = 0;
    let vacios = 2;
    for (let v = 0; v < filas; v++) {
      if (ocupado[r * filas + v]) {
        if (vacios >= 2) cuenta++;
        vacios = 0;
      } else vacios++;
    }
    return cuenta;
  };
  // Sin la punta extrema (5 %), primer y último 35 % del largo.
  const desde = Math.floor(rebanadas * 0.05);
  const hasta = rebanadas - desde;
  const tercio = Math.max(1, Math.round(rebanadas * 0.35));
  let cabeza = 1;
  let cola = 1;
  for (let r = desde; r < hasta; r++) {
    const t = tramos(r);
    if (r < desde + tercio) cabeza = Math.max(cabeza, t);
    if (r >= hasta - tercio) cola = Math.max(cola, t);
  }
  return Math.min(cabeza, cola);
}
