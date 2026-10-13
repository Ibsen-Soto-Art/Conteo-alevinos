import { describe, expect, it } from "vitest";
import { crearManejador } from "../src/features/conteo/manejador";
import { CONTROLES_INICIALES, type Controles, type MensajeDelMotor } from "../src/features/conteo/protocolo";
import { cuadroRgba } from "./rgba";

const controles: Controles = { ...CONTROLES_INICIALES, umbral: 128, areaMinima: 6, lineaPorcentaje: 50, distanciaMaxima: 12 };

function totalDe(r: MensajeDelMotor | null): number {
  if (r?.tipo !== "resultado") throw new Error(`se esperaba un resultado y llegó ${JSON.stringify(r)}`);
  return r.total;
}

/** Hace bajar un alevino por el canal de 80 × 120 y devuelve el último total. */
function pasarAlevino(manejar: ReturnType<typeof crearManejador>, x = 30) {
  let total = 0;
  for (let y = 5; y < 110; y += 4) total = totalDe(manejar({ tipo: "cuadro", ancho: 80, alto: 120, rgba: cuadroRgba([{ x, y, lado: 4 }]) }));
  return total;
}

describe("manejador del worker", () => {
  it("responde con error si llega un cuadro antes de configurar", () => {
    const manejar = crearManejador();
    expect(manejar({ tipo: "cuadro", ancho: 80, alto: 120, rgba: cuadroRgba([]) })).toMatchObject({ tipo: "error" });
  });

  it("cuenta un alevino RGBA que cruza la línea al 50 %", () => {
    const manejar = crearManejador();
    expect(manejar({ tipo: "configurar", controles, ancho: 80, alto: 120 })).toBeNull();
    expect(pasarAlevino(manejar)).toBe(1);
  });

  it("devuelve las pistas y manchas para dibujarlas", () => {
    const manejar = crearManejador(() => 0);
    manejar({ tipo: "configurar", controles, ancho: 80, alto: 120 });
    const r = manejar({ tipo: "cuadro", ancho: 80, alto: 120, rgba: cuadroRgba([{ x: 10, y: 10, lado: 4 }]) });
    expect(r).toMatchObject({ tipo: "resultado", ms: 0, ancho: 80, alto: 120 });
    if (r?.tipo === "resultado") {
      expect(r.detecciones).toHaveLength(1);
      expect(r.pistas[0]).toMatchObject({ x: 11.5, y: 11.5, contada: false });
    }
  });

  it("cambiar el umbral en vivo no reinicia el conteo", () => {
    const manejar = crearManejador();
    manejar({ tipo: "configurar", controles, ancho: 80, alto: 120 });
    pasarAlevino(manejar);
    manejar({ tipo: "configurar", controles: { ...controles, umbral: 120 }, ancho: 80, alto: 120 });
    expect(pasarAlevino(manejar, 50)).toBe(2);
  });

  it("reiniciar pone el contador en cero", () => {
    const manejar = crearManejador();
    manejar({ tipo: "configurar", controles, ancho: 80, alto: 120 });
    pasarAlevino(manejar);
    manejar({ tipo: "reiniciar" });
    expect(totalDe(manejar({ tipo: "cuadro", ancho: 80, alto: 120, rgba: cuadroRgba([]) }))).toBe(0);
  });

  it("un cuadro de otro tamaño se rechaza en vez de leer memoria equivocada", () => {
    const manejar = crearManejador();
    manejar({ tipo: "configurar", controles, ancho: 80, alto: 120 });
    expect(manejar({ tipo: "cuadro", ancho: 40, alto: 60, rgba: cuadroRgba([], 40, 60) })).toMatchObject({ tipo: "error" });
  });
});
