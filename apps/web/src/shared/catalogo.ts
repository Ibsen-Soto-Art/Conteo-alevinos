import type { EspeciePerfil, TamanoPerfil } from "@contador/domain";

/** Lo que el campesino elige en «Qué pez»: tres especies con perfil propio y «Otra especie». */
export type Especie = EspeciePerfil;
export type Talla = TamanoPerfil;

export const ESPECIES: { id: Especie; nombre: string }[] = [
  { id: "cachama", nombre: "Cachama" },
  { id: "pangasius", nombre: "Pangasius" },
  { id: "bocachico", nombre: "Bocachico" },
  { id: "otra", nombre: "Otra especie" },
];

/** Especies que se podían elegir antes: los conteos viejos las siguen mostrando con su nombre. */
const ESPECIES_ANTERIORES: Record<string, string> = { tilapia: "Tilapia", yaque: "Yaque", pintadillo: "Pintadillo" };

export const TALLAS: { id: Talla; nombre: string }[] = [
  { id: "pequeno", nombre: "Pequeño" },
  { id: "mediano", nombre: "Mediano" },
  { id: "grande", nombre: "Grande" },
];

/** Nombre para mostrar; acepta también especies de conteos viejos. */
export function nombreEspecie(id: string | null): string {
  if (!id) return "";
  return ESPECIES.find((e) => e.id === id)?.nombre ?? ESPECIES_ANTERIORES[id] ?? id;
}

export function nombreTalla(id: string | null): string {
  return TALLAS.find((t) => t.id === id)?.nombre.toLowerCase() ?? "";
}
