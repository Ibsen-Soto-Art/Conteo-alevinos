import { useState } from "react";
import { navegar } from "../../app/rutas";
import { useSesion } from "../../app/SesionContexto";
import { nombreEspecie, nombreTalla } from "../../shared/catalogo";
import { bolsas, cuando, formatear } from "../../shared/formato";
import { IconoInicio } from "../../shared/ui/Iconos";
import { Pantalla } from "../../shared/ui/Pantalla";
import { Paginador, paginar } from "../../shared/ui/Paginador";

const POR_PAGINA = 4;

export function Conteos() {
  const { estado } = useSesion();
  const [pagina, setPagina] = useState(0);
  const { visibles, paginas, actual } = paginar(estado.historial, POR_PAGINA, pagina);

  return (
    <Pantalla
      cabecera={<h2 className="pregunta">Conteos</h2>}
      pie={
        <button type="button" className="boton boton-principal" onClick={() => navegar("inicio")}>
          <IconoInicio /> Volver al inicio
        </button>
      }
    >
      {visibles.length === 0 ? (
        <p className="vacio">Todavía no hay conteos.</p>
      ) : (
        <ul className="lista-conteos">
          {visibles.map((c) => (
            <li key={c.id} className="tarjeta">
              <span className="tarjeta-titulo">{cuando(new Date(c.fecha))}</span>
              <strong className="tarjeta-numero">{formatear(c.bolsas.reduce((s, b) => s + b, 0))} alevinos</strong>
              <span>
                {nombreEspecie(c.especie)} {nombreTalla(c.talla)} · {bolsas(c.bolsas.length)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Paginador actual={actual} paginas={paginas} onCambio={setPagina} />
    </Pantalla>
  );
}
