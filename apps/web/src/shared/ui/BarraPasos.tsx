import { IconoVolver } from "./Iconos";

/** «Paso 1 de 3» con su barra de avance y el botón Volver. */
export function BarraPasos({ paso, total = 3, onVolver }: { paso: number; total?: number; onVolver: () => void }) {
  return (
    <div className="barra-pasos">
      <button type="button" className="boton boton-volver" onClick={onVolver}>
        <IconoVolver /> Volver
      </button>
      <div className="pasos">
        <span className="pasos-texto">
          Paso {paso} de {total}
        </span>
        <div className="pasos-barra" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={paso}>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={i < paso ? "lleno" : ""} />
          ))}
        </div>
      </div>
    </div>
  );
}
