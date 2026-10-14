import { useState } from "react";
import { navegar } from "../../app/rutas";
import { useSesion } from "../../app/SesionContexto";
import { nombreEspecie, nombreTalla } from "../../shared/catalogo";
import { formatear } from "../../shared/formato";
import { IconoChulo, IconoInicio } from "../../shared/ui/Iconos";
import { Pantalla } from "../../shared/ui/Pantalla";
import { Paginador, paginar } from "../../shared/ui/Paginador";
import { Redirigir } from "../../shared/ui/Redirigir";

const BOLSAS_POR_PAGINA = 9;

export function Resumen() {
  const { estado } = useSesion();
  const [pagina, setPagina] = useState(0);
  const conteo = estado.historial[0];

  if (!conteo) {
    return <Redirigir a="inicio" />;
  }

  const total = conteo.bolsas.reduce((s, b) => s + b, 0);
  const bolsas = conteo.bolsas.map((cantidad, i) => ({ numero: i + 1, cantidad }));
  const { visibles, paginas, actual } = paginar(bolsas, BOLSAS_POR_PAGINA, pagina);

  return (
    <Pantalla
      cabecera={
        <p className="estado-grande estado-exito">
          <IconoChulo /> Conteo terminado
        </p>
      }
      pie={
        <button type="button" className="boton boton-principal" onClick={() => navegar("inicio", { reemplazar: true })}>
          <IconoInicio /> Listo, volver al inicio
        </button>
      }
    >
      <div className="resumen-total">
        <strong>{formatear(total)}</strong>
        <span>
          alevinos en <b>{conteo.bolsas.length}</b> {conteo.bolsas.length === 1 ? "bolsa" : "bolsas"} ·{" "}
          {nombreEspecie(conteo.especie)} {nombreTalla(conteo.talla)}
        </span>
      </div>
      <ul className="cuadricula-bolsas">
        {visibles.map((b) => (
          <li key={b.numero}>
            <span>Bolsa {b.numero}</span>
            <strong>{formatear(b.cantidad)}</strong>
          </li>
        ))}
      </ul>
      <Paginador actual={actual} paginas={paginas} onCambio={setPagina} />
    </Pantalla>
  );
}
