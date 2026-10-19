import type { SentidoFlujo } from "@contador/counting-engine";
import type { Controles } from "../conteo/protocolo";

const SENTIDOS: { valor: SentidoFlujo; flecha: string; nombre: string }[] = [
  { valor: "abajo", flecha: "↓", nombre: "Hacia abajo" },
  { valor: "arriba", flecha: "↑", nombre: "Hacia arriba" },
  { valor: "derecha", flecha: "→", nombre: "Hacia la derecha" },
  { valor: "izquierda", flecha: "←", nombre: "Hacia la izquierda" },
];

interface Props {
  controles: Controles;
  onCambio: (c: Controles) => void;
}

export function PanelControles({ controles, onCambio }: Props) {
  const cambiar = <K extends keyof Controles>(clave: K, valor: Controles[K]) => onCambio({ ...controles, [clave]: valor });

  return (
    <fieldset className="panel">
      <legend>Ajustes del motor</legend>

      <Deslizador
        etiqueta="Umbral de oscuridad"
        ayuda="Más alto detecta alevinos más claros, pero también sombras."
        valor={controles.umbral}
        min={10}
        max={250}
        onCambio={(v) => cambiar("umbral", v)}
      />
      <Deslizador
        etiqueta="Área mínima (px)"
        ayuda="Manchas más pequeñas se ignoran: burbujas y ruido."
        valor={controles.areaMinima}
        min={1}
        max={200}
        onCambio={(v) => cambiar("areaMinima", v)}
      />
      <Deslizador
        etiqueta="Centro de la franja (%)"
        valor={controles.lineaPorcentaje}
        min={5}
        max={95}
        onCambio={(v) => cambiar("lineaPorcentaje", v)}
      />
      <Deslizador
        etiqueta="Ancho de la franja (%)"
        ayuda="Lo de adentro no cuenta: solo pasar de arriba a abajo. Más ancha aguanta alevinos que se devuelven."
        valor={controles.franjaAncho}
        min={0}
        max={40}
        onCambio={(v) => cambiar("franjaAncho", v)}
      />
      <Deslizador
        etiqueta="Distancia máxima entre cuadros (px)"
        ayuda="Súbela si los alevinos pasan muy rápido y no se cuentan."
        valor={controles.distanciaMaxima}
        min={4}
        max={80}
        onCambio={(v) => cambiar("distanciaMaxima", v)}
      />

      <div className="campo">
        <span className="etiqueta">Sentido del flujo</span>
        <div className="sentidos" role="group" aria-label="Sentido del flujo">
          {SENTIDOS.map((s) => (
            <button
              key={s.valor}
              type="button"
              className="boton sentido"
              aria-pressed={controles.sentido === s.valor}
              aria-label={s.nombre}
              title={s.nombre}
              onClick={() => cambiar("sentido", s.valor)}
            >
              {s.flecha}
            </button>
          ))}
        </div>
      </div>
    </fieldset>
  );
}

function Deslizador(props: {
  etiqueta: string;
  ayuda?: string;
  valor: number;
  min: number;
  max: number;
  onCambio: (v: number) => void;
}) {
  return (
    <label className="campo">
      <span className="etiqueta">
        {props.etiqueta} <strong>{props.valor}</strong>
      </span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        value={props.valor}
        onChange={(e) => props.onCambio(Number(e.target.value))}
      />
      {props.ayuda && <span className="ayuda">{props.ayuda}</span>}
    </label>
  );
}
