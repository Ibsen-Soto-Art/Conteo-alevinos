import { useEffect, useState } from "react";

export const RUTAS = ["inicio", "pez", "prueba", "meta", "contando", "bolsa-lista", "resumen", "conteos", "ayuda"] as const;
export type Ruta = (typeof RUTAS)[number];

/** «#/meta» → «meta». Cualquier cosa desconocida lleva al inicio. */
export function rutaDesdeHash(hash: string): Ruta {
  const nombre = hash.replace(/^#\/?/, "");
  return (RUTAS as readonly string[]).includes(nombre) ? (nombre as Ruta) : "inicio";
}

/**
 * Navegación por hash: funciona sin servidor y el botón atrás del teléfono sirve.
 * `reemplazar` se usa cuando volver atrás no tendría sentido (por ejemplo, tras cerrar una bolsa).
 */
export function navegar(ruta: Ruta, { reemplazar = false } = {}) {
  const hash = `#/${ruta === "inicio" ? "" : ruta}`;
  if (reemplazar) location.replace(hash);
  else location.hash = hash;
}

export function useRuta(): Ruta {
  const [ruta, setRuta] = useState(() => rutaDesdeHash(location.hash));
  useEffect(() => {
    const alCambiar = () => setRuta(rutaDesdeHash(location.hash));
    window.addEventListener("hashchange", alCambiar);
    return () => window.removeEventListener("hashchange", alCambiar);
  }, []);
  return ruta;
}
