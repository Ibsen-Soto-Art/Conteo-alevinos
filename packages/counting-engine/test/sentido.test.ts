import { describe, expect, it } from "vitest";
import { MotorConteo, type ConfiguracionMotor } from "../src";
import { cuadroCon } from "./sintetico";

/**
 * Canal de 80 × 120 con la franja cerca de la salida si el agua baja (y = 70 a 90). Con sentido
 * automático, si el agua sube la franja va en espejo (y = 30 a 50), también cerca de su salida.
 */
function motor(parcial: Partial<ConfiguracionMotor> = {}) {
  return new MotorConteo({
    detector: { umbral: 128, areaMinima: 6, areaTipica: 16 },
    rastreador: { distanciaMaxima: 12, cuadrosDeGracia: 2 },
    posicionLinea: 80,
    franja: { inicio: 70, fin: 90 },
    sentido: "abajo",
    sentidoAutomatico: true,
    aprenderAreaTipica: false,
    ...parcial,
  });
}

const recorrido = (desde: number, hasta: number) => {
  const paso = desde < hasta ? 4 : -4;
  const ys: number[] = [];
  for (let y = desde; paso > 0 ? y <= hasta : y >= hasta; y += paso) ys.push(y);
  return ys;
};

/** Pasa alevinos de a uno, cada uno por su recorrido, con cuadros vacíos entre ellos. */
function pasar(m: MotorConteo, recorridos: (number[] | { x: number; ys: number[] })[]) {
  let r = m.procesar(cuadroCon([]));
  for (const rec of recorridos) {
    const { x, ys } = Array.isArray(rec) ? { x: 30, ys: rec } : rec;
    for (const y of ys) r = m.procesar(cuadroCon([{ x, y, ancho: 4, alto: 4 }]));
    for (let i = 0; i < 5; i++) r = m.procesar(cuadroCon([]));
  }
  return r;
}

const sube = () => recorrido(112, 4);
const baja = () => recorrido(4, 112);

describe("sentido automático del agua", () => {
  it("con el celular al revés (el agua sube en la imagen) cuenta todos y pone la franja cerca de la salida", () => {
    const m = motor();
    const r = pasar(m, [sube(), sube(), sube()]);
    expect(r.total).toBe(3);
    expect(r.sentido).toBe("arriba");
    expect(r.sentidoDecidido).toBe(true);
    expect(m.franja).toEqual({ inicio: 30, fin: 50 });
  });

  it("con el celular derecho cuenta igual que siempre", () => {
    const m = motor();
    const r = pasar(m, [baja(), baja(), baja()]);
    expect([r.total, r.sentido, r.sentidoDecidido]).toEqual([3, "abajo", true]);
    expect(m.franja).toEqual({ inicio: 70, fin: 90 });
  });

  it("no pierde los primeros alevinos mientras averigua el sentido", () => {
    const r = pasar(motor(), [sube()]);
    expect(r.sentidoDecidido).toBe(false);
    expect([r.total, r.sentido]).toEqual([1, "arriba"]);
  });

  it("los sumados de cada cuadro dan el total, también cuando decide", () => {
    const m = motor();
    let suma = 0;
    let r = m.procesar(cuadroCon([]));
    for (const ys of [sube(), sube(), sube(), sube()]) {
      for (const y of [...ys, -50, -50, -50, -50, -50]) {
        r = m.procesar(cuadroCon(y < 0 ? [] : [{ x: 30, y, ancho: 4, alto: 4 }]));
        suma += r.sumadosEnEsteCuadro;
      }
    }
    expect(r.sentidoDecidido).toBe(true);
    expect(suma).toBe(r.total);
    expect(suma).toBe(4);
  });

  it("un alevino que nada contra la corriente no cambia el sentido ni suma", () => {
    // Va por otro carril: no es el anterior devolviéndose (ese sí se resta).
    const r = pasar(motor(), [baja(), { x: 64, ys: sube() }, baja(), baja()]);
    expect([r.total, r.sentido]).toEqual([3, "abajo"]);
  });

  it("sin sentido automático, si el agua sube al revés de lo ajustado no cuenta (como antes)", () => {
    expect(pasar(motor({ sentidoAutomatico: false }), [sube(), sube(), sube()]).total).toBe(0);
  });

  it("al empezar a mirar el canal de nuevo, vuelve a averiguar el sentido", () => {
    const m = motor();
    expect(pasar(m, [sube(), sube(), sube()]).sentidoDecidido).toBe(true);
    m.reiniciarFondo();
    const r = pasar(m, [baja()]);
    expect([r.sentidoDecidido, r.total, r.sentido]).toEqual([false, 1, "abajo"]);
  });

  describe("en los primeros segundos, antes de saber el sentido", () => {
    /** Como `pasar`, pero anota si ya sabía el sentido al terminar cada alevino y suma lo que se informa. */
    function pasarAnotando(m: MotorConteo, recorridos: { x: number; ys: number[] }[]) {
      let r = m.procesar(cuadroCon([]));
      let informado = r.sumadosEnEsteCuadro;
      const decidido: boolean[] = [];
      for (const { x, ys } of recorridos) {
        for (const y of ys) {
          r = m.procesar(cuadroCon([{ x, y, ancho: 4, alto: 4 }]));
          informado += r.sumadosEnEsteCuadro;
        }
        decidido.push(r.sentidoDecidido);
        for (let i = 0; i < 5; i++) {
          r = m.procesar(cuadroCon([]));
          informado += r.sumadosEnEsteCuadro;
        }
      }
      return { r, informado, decidido };
    }

    it("uno sube contra la corriente (viene de la salida) y los demás bajan: el total queda exacto", () => {
      const { r, informado, decidido } = pasarAnotando(motor(), [
        { x: 30, ys: baja() },
        { x: 64, ys: sube() }, // contra la corriente: nunca cruzó hacia la salida, no cuenta ni resta
        { x: 30, ys: baja() },
        { x: 30, ys: baja() },
        { x: 30, ys: baja() },
      ]);
      expect(decidido.slice(0, 2)).toEqual([false, false]); // pasó cuando aún no sabía el sentido
      expect([r.total, r.sentido, r.sentidoDecidido]).toEqual([4, "abajo", true]);
      expect(informado).toBe(4); // lo que suma la pantalla
    });

    it("uno ya contado se devuelve por la franja antes de decidir: se resta", () => {
      const { r, informado, decidido } = pasarAnotando(motor(), [
        { x: 30, ys: [...baja(), ...recorrido(108, 4)] }, // baja, cruza, se da vuelta y sube
        { x: 30, ys: baja() },
        { x: 30, ys: baja() },
        { x: 30, ys: baja() },
      ]);
      expect(decidido[0]).toBe(false);
      expect([r.total, r.sentido]).toEqual([3, "abajo"]);
      expect(informado).toBe(3);
    });

    it("celular al revés y el primero nada contra la corriente: al decidir, ese no queda contado", () => {
      // El agua sube en la imagen; el primer alevino baja (contra la corriente) y por un momento
      // el conteo «abajo» va ganando 1 a 0. Al decidir «arriba», ese cruce no cuenta.
      const { r, informado, decidido } = pasarAnotando(motor(), [
        { x: 64, ys: baja() },
        { x: 30, ys: sube() },
        { x: 30, ys: sube() },
        { x: 30, ys: sube() },
      ]);
      expect(decidido[0]).toBe(false);
      expect([r.total, r.sentido, r.sentidoDecidido]).toEqual([3, "arriba", true]);
      expect(informado).toBe(3); // la pantalla sumó 1 y luego lo quitó: termina exacta
    });
  });
});
