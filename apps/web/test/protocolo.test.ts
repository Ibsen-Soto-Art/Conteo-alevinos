import { describe, expect, it } from "vitest";
import { CONTROLES_INICIALES, configuracionMotor, encuadreCanal, encuadreCubrir, lineaEnVista, posicionLineaPx, posicionParaVerFranja, puntoEnVista, tamanoProceso } from "../src/features/conteo/protocolo";

describe("tamanoProceso", () => {
  it("reduce un video horizontal a 320 px de lado mayor", () => {
    expect(tamanoProceso(1920, 1080)).toEqual({ ancho: 320, alto: 180 });
  });

  it("reduce un video vertical del celular conservando la proporción", () => {
    expect(tamanoProceso(1080, 1920)).toEqual({ ancho: 180, alto: 320 });
  });

  it("no agranda un video pequeño", () => {
    expect(tamanoProceso(200, 100)).toEqual({ ancho: 200, alto: 100 });
  });
});

describe("posicionLineaPx", () => {
  it("con flujo vertical usa el alto del cuadro", () => {
    expect(posicionLineaPx(50, "abajo", 320, 180)).toBe(90);
    expect(posicionLineaPx(25, "arriba", 320, 180)).toBe(45);
  });

  it("con flujo horizontal usa el ancho del cuadro", () => {
    expect(posicionLineaPx(50, "derecha", 320, 180)).toBe(160);
    expect(posicionLineaPx(10, "izquierda", 320, 180)).toBe(32);
  });

  it("no deja la línea fuera del cuadro", () => {
    expect(posicionLineaPx(130, "abajo", 320, 180)).toBe(180);
    expect(posicionLineaPx(-5, "abajo", 320, 180)).toBe(0);
  });
});

describe("configuracionMotor", () => {
  it("pasa los controles al motor y aprende el área típica del lote", () => {
    const c = configuracionMotor({ ...CONTROLES_INICIALES, umbral: 90, lineaPorcentaje: 50 }, 80, 120);
    expect(c.detector).toEqual({ umbral: 90, areaMinima: CONTROLES_INICIALES.areaMinima, areaTipica: null });
    expect(c.posicionLinea).toBe(60);
    expect(c.aprenderAreaTipica).toBe(true);
  });
});

describe("lineaEnVista", () => {
  it("sin recorte la línea queda en el mismo porcentaje", () => {
    expect(lineaEnVista(50, "abajo", { ancho: 720, alto: 1280 }, { ancho: 360, alto: 640 })).toBe(320);
  });

  it("con la vista recortada (object-fit: cover) corrige el desplazamiento", () => {
    // video vertical 720×1280 en una franja de 360×160: se ve solo el centro del video
    const vista = { ancho: 360, alto: 160 };
    const video = { ancho: 720, alto: 1280 };
    expect(lineaEnVista(50, "abajo", video, vista)).toBe(80);
    // la franja muestra del 37,5 % al 62,5 % del video
    expect(lineaEnVista(40, "abajo", video, vista)).toBe(16);
    expect(lineaEnVista(30, "abajo", video, vista)).toBeLessThan(0);
  });

  it("con flujo horizontal usa el ancho", () => {
    expect(lineaEnVista(25, "derecha", { ancho: 1280, alto: 720 }, { ancho: 640, alto: 360 })).toBe(160);
  });
});

describe("puntoEnVista", () => {
  it("lleva un punto del cuadro de 180×320 a una vista ancha y baja (recortada arriba y abajo)", () => {
    // escala = max(360/180, 300/320) = 2; el cuadro mide 360×640 y se ve su centro (170 px arriba y abajo fuera)
    expect(puntoEnVista(90, 160, { ancho: 180, alto: 320 }, { ancho: 360, alto: 300 })).toEqual({ x: 180, y: 150, escala: 2 });
    expect(puntoEnVista(0, 85, { ancho: 180, alto: 320 }, { ancho: 360, alto: 300 })).toEqual({ x: 0, y: 0, escala: 2 });
  });

  it("coincide con la línea de conteo dibujada en la misma vista", () => {
    const proceso = { ancho: 180, alto: 320 };
    const vista = { ancho: 360, alto: 300 };
    const linea = lineaEnVista(60, "abajo", { ancho: 720, alto: 1280 }, vista);
    expect(puntoEnVista(90, 0.6 * 320, proceso, vista).y).toBeCloseTo(linea, 6);
  });
});

describe("mostrar la franja en la vista", () => {
  it("con object-position, el punto que se ve en la vista es el que se pidió", () => {
    // Video vertical 360×640 en una franja de 360×260: con posición 75 % se ve la parte baja.
    const p = puntoEnVista(180, 480, { ancho: 360, alto: 640 }, { ancho: 360, alto: 260 }, { x: 0.5, y: 0.75 });
    expect(p.y).toBeCloseTo(0.75 * 260, 6);
  });

  it("la posición pone la franja (75 % del canal hacia abajo) a la vista", () => {
    const pos = posicionParaVerFranja({ x: 0, y: 0, ancho: 360, alto: 640 }, { ancho: 360, alto: 640 }, { lineaPorcentaje: 75, sentido: "abajo" });
    expect(pos).toEqual({ x: 0.5, y: 0.75 });
    const derecha = posicionParaVerFranja({ x: 100, y: 0, ancho: 200, alto: 360 }, { ancho: 640, alto: 360 }, { lineaPorcentaje: 50, sentido: "derecha" });
    expect(derecha).toEqual({ x: 200 / 640, y: 0.5 });
  });
});

describe("encuadre", () => {
  it("cubrir es lo mismo que puntoEnVista", () => {
    const video = { ancho: 360, alto: 640 };
    const vista = { ancho: 360, alto: 260 };
    const e = encuadreCubrir(video, vista, { x: 0.5, y: 0.75 });
    const p = puntoEnVista(180, 480, video, vista, { x: 0.5, y: 0.75 });
    expect(180 * e.escala + e.dx).toBeCloseTo(p.x, 6);
    expect(480 * e.escala + e.dy).toBeCloseTo(p.y, 6);
  });

  it("el canal entero cabe entre los avisos de arriba y el contador de abajo", () => {
    const zona = { x: 100, y: 50, ancho: 300, alto: 600 };
    const vista = { ancho: 390, alto: 650 };
    const e = encuadreCanal(zona, vista, { arriba: 100, abajo: 250 });
    const arriba = zona.y * e.escala + e.dy;
    const abajo = (zona.y + zona.alto) * e.escala + e.dy;
    expect(arriba).toBeCloseTo(100, 6);
    expect(abajo).toBeCloseTo(400, 6);
    // Centrado a lo ancho.
    expect((zona.x + zona.ancho / 2) * e.escala + e.dx).toBeCloseTo(195, 6);
  });
});
