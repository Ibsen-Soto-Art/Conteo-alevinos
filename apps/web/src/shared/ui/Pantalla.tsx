import type { ReactNode } from "react";

/**
 * Molde de todas las pantallas: cabecera fija, centro que se encoge y pie con el botón principal.
 * Nunca hay scroll: si algo no cabe, el centro se encoge (ver docs/diseno.md).
 */
export function Pantalla({
  cabecera,
  children,
  pie,
  className = "",
  clasePie = "",
}: {
  cabecera?: ReactNode;
  children: ReactNode;
  pie?: ReactNode;
  className?: string;
  clasePie?: string;
}) {
  return (
    <section className={`pantalla ${className}`}>
      {cabecera && <header className="pantalla-cabecera">{cabecera}</header>}
      <div className="pantalla-centro">{children}</div>
      {pie && <footer className={`pantalla-pie ${clasePie}`}>{pie}</footer>}
    </section>
  );
}
