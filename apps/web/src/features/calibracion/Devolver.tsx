import { useState } from "react";
import { navegar } from "../../app/rutas";
import { useSesion } from "../../app/SesionContexto";
import { prepararSonido } from "../../shared/avisos";
import { DibujoDevolver, IconoSeguir } from "../../shared/ui/Iconos";
import { Pantalla } from "../../shared/ui/Pantalla";
import { Redirigir } from "../../shared/ui/Redirigir";

/**
 * Los 100 de la prueba no van en ninguna bolsa: antes de contar se devuelven al tanque,
 * para que nadie los eche a la bolsa sin contar.
 */
export function Devolver() {
  const { estado, acciones } = useSesion();
  // Se mira al abrir la pantalla: al empezar a contar, el conteo nace aquí mismo.
  const [conConteo] = useState(() => estado.conteo !== null);
  if (conConteo) return <Redirigir a="inicio" />;
  if (!estado.lote) return <Redirigir a="prueba" />;

  return (
    <Pantalla
      className="devolver"
      pie={
        <button
          type="button"
          className="boton boton-principal"
          onClick={() => {
            prepararSonido(); // el aviso de la meta solo puede sonar si antes hubo un toque
            if (acciones.empezarConteo()) navegar("contando", { reemplazar: true });
          }}
        >
          <IconoSeguir /> Listo, empezar a contar
        </button>
      }
    >
      <div className="devolver-centro">
        <DibujoDevolver className="devolver-dibujo" />
        <h2 className="devolver-titulo">Devuelva los 100 de la prueba al tanque</h2>
        <p className="devolver-detalle">Esos alevinos no van en la bolsa. Cada bolsa empieza en 0.</p>
      </div>
    </Pantalla>
  );
}
