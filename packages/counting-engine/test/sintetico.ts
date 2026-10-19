import type { CuadroGris } from "../src";

export interface Objeto {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/** Cuadro blanco (fondo con luz LED) con rectángulos oscuros como alevinos. */
export function cuadroCon(objetos: Objeto[], ancho = 80, alto = 120): CuadroGris {
  const datos = new Uint8Array(ancho * alto).fill(230);
  for (const o of objetos) {
    for (let y = Math.max(0, o.y); y < Math.min(alto, o.y + o.alto); y++) {
      for (let x = Math.max(0, o.x); x < Math.min(ancho, o.x + o.ancho); x++) {
        datos[y * ancho + x] = 30;
      }
    }
  }
  return { ancho, alto, datos };
}

/** Figuras para cuadros más realistas: alevinos como elipses, burbujas como anillos, basura irregular. */
export type Figura =
  | { tipo: "elipse"; cx: number; cy: number; largo: number; ancho: number; angulo?: number; gris?: number }
  | { tipo: "anillo"; cx: number; cy: number; radio: number; grosor: number; gris?: number }
  | { tipo: "rect"; x: number; y: number; ancho: number; alto: number; gris?: number };

/** Cuadro con fondo iluminado (`fondo`) y figuras oscuras. El ángulo va en grados, 0 = largo horizontal. */
export function cuadroConFiguras(figuras: Figura[], ancho = 160, alto = 240, fondo = 230): CuadroGris {
  const datos = new Uint8Array(ancho * alto).fill(fondo);
  for (const f of figuras) {
    const gris = f.gris ?? 30;
    // Solo se recorre el rectángulo que contiene la figura (el resultado es el mismo).
    const [x0, y0, x1, y1] = caja(f);
    for (let y = Math.max(0, y0); y < Math.min(alto, y1); y++) {
      for (let x = Math.max(0, x0); x < Math.min(ancho, x1); x++) {
        if (dentro(f, x + 0.5, y + 0.5)) datos[y * ancho + x] = gris;
      }
    }
  }
  return { ancho, alto, datos };
}

/** Rectángulo (en px enteros, con margen) que contiene la figura. */
function caja(f: Figura): [number, number, number, number] {
  const r =
    f.tipo === "rect" ? null : f.tipo === "anillo" ? f.radio : Math.max(f.largo, f.ancho) / 2;
  if (r === null && f.tipo === "rect") return [Math.floor(f.x) - 1, Math.floor(f.y) - 1, Math.ceil(f.x + f.ancho) + 1, Math.ceil(f.y + f.alto) + 1];
  const { cx, cy } = f as { cx: number; cy: number };
  return [Math.floor(cx - r! - 1), Math.floor(cy - r! - 1), Math.ceil(cx + r! + 1), Math.ceil(cy + r! + 1)];
}

function dentro(f: Figura, x: number, y: number): boolean {
  switch (f.tipo) {
    case "rect":
      return x >= f.x && x < f.x + f.ancho && y >= f.y && y < f.y + f.alto;
    case "anillo": {
      const d = Math.hypot(x - f.cx, y - f.cy);
      return d <= f.radio && d >= f.radio - f.grosor;
    }
    case "elipse": {
      const a = ((f.angulo ?? 0) * Math.PI) / 180;
      const dx = x - f.cx;
      const dy = y - f.cy;
      const u = dx * Math.cos(a) + dy * Math.sin(a);
      const v = -dx * Math.sin(a) + dy * Math.cos(a);
      return (u / (f.largo / 2)) ** 2 + (v / (f.ancho / 2)) ** 2 <= 1;
    }
  }
}
