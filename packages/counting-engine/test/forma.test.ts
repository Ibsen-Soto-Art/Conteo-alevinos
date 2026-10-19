import { describe, expect, it } from "vitest";
import {
  MotorConteo,
  ModeloFondo,
  cerrar,
  clasificar,
  encontrarManchas,
  estadisticasDe,
  medida,
  perfilEnPixeles,
  type ConfiguracionMotor,
  type CuadroGris,
} from "../src";
import { PERFIL_PRUEBA } from "./perfil";
import { cuadroConFiguras, type Figura } from "./sintetico";

/** Máscara 1/0 de lo oscuro, para medir sin fondo. */
function manchas(figuras: Figura[], radioCierre = 0) {
  const c = cuadroConFiguras(figuras);
  const m = Uint8Array.from(c.datos, (v) => (v < 128 ? 1 : 0));
  cerrar(m, c.ancho, c.alto, radioCierre);
  return encontrarManchas(m, c.ancho, c.alto, 3);
}

const amplio = perfilEnPixeles(PERFIL_PRUEBA);

describe("medidas de cada mancha", () => {
  it("una elipse de 40 × 8 mide ~40 de largo y ~8 de ancho, es sólida y no tiene huecos", () => {
    const [m] = manchas([{ tipo: "elipse", cx: 80, cy: 100, largo: 40, ancho: 8 }]);
    expect(m!.largo).toBeGreaterThan(37);
    expect(m!.largo).toBeLessThan(43);
    expect(m!.ancho).toBeGreaterThan(7);
    expect(m!.ancho).toBeLessThan(9.5);
    expect(m!.relacion).toBeGreaterThan(4);
    expect(m!.solidez).toBeGreaterThan(0.9);
    expect(m!.hueco).toBe(0);
    expect(m!.cuerpos).toBe(1);
    expect(m!.angulo).toBeCloseTo(0, 1);
  });

  it("mide el ángulo del eje mayor", () => {
    const [m] = manchas([{ tipo: "elipse", cx: 80, cy: 100, largo: 40, ancho: 8, angulo: 30 }]);
    expect((m!.angulo * 180) / Math.PI).toBeCloseTo(30, -0.5);
  });

  it("una burbuja (anillo con el centro claro) tiene hueco y es redonda", () => {
    const [m] = manchas([{ tipo: "anillo", cx: 80, cy: 100, radio: 9, grosor: 3 }]);
    expect(m!.hueco).toBeGreaterThan(0.2);
    expect(m!.relacion).toBeLessThan(1.3);
  });

  it("dos alevinos pegados lado a lado son dos cuerpos; uno de lado (el doble de ancho) es uno", () => {
    const [pegados] = manchas([
      { tipo: "elipse", cx: 80, cy: 96, largo: 40, ancho: 8 },
      { tipo: "elipse", cx: 80, cy: 104, largo: 40, ancho: 8 },
    ]);
    expect(pegados!.cuerpos).toBe(2);
    const [deLado] = manchas([{ tipo: "elipse", cx: 80, cy: 100, largo: 40, ancho: 16 }]);
    expect(deLado!.cuerpos).toBe(1);
  });

  it("la basura irregular (una cruz) es poco sólida", () => {
    const [m] = manchas([
      { tipo: "rect", x: 60, y: 96, ancho: 40, alto: 6 },
      { tipo: "rect", x: 77, y: 80, ancho: 6, alto: 40 },
    ]);
    expect(m!.solidez).toBeLessThan(0.5);
  });
});

describe("cierre morfológico", () => {
  it("une un pez partido en 3 pedazos (bandas oscuras, aletas transparentes)", () => {
    const pedazos: Figura[] = [
      { tipo: "rect", x: 50, y: 100, ancho: 10, alto: 6 },
      { tipo: "rect", x: 62, y: 100, ancho: 12, alto: 6 },
      { tipo: "rect", x: 76, y: 100, ancho: 9, alto: 6 },
    ];
    expect(manchas(pedazos, 0)).toHaveLength(3);
    const unidos = manchas(pedazos, 1);
    expect(unidos).toHaveLength(1);
    // El cierre no agranda: el largo sigue siendo el del pez (35 px de punta a punta).
    expect(unidos[0]!.caja[2] - unidos[0]!.caja[0]).toBe(35);
  });

  it("no pega dos alevinos separados por más del doble del radio", () => {
    expect(manchas([
      { tipo: "rect", x: 50, y: 100, ancho: 10, alto: 6 },
      { tipo: "rect", x: 64, y: 100, ancho: 10, alto: 6 },
    ], 1)).toHaveLength(2);
  });
});

