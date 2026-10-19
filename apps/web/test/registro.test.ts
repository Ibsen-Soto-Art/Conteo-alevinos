import { describe, expect, it } from "vitest";
import { registroCsv, resumenRegistro, type FilaRegistro } from "../src/features/laboratorio/registro";

const fila = (parcial: Partial<FilaRegistro>): FilaRegistro => ({
  hora: "00:01.500",
  cuadro: 45,
  tiempo: 1500,
  id: 12,
  x: 50,
  y: 300,
  cambio: 1,
  peso: 1,
  pesos: [1, 1, 2],
  largo: 32.4,
  ancho: 6.1,
  area: 150,
  cuadrosSeguidos: 40,
  sentido: "abajo",
  decidido: true,
  unida: false,
  nacioEnFranja: false,
  recuperada: 0,
  separadaDe: null,
  llevadaPor: null,
  totalMostrado: 7,
  pxPorCm: 16,
  ...parcial,
});

describe("registro de conteo del laboratorio", () => {
  it("una fila por evento, con el largo y ancho también en cm", () => {
    const csv = registroCsv([fila({}), fila({ id: 13, cambio: -1, peso: 2, pesos: [2, 2], nacioEnFranja: true, pxPorCm: null, separadaDe: 4, llevadaPor: 9 })]).trim().split("\n");
    expect(csv[0]).toBe(
      "hora,cuadro,id,cambio,total_mostrado,peso,pesos_ultimos_cuadros,largo_px,ancho_px,area_px,largo_cm,ancho_cm,cuadros_seguidos,sentido,sentido_decidido,pedazos_unidos,nacio_en_franja,recuperada,separada_de,llevada_por",
    );
    expect(csv[1]).toBe("00:01.500,45,12,+1,7,1,1 1 2,32.4,6.1,150,2.02,0.38,40,abajo,si,no,no,0,,");
    expect(csv[2]).toBe("00:01.500,45,13,-1,7,2,2 2,32.4,6.1,150,,,40,abajo,si,no,si,0,4,9");
  });

  it("resume qué subió el contador: lo que sobra por peso, las restas y las pistas nuevas", () => {
    const r = resumenRegistro(
      [fila({}), fila({ id: 2, cambio: 2, peso: 2 }), fila({ id: 3, cambio: -1 }), fila({ id: 4, nacioEnFranja: true }), fila({ id: 5, sentido: "arriba" })],
      "abajo",
    );
    expect(r).toEqual({ total: 3, conPesoMayorQue1: 2, extraPorPeso: 1, restas: -1, nacidasEnFranja: 1, recuperadas: 0, unidas: 0, separadas: 0, llevadas: 0 });
  });
});
