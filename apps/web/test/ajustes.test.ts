import { describe, expect, it } from "vitest";
import { ajustesDelCampesino, guardarAjustes, guardarSentido, leerAjustes, leerSentidoGuardado } from "../src/features/conteo/ajustes";
import { CONTROLES_INICIALES } from "../src/features/conteo/protocolo";

function almacen() {
  const datos = new Map<string, string>();
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v) };
}

describe("ajustes del motor", () => {
  it("sin nada guardado usa los de fábrica", () => {
    expect(leerAjustes(almacen())).toEqual(CONTROLES_INICIALES);
    expect(leerAjustes(undefined)).toEqual(CONTROLES_INICIALES);
  });

  it("lo que se afina en el laboratorio lo lee la app", () => {
    const a = almacen();
    guardarAjustes({ ...CONTROLES_INICIALES, umbral: 140, sentido: "izquierda" }, a);
    expect(leerAjustes(a)).toMatchObject({ umbral: 140, sentido: "izquierda" });
  });

  it("si lo guardado está dañado vuelve a los de fábrica", () => {
    const a = almacen();
    a.setItem("contador.ajustesMotor", "{no es json");
    expect(leerAjustes(a)).toEqual(CONTROLES_INICIALES);
  });

  it("un navegador que no deja guardar no rompe la app", () => {
    const roto = { setItem: () => { throw new Error("modo privado"); } };
    expect(() => guardarAjustes(CONTROLES_INICIALES, roto)).not.toThrow();
  });

  describe("sentido del agua guardado", () => {
    it("sin conteo anterior parte de «abajo», con la franja cerca de la salida", () => {
      const { ajustes, sentidoConocido } = ajustesDelCampesino(almacen());
      expect([ajustes.sentido, ajustes.lineaPorcentaje, sentidoConocido]).toEqual(["abajo", 75, false]);
    });

    it("el siguiente conteo parte del último sentido decidido, con la franja cerca de su salida", () => {
      const a = almacen();
      guardarSentido("arriba", a);
      expect(leerSentidoGuardado(a)).toBe("arriba");
      const { ajustes, sentidoConocido } = ajustesDelCampesino(a);
      // El agua sube: la salida está arriba, la franja al 25 % desde arriba.
      expect([ajustes.sentido, ajustes.lineaPorcentaje, sentidoConocido]).toEqual(["arriba", 25, true]);
    });

    it("lo guardado en el laboratorio no cambia el sentido ni la franja; lo dañado se ignora", () => {
      const a = almacen();
      guardarAjustes({ ...CONTROLES_INICIALES, umbral: 140, sentido: "izquierda", lineaPorcentaje: 40 }, a);
      expect(ajustesDelCampesino(a).ajustes).toMatchObject({ umbral: 140, sentido: "abajo", lineaPorcentaje: 75 });
      a.setItem("contador.sentidoAgua", "diagonal");
      expect(leerSentidoGuardado(a)).toBeNull();
    });
  });
});
