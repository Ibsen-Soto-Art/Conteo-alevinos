import { IconoGirar } from "./Iconos";

/** Solo vertical: si el teléfono se acuesta, se pide ponerlo derecho (lo muestra el CSS). */
export function AvisoGirar() {
  return (
    <div className="aviso-girar" role="alert">
      <IconoGirar />
      <p>Ponga el teléfono derecho</p>
    </div>
  );
}
