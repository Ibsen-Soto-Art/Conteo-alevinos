import { useEffect, useRef, type ComponentType } from "react";
import { IconoReiniciar } from "./Iconos";

/**
 * Cuadro grande para confirmar una acción que se haría por accidente con las manos mojadas.
 * Los dos botones miden al menos 72 px; «No» queda enfocado.
 */
export function Confirmar({
  titulo,
  detalle,
  si,
  onSi,
  onNo,
  Icono = IconoReiniciar,
}: {
  /** El dibujo de arriba: por defecto la flecha de «volver a cero». */
  Icono?: ComponentType<{ className?: string }>;
  titulo: string;
  detalle?: string;
  si: string;
  onSi: () => void;
  onNo: () => void;
}) {
  const no = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    no.current?.focus();
    const alTeclado = (e: KeyboardEvent) => e.key === "Escape" && onNo();
    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [onNo]);

  return (
    <div className="confirmar-fondo" onClick={onNo}>
      <div
        className="confirmar"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmar-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <Icono className="confirmar-icono" />
        <h2 id="confirmar-titulo" className="confirmar-titulo">
          {titulo}
        </h2>
        {detalle && <p className="confirmar-detalle">{detalle}</p>}
        <button type="button" className="boton boton-confirmar boton-peligro" onClick={onSi}>
          {si}
        </button>
        <button ref={no} type="button" className="boton boton-confirmar" onClick={onNo}>
          No
        </button>
      </div>
    </div>
  );
}
