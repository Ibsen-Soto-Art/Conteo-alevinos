export type Especie = "cachama" | "tilapia" | "bocachico" | "yaque" | "pintadillo" | "pangasius";
export type Talla = "pequeno" | "mediano" | "grande";

export const ESPECIES: { id: Especie; nombre: string }[] = [
  { id: "cachama", nombre: "Cachama" },
  { id: "tilapia", nombre: "Tilapia" },
  { id: "bocachico", nombre: "Bocachico" },
  { id: "yaque", nombre: "Yaque" },
  { id: "pintadillo", nombre: "Pintadillo" },
  { id: "pangasius", nombre: "Pangasius" },
];

export const TALLAS: { id: Talla; nombre: string }[] = [
  { id: "pequeno", nombre: "Pequeño" },
  { id: "mediano", nombre: "Mediano" },
  { id: "grande", nombre: "Grande" },
];

export function nombreEspecie(id: Especie | null): string {
  return ESPECIES.find((e) => e.id === id)?.nombre ?? "";
}

export function nombreTalla(id: Talla | null): string {
  return TALLAS.find((t) => t.id === id)?.nombre.toLowerCase() ?? "";
}
