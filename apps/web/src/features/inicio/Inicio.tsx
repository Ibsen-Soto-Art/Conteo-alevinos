import { navegar } from "../../app/rutas";
import { useSesion } from "../../app/SesionContexto";
import { nombreEspecie, nombreTalla } from "../../shared/catalogo";
import { cuando, formatear } from "../../shared/formato";
import { DibujoPez, IconoAyuda, IconoChulo, IconoLista } from "../../shared/ui/Iconos";
import { Pantalla } from "../../shared/ui/Pantalla";

export function Inicio() {
  const { estado, despachar } = useSesion();
  const ultimo = estado.historial[0];

  return (
    <Pantalla
      className="inicio"
      cabecera={
        <div className="inicio-cabecera">
          <h1 className="finca">{estado.finca}</h1>
          <span className="estado estado-exito">
            <IconoChulo /> Todo guardado
          </span>
        </div>
      }
      pie={
        ultimo && (
          <div className="tarjeta ultimo-conteo">
            <span className="tarjeta-titulo">Último conteo · {cuando(new Date(ultimo.fecha))}</span>
            <strong className="tarjeta-numero">{formatear(ultimo.bolsas.reduce((s, b) => s + b, 0))} alevinos</strong>
            <span>
              {nombreEspecie(ultimo.especie)} {nombreTalla(ultimo.talla)} · {ultimo.bolsas.length} bolsas
            </span>
          </div>
        )
      }
    >
      <button
        type="button"
        className="boton-contar"
        onClick={() => {
          despachar({ tipo: "empezar" });
          navegar("pez");
        }}
      >
        <DibujoPez className="boton-contar-pez" />
        <span>Contar alevinos</span>
      </button>
      <div className="fila-botones">
        <button type="button" className="boton boton-secundario" onClick={() => navegar("conteos")}>
          <IconoLista /> Conteos
        </button>
        <button type="button" className="boton boton-secundario" onClick={() => navegar("ayuda")}>
          <IconoAyuda /> Ayuda
        </button>
      </div>
    </Pantalla>
  );
}
