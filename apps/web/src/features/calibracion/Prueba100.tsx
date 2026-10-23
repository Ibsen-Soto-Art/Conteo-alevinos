import { calcularCalibracion, perfilDe } from "@contador/domain";
import { useMemo, useState } from "react";
import { PRUEBA_A_MANO } from "../../app/acciones";
import { useMotorCompartido } from "../../app/MotorContexto";
import { navegar } from "../../app/rutas";
import { useSesion } from "../../app/SesionContexto";
import { BarraPasos } from "../../shared/ui/BarraPasos";
import { IconoChulo, IconoDeshacer, IconoProblema, IconoSiguiente } from "../../shared/ui/Iconos";
import { BotonVolverACero } from "../../shared/ui/BotonVolverACero";
import { Pantalla } from "../../shared/ui/Pantalla";
import { Redirigir } from "../../shared/ui/Redirigir";
import { useWakeLock } from "../../shared/useWakeLock";
import { useConteoEnVivo } from "../conteo/useConteoEnVivo";
import { AvisoAlReves, AvisoFlujo, AvisoLuz, VistaCamara } from "../conteo/VistaCamara";

const MANO = PRUEBA_A_MANO;

const PASOS = ["Cuente 100 alevinos a mano", "Échelos al canal", "Mire cuántos contó la app"];

export function Prueba100() {
  const { estado, despachar, acciones } = useSesion();
  const motor = useMotorCompartido();
  const terminada = estado.pruebaApp !== null;
  // Con un conteo abierto (se volvió atrás desde Contando) se va al Inicio, que ofrece seguirlo.
  const [conConteo] = useState(() => estado.conteo !== null);
  const enVivo = estado.pruebaEnVivo;
  const perfil = useMemo(() => (estado.especie && estado.talla ? perfilDe(estado.especie, estado.talla) : null), [estado.especie, estado.talla]);
  const vivo = useConteoEnVivo({ activo: !terminada && !conConteo, onSumados: (n) => despachar({ tipo: "sumarPrueba", cantidad: n }), perfil });
  useWakeLock(!terminada && !conConteo);

  const contados = estado.pruebaApp ?? enVivo;
  const resultado = terminada ? calcularCalibracion([{ contadosAMano: MANO, contadosPorApp: contados }]) : null;
  const repetir = () => despachar({ tipo: "repetirPrueba" });

  if (conConteo) return <Redirigir a="inicio" />;
  if (!estado.especie || !estado.talla) return <Redirigir a="pez" />;

  return (
    <Pantalla
      className={terminada ? "" : "prueba-viva"}
      clasePie={terminada ? "" : "pie-columna"}
      cabecera={
        <div className="cabecera-con-camara">
          <BarraPasos paso={2} onVolver={() => navegar("pez")} />
          {!terminada && (
            <VistaCamara
              className="camara-grande"
              videoRef={vivo.videoRef}
              estado={vivo.estado}
              ajustes={vivo.ajustes}
              geometria={vivo.geometria}
              onReintentar={vivo.reintentar}
            >
              <AvisoLuz luz={vivo.luz} className="camara-luz" />
              <AvisoFlujo flujo={vivo.flujo} className="camara-flujo" />
              <AvisoAlReves alReves={vivo.aguaAlReves} className="camara-reves" />
            </VistaCamara>
          )}
        </div>
      }
      pie={
        !terminada ? (
          <>
            <BotonVolverACero
              enCero={enVivo === 0}
              detalle="La prueba vuelve a 0. El pez y el tamaño no cambian."
              onConfirmar={() => {
                despachar({ tipo: "pruebaACero" });
                motor.enviar({ tipo: "reiniciar" });
              }}
            />
            <button
              type="button"
              className="boton boton-principal"
              disabled={enVivo === 0}
              onClick={async () => {
              const contados = enVivo;
              // Además del número, lo que midió de estos alevinos (tamaño y forma) para ajustar el perfil.
              const estadisticas = await vivo.pedirEstadisticas();
              despachar({ tipo: "resultadoPrueba", contados, estadisticas });
            }}
            >
              <IconoChulo /> Ya pasaron todos
            </button>
          </>
        ) : resultado?.ok ? (
          <>
            <button type="button" className="boton boton-secundario" onClick={repetir}>
              <IconoDeshacer /> Repetir
            </button>
            <button type="button" className="boton boton-principal" onClick={() => acciones.aceptarPrueba() && navegar("meta")}>
              Siguiente <IconoSiguiente />
            </button>
          </>
        ) : (
          <button type="button" className="boton boton-principal" onClick={repetir}>
            <IconoDeshacer /> Repetir la prueba
          </button>
        )
      }
    >
      {!terminada ? (
        <>
          {/* Con la cámara grande no caben los tres pasos: va una sola línea (los pasos salen en el resultado y en Ayuda). */}
          <p className="instruccion-corta">Eche al canal 100 contados a mano.</p>
          <div className="numero-vivo">
            <output className="contador-numero prueba-numero" aria-live="polite">
              {enVivo}
            </output>
            <span className="contador-de">de {MANO}</span>
          </div>
        </>
      ) : (
        <>
          <h2 className="pregunta">Prueba de 100</h2>
          <PasosNumerados />
          <div className="circulo-zona">
        <div className={`circulo ${resultado ? (resultado.ok ? "circulo-bien" : "circulo-mal") : ""}`}>
          <strong className="circulo-numero">{contados}</strong>
          <span className="circulo-de">de {MANO}</span>
        </div>
      </div>
        </>
      )}

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

function PasosNumerados() {
  return (
    <ol className="pasos-numerados">
      {PASOS.map((p, i) => (
        <li key={p}>
          <span className="numero-paso">{i + 1}</span>
          {p}
        </li>
      ))}
    </ol>
  );
}
