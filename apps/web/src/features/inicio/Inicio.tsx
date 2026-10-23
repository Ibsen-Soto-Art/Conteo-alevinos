import { useState } from "react";
import { useMotorCompartido } from "../../app/MotorContexto";
import { navegar } from "../../app/rutas";
import { enBolsa, numeroBolsaAbierta, totalHoy } from "../../app/sesion";
import { useSesion } from "../../app/SesionContexto";
import { nombreEspecie, nombreTalla } from "../../shared/catalogo";
import { bolsas, cuando, formatear } from "../../shared/formato";
import { Confirmar } from "../../shared/ui/Confirmar";
import { DibujoPez, IconoAyuda, IconoChulo, IconoLista, IconoProblema, IconoSeguir, IconoTerminar } from "../../shared/ui/Iconos";
import { Pantalla } from "../../shared/ui/Pantalla";

export function Inicio() {
  const { estado, despachar, acciones } = useSesion();
  const motor = useMotorCompartido();
  const ultimo = estado.historial[0];
  const [terminando, setTerminando] = useState(false);

  return (
    <Pantalla
      className="inicio"
      cabecera={
        <div className="inicio-cabecera">
          <h1 className="finca">{estado.finca}</h1>
          {estado.guardado ? (
            <span className="estado estado-exito">
              <IconoChulo /> Todo guardado
            </span>
          ) : (
            <span className="estado estado-problema">
              <IconoProblema /> No se pudo guardar
            </span>
          )}
        </div>
      }
      pie={
        ultimo && (
          <div className="tarjeta ultimo-conteo">
            <span className="tarjeta-titulo">Último conteo · {cuando(new Date(ultimo.fecha))}</span>
            <strong className="tarjeta-numero">{formatear(ultimo.bolsas.reduce((s, b) => s + b, 0))} alevinos</strong>
            <span>
              {nombreEspecie(ultimo.especie)} {nombreTalla(ultimo.talla)} · {bolsas(ultimo.bolsas.length)}
            </span>
          </div>
        )
      }
    >
      {estado.conteo ? (
        // Hay un conteo abierto (se volvió atrás o la página se cerró contando): se sigue, no se pierde.
        <>
          <button type="button" className="boton-contar boton-seguir" onClick={() => navegar("contando")}>
            <IconoSeguir className="boton-seguir-icono" />
            <span>Seguir contando</span>
            <span className="boton-seguir-detalle">
              Bolsa {numeroBolsaAbierta(estado)} · {formatear(enBolsa(estado))} en esta bolsa · total {formatear(totalHoy(estado))}
            </span>
          </button>
          <div className="fila-botones">
            <button type="button" className="boton boton-secundario" onClick={() => setTerminando(true)}>
              <IconoTerminar /> Terminar
            </button>
            <button type="button" className="boton boton-secundario" onClick={() => navegar("ayuda")}>
              <IconoAyuda /> Ayuda
            </button>
          </div>
          {terminando && (
            <Confirmar
              Icono={IconoTerminar}
              titulo="¿Terminar el conteo?"
              detalle={enBolsa(estado) > 0 ? `La bolsa ${numeroBolsaAbierta(estado)} (${formatear(enBolsa(estado))}) se cierra y todo queda guardado.` : "Lo contado queda guardado."}
              si="Sí, terminar"
              onSi={() => {
                setTerminando(false);
                const quedo = acciones.terminarDesdeInicio();
                if (quedo) navegar("resumen");
              }}
              onNo={() => setTerminando(false)}
            />
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            className="boton-contar"
            onClick={() => {
              despachar({ tipo: "empezar" });
              motor.enviar({ tipo: "olvidarArea" }); // lote nuevo: el motor vuelve a aprender el tamaño
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
        </>
      )}
    </Pantalla>
  );
}
