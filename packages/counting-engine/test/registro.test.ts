import { describe, expect, it } from "vitest";
import { MotorConteo, type ConfiguracionMotor, type EventoConteo } from "../src";
import { cuadroCon } from "./sintetico";

function motor(parcial: Partial<ConfiguracionMotor> = {}) {
  return new MotorConteo({
    detector: { umbral: 128, areaMinima: 6, areaTipica: 16 },
    rastreador: { distanciaMaxima: 12, cuadrosDeGracia: 2 },
    posicionLinea: 80,
    franja: { inicio: 70, fin: 90 },
    sentido: "abajo",
    aprenderAreaTipica: false,
    ...parcial,
  });
}

function pasar(m: MotorConteo, ys: number[]) {
  const eventos: EventoConteo[] = [];
  for (const y of ys) eventos.push(...m.procesar(cuadroCon([{ x: 30, y, ancho: 4, alto: 4 }]), y * 10).eventos);
  return eventos;
}
const de = (a: number, b: number) => Array.from({ length: Math.abs(b - a) / 4 + 1 }, (_, i) => a + Math.sign(b - a) * 4 * i);

describe("registro de eventos de conteo", () => {
  it("cada cambio del total dice qué pista lo causó, cuánto, dónde y cuántos cuadros la siguió", () => {
    const ev = pasar(motor(), [...de(20, 110), ...de(106, 40), ...de(44, 110)]);
    expect(ev.map((e) => [e.id, e.cambio])).toEqual([
      [1, 1],
      [1, -1],
      [1, 1],
    ]);
    const [primero] = ev;
    expect(primero).toMatchObject({ peso: 1, sentido: "abajo", decidido: true, nacioEnFranja: false, recuperada: 0, unida: false });
    expect(primero!.y).toBeGreaterThan(90);
    expect(primero!.cuadrosSeguidos).toBeGreaterThan(15);
    // El centro del cuadradito de 4 px está 1,5 px más abajo de donde se dibuja.
    expect(primero!.tiempo).toBe((primero!.y - 1.5) * 10);
  });

  it("marca la pista que nació dentro de la franja", () => {
    const ev = pasar(motor(), de(78, 110));
    expect(ev).toHaveLength(1);
    expect(ev[0]!.nacioEnFranja).toBe(true);
  });
});
