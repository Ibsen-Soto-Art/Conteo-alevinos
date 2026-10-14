import { navegar } from "../../app/rutas";
import { AVISO_FALTAN, numeroBolsaAbierta, totalHoy } from "../../app/sesion";
import { useSesion } from "../../app/SesionContexto";
import { formatear } from "../../shared/formato";
import { IconoAviso, IconoBolsa, IconoChulo, IconoPausa, IconoSeguir, IconoSol } from "../../shared/ui/Iconos";
import { Pantalla } from "../../shared/ui/Pantalla";

export function Contando() {
  const { estado, despachar } = useSesion();
  const { meta, enBolsa, pausado } = estado;
  const faltan = meta === null ? null : Math.max(0, meta - enBolsa);
  const cerca = faltan !== null && faltan > 0 && faltan <= AVISO_FALTAN;
  const llego = faltan === 0;
  const avance = meta === null ? 0 : Math.min(1, enBolsa / meta);

  return (
    <Pantalla
      className={`contando ${cerca ? "contando-cerca" : ""} ${llego ? "contando-llego" : ""}`}
      cabecera={
        <div className="camara">
          {/* La cámara real se conecta en la parte 3. */}
          <div className="camara-linea" />
          <span className="estado estado-exito camara-luz">
            <IconoSol /> Luz bien
          </span>
          <span className="estado camara-bolsa">
            <IconoBolsa /> Bolsa {numeroBolsaAbierta(estado)}
          </span>
        </div>
      }
      pie={
        <>
          <button
            type="button"
            className="boton boton-secundario"
            aria-pressed={pausado}
            onClick={() => despachar({ tipo: pausado ? "seguir" : "pausar" })}
          >
            {pausado ? (
              <>
                <IconoSeguir /> Seguir
              </>
            ) : (
              <>
                <IconoPausa /> Pausar
              </>
            )}
          </button>
          <button
            type="button"
            className="boton boton-principal"
            onClick={() => {
              despachar({ tipo: "cerrarBolsa" });
              navegar("bolsa-lista", { reemplazar: true });
            }}
          >
            <IconoBolsa /> Cerrar bolsa
          </button>
        </>
      }
    >
      <div className="contador">
        <output className="contador-numero" aria-live="polite">
          {formatear(enBolsa)}
        </output>
        <span className="contador-de">{meta === null ? "alevinos en esta bolsa" : `de ${formatear(meta)}`}</span>
        {meta !== null && (
          <div className="avance" role="progressbar" aria-valuemin={0} aria-valuemax={meta} aria-valuenow={enBolsa}>
            <span style={{ width: `${avance * 100}%` }} />
          </div>
        )}
        {pausado ? (
          <p className="estado-grande estado-aviso">
            <IconoPausa /> En pausa
          </p>
        ) : llego ? (
          <p className="estado-grande estado-exito">
            <IconoChulo /> ¡Llegó! Cierre la compuerta
          </p>
        ) : cerca ? (
          <p className="estado-grande estado-aviso">
            <IconoAviso /> Faltan {formatear(faltan!)}: más despacio
          </p>
        ) : (
          faltan !== null && <p className="faltan">Faltan {formatear(faltan)}</p>
        )}
      </div>
      <p className="total-hoy">
        Total hoy: <strong>{formatear(totalHoy(estado))}</strong>
      </p>
    </Pantalla>
  );
}
