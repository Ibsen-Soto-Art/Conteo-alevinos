import { navegar } from "../../app/rutas";
import { META_INICIAL, META_PASO, cambiarMeta } from "../../app/sesion";
import { useSesion } from "../../app/SesionContexto";
import { formatear } from "../../shared/formato";
import { BarraPasos } from "../../shared/ui/BarraPasos";
import { IconoChulo, IconoMas, IconoMenos, IconoSeguir } from "../../shared/ui/Iconos";
import { Pantalla } from "../../shared/ui/Pantalla";

const ATAJOS = [500, 1000, 1500, 2000];

export function Meta() {
  const { estado, despachar } = useSesion();
  const sinMeta = estado.meta === null;
  const meta = estado.meta ?? META_INICIAL;
  const fijar = (m: number | null) => despachar({ tipo: "fijarMeta", meta: m });

  return (
    <Pantalla
      cabecera={<BarraPasos paso={3} onVolver={() => navegar("prueba")} />}
      pie={
        <button type="button" className="boton boton-principal" onClick={() => navegar("contando")}>
          <IconoSeguir /> Empezar a contar
        </button>
      }
    >
      <h2 className="pregunta">¿Cuántos por bolsa?</h2>

      <div className={`meta-ajuste ${sinMeta ? "apagado" : ""}`}>
        <button
          type="button"
          className="boton boton-redondo"
          aria-label={`Quitar ${META_PASO}`}
          disabled={sinMeta}
          onClick={() => fijar(cambiarMeta(meta, -META_PASO))}
        >
          <IconoMenos />
        </button>
        <div className="meta-numero">
          <strong>{sinMeta ? "—" : formatear(meta)}</strong>
          <span>{sinMeta ? "sin meta" : "alevinos por bolsa"}</span>
        </div>
        <button
          type="button"
          className="boton boton-redondo"
          aria-label={`Sumar ${META_PASO}`}
          disabled={sinMeta}
          onClick={() => fijar(cambiarMeta(meta, META_PASO))}
        >
          <IconoMas />
        </button>
      </div>

      <div className="opciones opciones-4">
        {ATAJOS.map((a) => (
          <button key={a} type="button" className="boton opcion" aria-pressed={!sinMeta && meta === a} onClick={() => fijar(a)}>
            {formatear(a)}
          </button>
        ))}
      </div>

      <button type="button" className="boton opcion opcion-ancha" aria-pressed={sinMeta} onClick={() => fijar(sinMeta ? META_INICIAL : null)}>
        {sinMeta && <IconoChulo className="opcion-chulo" />}
        Sin meta: yo cierro cada bolsa
      </button>
    </Pantalla>
  );
}
