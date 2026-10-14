import { calcularCalibracion } from "@contador/domain";
import { useState } from "react";
import { navegar } from "../../app/rutas";
import { useSesion } from "../../app/SesionContexto";
import { BarraPasos } from "../../shared/ui/BarraPasos";
import { IconoChulo, IconoDeshacer, IconoProblema, IconoSiguiente } from "../../shared/ui/Iconos";
import { Pantalla } from "../../shared/ui/Pantalla";

const MANO = 100;

const PASOS = ["Cuente 100 alevinos a mano", "Échelos al canal", "Mire cuántos contó la app"];

export function Prueba100() {
  const { estado, despachar } = useSesion();
  // Mientras no esté conectado el motor (parte 3), el número en vivo es de ejemplo.
  const [enVivo] = useState(97);
  const terminada = estado.pruebaApp !== null;
  const contados = estado.pruebaApp ?? enVivo;
  const resultado = terminada ? calcularCalibracion([{ contadosAMano: MANO, contadosPorApp: contados }]) : null;

  return (
    <Pantalla
      cabecera={<BarraPasos paso={2} onVolver={() => navegar("pez")} />}
      pie={
        !terminada ? (
          <button type="button" className="boton boton-principal" onClick={() => despachar({ tipo: "resultadoPrueba", contados: enVivo })}>
            <IconoChulo /> Ya pasaron todos
          </button>
        ) : resultado?.ok ? (
          <>
            <button type="button" className="boton boton-secundario" onClick={() => despachar({ tipo: "repetirPrueba" })}>
              <IconoDeshacer /> Repetir
            </button>
            <button type="button" className="boton boton-principal" onClick={() => navegar("meta")}>
              Siguiente <IconoSiguiente />
            </button>
          </>
        ) : (
          <button type="button" className="boton boton-principal" onClick={() => despachar({ tipo: "repetirPrueba" })}>
            <IconoDeshacer /> Repetir la prueba
          </button>
        )
      }
    >
      <h2 className="pregunta">Prueba de 100</h2>
      <ol className="pasos-numerados">
        {PASOS.map((p, i) => (
          <li key={p}>
            <span className="numero-paso">{i + 1}</span>
            {p}
          </li>
        ))}
      </ol>

      <div className="circulo-zona">
        <div className={`circulo ${resultado ? (resultado.ok ? "circulo-bien" : "circulo-mal") : ""}`}>
          <strong className="circulo-numero">{contados}</strong>
          <span className="circulo-de">de {MANO}</span>
        </div>
      </div>

      {resultado &&
        (resultado.ok ? (
          <p className="estado-grande estado-exito">
            <IconoChulo /> Prueba buena
          </p>
        ) : (
          <div className="estado-grande estado-problema">
            <IconoProblema />
            <div>
              <strong>Prueba mala</strong>
              <span className="estado-detalle">Revise la luz, que pasen de a pocos y que el teléfono no se haya movido.</span>
            </div>
          </div>
        ))}
    </Pantalla>
  );
}
