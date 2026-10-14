import { describe, expect, it } from "vitest";
import { guardarAjustes, leerAjustes } from "../src/features/conteo/ajustes";
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
});
