import { IconoSiguiente, IconoVolver } from "./Iconos";

/** Listas largas van por páginas, nunca con scroll. */
export function paginar<T>(items: T[], porPagina: number, pagina: number) {
  const paginas = Math.max(1, Math.ceil(items.length / porPagina));
  const actual = Math.min(Math.max(0, pagina), paginas - 1);
  return { visibles: items.slice(actual * porPagina, (actual + 1) * porPagina), paginas, actual };
}

export function Paginador({ actual, paginas, onCambio }: { actual: number; paginas: number; onCambio: (p: number) => void }) {
  if (paginas <= 1) return null;
  return (
    <nav className="paginador" aria-label="Páginas">
      <button type="button" className="boton" disabled={actual === 0} onClick={() => onCambio(actual - 1)}>
        <IconoVolver /> Antes
      </button>
      <span className="paginador-texto">
        {actual + 1} de {paginas}
      </span>
      <button type="button" className="boton" disabled={actual === paginas - 1} onClick={() => onCambio(actual + 1)}>
        Después <IconoSiguiente />
      </button>
    </nav>
  );
}