describe("clasificación con el perfil", () => {
  const motivo = (f: Figura[], p = amplio) => {
    const c = clasificar(manchas(f)[0]!, p);
    return c.acepta ? "acepta" : c.motivo;
  };

  it("un alevino se acepta", () => {
    expect(motivo([{ tipo: "elipse", cx: 80, cy: 100, largo: 40, ancho: 8 }])).toBe("acepta");
  });

  it("las burbujas se descartan: anillo o mancha redonda", () => {
    expect(motivo([{ tipo: "anillo", cx: 80, cy: 100, radio: 9, grosor: 3 }])).toBe("burbuja");
    expect(motivo([{ tipo: "elipse", cx: 80, cy: 100, largo: 12, ancho: 11 }])).toBe("burbuja");
  });

  it("la basura irregular y los palitos se descartan por forma", () => {
    expect(motivo([
      { tipo: "rect", x: 60, y: 96, ancho: 40, alto: 6 },
      { tipo: "rect", x: 77, y: 80, ancho: 6, alto: 40 },
    ])).toBe("forma");
    expect(motivo([{ tipo: "rect", x: 20, y: 100, ancho: 100, alto: 2 }])).toBe("forma");
  });

  it("con la escala del canal, un alevino demasiado chico para el tamaño se descarta", () => {
    const conEscala = perfilEnPixeles(PERFIL_PRUEBA, { pxPorCm: 10 }); // de 21 a 65 px de largo
    expect(motivo([{ tipo: "elipse", cx: 80, cy: 100, largo: 12, ancho: 3 }], conEscala)).toBe("tamano");
    expect(motivo([{ tipo: "elipse", cx: 80, cy: 100, largo: 40, ancho: 8 }], conEscala)).toBe("acepta");
  });

  it("un pez de lado no se descarta por ancho: puede ser uno de lado o varios", () => {
    expect(motivo([{ tipo: "elipse", cx: 80, cy: 100, largo: 40, ancho: 16 }])).toBe("acepta");
  });
});

describe("perfil en píxeles", () => {
  it("sin escala ni lote es amplio: solo forma, sin tamaño", () => {
    expect(amplio).toMatchObject({ origen: "amplio", largo: null, ancho: null, largoTipico: null });
  });

  it("con la escala pasa los centímetros a píxeles", () => {
    const p = perfilEnPixeles(PERFIL_PRUEBA, { pxPorCm: 10 });
    expect(p.origen).toBe("escala");
    expect(p.largo![0]).toBeCloseTo(21);
    expect(p.largo![1]).toBeCloseTo(65);
    expect(p.largoTipico).toBeCloseTo(43);
  });

  it("con el lote usa su mediana y su dispersión, y el cierre sale del ancho típico", () => {
    const lote = estadisticasDe(Array.from({ length: 21 }, (_, i) => ({ largo: 30 + (i % 3), ancho: 6, area: 140, relacion: 5 })));
    const p = perfilEnPixeles(PERFIL_PRUEBA, { lote, pxPorCm: 10 });
    expect(p.origen).toBe("lote"); // la Prueba de 100 manda sobre la escala
    expect(p.largoTipico).toBe(31);
    expect(p.largo![0]).toBeGreaterThanOrEqual(31 * 0.6);
    expect(p.largo![1]).toBeLessThanOrEqual(31 * 1.6);
    expect(p.radioCierre).toBe(2); // 0,3 × 6
  });

  it("la mediana y la dispersión son robustas a unos pocos valores raros", () => {
    const m = medida([10, 10, 11, 9, 10, 10, 200]);
    expect(m.mediana).toBe(10);
    expect(m.dispersion).toBeLessThan(2);
  });
});

