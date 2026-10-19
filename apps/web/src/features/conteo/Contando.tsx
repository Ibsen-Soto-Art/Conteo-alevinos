import { perfilPorId } from "@contador/domain";
import { useEffect, useMemo, useRef } from "react";
import { useMotorCompartido } from "../../app/MotorContexto";
import { navegar } from "../../app/rutas";
import { AVISO_FALTAN, enBolsa as alevinosEnBolsa, numeroBolsaAbierta, totalHoy } from "../../app/sesion";
import { useSesion } from "../../app/SesionContexto";
import { avisarMeta } from "../../shared/avisos";
import { formatear } from "../../shared/formato";
import { IconoAviso, IconoBolsa, IconoChulo, IconoPausa, IconoSeguir } from "../../shared/ui/Iconos";
import { BotonVolverACero } from "../../shared/ui/BotonVolverACero";
import { Pantalla } from "../../shared/ui/Pantalla";
import { Redirigir } from "../../shared/ui/Redirigir";
import { useWakeLock } from "../../shared/useWakeLock";
import { useConteoEnVivo } from "./useConteoEnVivo";
import { AvisoLuz, VistaCamara } from "./VistaCamara";

export function Contando() {
  const { estado, despachar, acciones } = useSesion();
  const motor = useMotorCompartido();
  const { meta, pausado } = estado;
  // Lo que se muestra y se compara con la meta ya va corregido con el factor de la prueba de 100.
  const enBolsa = alevinosEnBolsa(estado);
  // Se cuenta con el perfil del lote (especie y tamaño) y lo que midió su Prueba de 100.
  const perfil = useMemo(() => (estado.lote?.perfilId ? (perfilPorId(estado.lote.perfilId) ?? null) : null), [estado.lote?.perfilId]);
  const vivo = useConteoEnVivo({
    activo: true,
    onSumados: (n) => despachar({ tipo: "sumar", cantidad: n }),
    perfil,
    lote: estado.lote?.estadisticas ?? null,
  });
  useWakeLock(true);

  const faltan = meta === null ? null : Math.max(0, meta - enBolsa);
  const cerca = faltan !== null && faltan > 0 && faltan <= AVISO_FALTAN;
  const llego = faltan === 0;
  const avance = meta === null ? 0 : Math.min(1, enBolsa / meta);

  // Al cruzar la meta (no al abrir la pantalla ya pasada): vibra y suena.
  const antes = useRef(enBolsa);
  useEffect(() => {
    if (meta !== null && antes.current < meta && enBolsa >= meta) avisarMeta();
    antes.current = enBolsa;
  }, [enBolsa, meta]);

  if (!estado.conteo) return <Redirigir a="inicio" />;

  return (
    <Pantalla
      clasePie="pie-columna"
      className={`contando ${cerca ? "contando-cerca" : ""} ${llego ? "contando-llego" : ""}`}
      cabecera={
        <VistaCamara
          className="camara-grande camara-arriba"
          videoRef={vivo.videoRef}
          estado={vivo.estado}
          ajustes={vivo.ajustes}
          geometria={vivo.geometria}
          preparacion={vivo.preparacion}
          onReintentar={vivo.reintentar}
        >
          <AvisoLuz luz={vivo.luz} className="camara-luz" />
          <span className="estado camara-bolsa">
            <IconoBolsa /> Bolsa {numeroBolsaAbierta(estado)}
          </span>
        </VistaCamara>
      }
      pie={
        <>
          <div className="fila-secundaria">
            <BotonVolverACero
              enCero={enBolsa === 0}
              detalle={`La bolsa ${numeroBolsaAbierta(estado)} vuelve a 0. Las bolsas cerradas no cambian.`}
              onConfirmar={() => {
                despachar({ tipo: "bolsaACero" });
                motor.enviar({ tipo: "reiniciar" });
              }}
            />
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
          </div>
          <button
            type="button"
            className="boton boton-principal"
            disabled={enBolsa === 0}
            onClick={() => {
              if (acciones.cerrarBolsa()) navegar("bolsa-lista", { reemplazar: true });
            }}
          >
            <IconoBolsa /> Cerrar bolsa
          </button>
        </>
      }
    >
      <div className="contador">
        <output className="contador-numero" aria-live="polite" data-largo={formatear(enBolsa).length}>
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
            <IconoPausa /> En pausa: no está contando
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
