import { useState } from "react";
import { Confirmar } from "./Confirmar";
import { IconoReiniciar } from "./Iconos";

/** Botón secundario «Volver a cero» que siempre pide confirmación. Apagado si ya está en 0. */
export function BotonVolverACero({
  enCero,
  detalle,
  onConfirmar,
  className = "",
}: {
  enCero: boolean;
  detalle: string;
  onConfirmar: () => void;
  className?: string;
}) {
  const [preguntando, setPreguntando] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`boton boton-secundario boton-cero ${className}`}
        disabled={enCero}
        onClick={() => setPreguntando(true)}
      >
        <IconoReiniciar /> Volver a cero
      </button>
      {preguntando && (
        <Confirmar
          titulo="¿Volver a cero?"
          detalle={detalle}
          si="Sí, volver a cero"
          onSi={() => {
            setPreguntando(false);
            onConfirmar();
          }}
          onNo={() => setPreguntando(false)}
        />
      )}
    </>
  );
}
