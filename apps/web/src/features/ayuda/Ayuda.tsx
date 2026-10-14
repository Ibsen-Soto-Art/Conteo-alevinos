import { navegar } from "../../app/rutas";
import { IconoInicio } from "../../shared/ui/Iconos";
import { Pantalla } from "../../shared/ui/Pantalla";

const PASOS = [
  "Ponga el teléfono en el soporte, mirando al canal.",
  "Prenda la luz de abajo del canal.",
  "Toque «Contar alevinos» y elija el pez.",
  "Haga la prueba de 100.",
  "Eche los alevinos de a pocos.",
  "Cierre cada bolsa cuando la app le avise.",
];

export function Ayuda() {
  return (
    <Pantalla
      cabecera={<h2 className="pregunta">Cómo contar</h2>}
      pie={
        <button type="button" className="boton boton-principal" onClick={() => navegar("inicio")}>
          <IconoInicio /> Volver al inicio
        </button>
      }
    >
      <ol className="pasos-numerados pasos-ayuda">
        {PASOS.map((p, i) => (
          <li key={p}>
            <span className="numero-paso">{i + 1}</span>
            {p}
          </li>
        ))}
      </ol>
    </Pantalla>
  );
}