describe("fondo aprendido", () => {
  const vacio = () => cuadroConFiguras([{ tipo: "rect", x: 10, y: 10, ancho: 8, alto: 8 }]); // canal con una marca fija
  const conPez = (y: number) =>
    cuadroConFiguras([{ tipo: "rect", x: 10, y: 10, ancho: 8, alto: 8 }, { tipo: "elipse", cx: 80, cy: y, largo: 30, ancho: 6, angulo: 90 }]);

  it("aprende el canal en los cuadros pedidos", () => {
    const f = new ModeloFondo({ cuadrosParaAprender: 5 });
    for (let i = 0; i < 4; i++) expect(f.aprender(vacio())).toBe(false);
    expect(f.estado).toBe("aprendiendo");
    expect(f.progreso).toBeCloseTo(0.8);
    expect(f.aprender(vacio())).toBe(true);
    expect(f.estado).toBe("listo");
  });

  it("aprende aunque pasen alevinos: lo que pasa no queda en el fondo, la marca fija sí", () => {
    const f = new ModeloFondo({ cuadrosParaAprender: 30 });
    // Desde el primer cuadro pasa un alevino, y otro más tarde.
    for (let i = 0; i < 30; i++) f.aprender(i < 15 ? conPez(20 + i * 12) : conPez(-50 + (i - 15) * 12));
    expect(f.listo).toBe(true);
    const c = vacio();
    const mascara = new Uint8Array(c.ancho * c.alto);
    f.primerPlano(c, mascara);
    // Con el canal vacío no aparece nada: ni el rastro de los alevinos ni la marca.
    expect(mascara.reduce((s, v) => s + v, 0)).toBe(0);
  });

  it("con el fondo listo ignora las marcas fijas y ve lo nuevo", () => {
    const f = new ModeloFondo({ cuadrosParaAprender: 3 });
    for (let i = 0; i < 4; i++) f.aprender(vacio());
    const c = conPez(100);
    const mascara = new Uint8Array(c.ancho * c.alto);
    f.primerPlano(c, mascara);
    const encontradas = encontrarManchas(mascara, c.ancho, c.alto, 3);
    expect(encontradas).toHaveLength(1);
    expect(Math.abs(encontradas[0]!.x - 80)).toBeLessThan(1);
  });

  it("si la luz cambia despacio, el fondo la sigue y no aparecen manchas falsas", () => {
    const f = new ModeloFondo({ cuadrosParaAprender: 3 });
    for (let i = 0; i < 4; i++) f.aprender(vacio());
    let falsas = 0;
    for (let k = 0; k < 200; k++) {
      // la luz baja 60 niveles en 200 cuadros
      const c = cuadroConFiguras([{ tipo: "rect", x: 10, y: 10, ancho: 8, alto: 8 }], 160, 240, Math.round(230 - (60 * k) / 200));
      const m = new Uint8Array(c.ancho * c.alto);
      f.primerPlano(c, m);
      falsas += m.reduce((s, v) => s + v, 0);
    }
    expect(falsas).toBe(0);
  });
});

describe("motor con perfil y fondo", () => {
  function config(): ConfiguracionMotor {
    return {
      detector: { umbral: 128, areaMinima: 6, areaTipica: null },
      rastreador: { distanciaMaxima: 30, cuadrosDeGracia: 2 },
      posicionLinea: 120,
      sentido: "abajo",
      aprenderAreaTipica: true,
      perfil: PERFIL_PRUEBA,
      fondo: { cuadrosParaAprender: 5 },
    };
  }
  const marca: Figura = { tipo: "rect", x: 4, y: 4, ancho: 10, alto: 10 };
  const cuadro = (figuras: Figura[]): CuadroGris => cuadroConFiguras([marca, ...figuras]);

  it("cuenta desde el primer cuadro, mientras aprende el fondo", () => {
    const motor = new MotorConteo({ ...config(), fondo: { cuadrosParaAprender: 90 } });
    let r = motor.procesar(cuadro([]));
    expect(r.fondo).toMatchObject({ estado: "aprendiendo" });
    for (let y = 20; y < 220; y += 8) r = motor.procesar(cuadro([{ tipo: "elipse", cx: 60, cy: y, largo: 30, ancho: 6, angulo: 90 }]));
    expect(r.fondo!.estado).toBe("aprendiendo");
    expect(r.total).toBe(1);
  });

  it("no pierde ni repite el alevino que cruza justo cuando el fondo queda listo", () => {
    const motor = new MotorConteo(config()); // aprende en 5 cuadros
    let r = motor.procesar(cuadro([]));
    for (let y = 60; y < 220; y += 8) r = motor.procesar(cuadro([{ tipo: "elipse", cx: 60, cy: y, largo: 30, ancho: 6, angulo: 90 }]));
    expect(r.fondo!.estado).toBe("listo");
    expect(r.total).toBe(1);
  });

  it("cuenta el alevino y no la burbuja que pasa a su lado; la marca fija nunca aparece", () => {
    const motor = new MotorConteo(config());
    for (let i = 0; i < 6; i++) motor.procesar(cuadro([]));
    let total = 0;
    const motivos = new Set<string>();
    for (let y = 20; y < 220; y += 8) {
      const r = motor.procesar(
        cuadro([
          { tipo: "elipse", cx: 60, cy: y, largo: 30, ancho: 6, angulo: 90 },
          { tipo: "anillo", cx: 120, cy: y, radio: 7, grosor: 2 },
        ]),
      );
      total = r.total;
      r.descartadas.forEach((d) => motivos.add(d.motivo!));
      expect([...r.detecciones, ...r.descartadas].some((d) => d.x < 20 && d.y < 20)).toBe(false);
    }
    expect(total).toBe(1);
    expect([...motivos]).toEqual(["burbuja"]);
  });
});
