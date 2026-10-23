import { useState } from "react";
import { navegar } from "../../app/rutas";
import { useSesion } from "../../app/SesionContexto";
import { ESPECIES, TALLAS } from "../../shared/catalogo";
import { BarraPasos } from "../../shared/ui/BarraPasos";
import { IconoChulo, IconoSiguiente } from "../../shared/ui/Iconos";
import { Pantalla } from "../../shared/ui/Pantalla";
import { Redirigir } from "../../shared/ui/Redirigir";

export function QuePez() {
  const { estado, despachar } = useSesion();
  const listo = estado.especie !== null && estado.talla !== null;
  // Con un conteo abierto (se volvió atrás desde Contando) se va al Inicio, que ofrece seguirlo.
  const [conConteo] = useState(() => estado.conteo !== null);
  if (conConteo) return <Redirigir a="inicio" />;

  return (
    <Pantalla
      cabecera={<BarraPasos paso={1} onVolver={() => navegar("inicio")} />}
      pie={
        <button type="button" className="boton boton-principal" disabled={!listo} onClick={() => navegar("prueba")}>
          Siguiente <IconoSiguiente />
        </button>
      }
    >
      <h2 className="pregunta">¿Qué pez va a contar?</h2>
      <div className="opciones opciones-2 opciones-crecen">
        {ESPECIES.map((e) => (
          <Opcion
            key={e.id}
            texto={e.nombre}
            elegida={estado.especie === e.id}
            onElegir={() => despachar({ tipo: "elegirEspecie", especie: e.id })}
          />
        ))}
      </div>
      <h2 className="pregunta">¿De qué tamaño?</h2>
      <div className="opciones opciones-3">
        {TALLAS.map((t) => (
          <Opcion
            key={t.id}
            texto={t.nombre}
            elegida={estado.talla === t.id}
            onElegir={() => despachar({ tipo: "elegirTalla", talla: t.id })}
          />
        ))}
      </div>
    </Pantalla>
  );
}

/** Botón de elección: la elegida lleva chulo además del color. */
function Opcion({ texto, elegida, onElegir }: { texto: string; elegida: boolean; onElegir: () => void }) {
  return (
    <button type="button" className="boton opcion" aria-pressed={elegida} onClick={onElegir}>
      {elegida && <IconoChulo className="opcion-chulo" />}
      {texto}
    </button>
  );
}
