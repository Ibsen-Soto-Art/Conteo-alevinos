import { useEffect } from "react";
import { navegar, type Ruta } from "../../app/rutas";

/** Para pantallas que no tienen sentido sin datos (por ejemplo, Resumen sin conteo). */
export function Redirigir({ a }: { a: Ruta }) {
  useEffect(() => navegar(a, { reemplazar: true }), [a]);
  return null;
}
