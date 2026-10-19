import type { PerfilForma } from "../src";

/** Un perfil como «Otra especie mediano» de packages/domain/src/perfiles.ts (el motor no depende de domain). */
export const PERFIL_PRUEBA: PerfilForma = {
  largoCm: [2.1, 6.5],
  anchoCm: [0.21, 4.06],
  areaCm2: [0.29, 17.2],
  relacionArriba: [2.5, 10],
  relacionLado: [1.6, 6],
  solidezMinima: 0.55,
  cierreRelativo: 0.3,
  velocidadCmS: { tipica: 15, maxima: 35 },
};
