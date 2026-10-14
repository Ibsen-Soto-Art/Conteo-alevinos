import { useEffect, useState } from "react";
import { navegar } from "../../app/rutas";
import { useSesion } from "../../app/SesionContexto";
import { formatear } from "../../shared/formato";
import { IconoChulo, IconoDeshacer, IconoSeguir, IconoTerminar } from "../../shared/ui/Iconos";
import { Pantalla } from "../../shared/ui/Pantalla";
import { Redirigir } from "../../shared/ui/Redirigir";

/** Segundos que se puede deshacer el cierre de una bolsa. */
export const SEGUNDOS_DESHACER = 8;

export function BolsaLista() {
  const { estado, despachar } = useSesion();
  const ultima = estado.bolsas.at(-1);
  const [quedan, setQuedan] = useState(SEGUNDOS_DESHACER);

  useEffect(() => {
    if (quedan <= 0) return;
    const t = setTimeout(() => setQuedan((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [quedan]);

  if (!ultima) {
    return <Redirigir a="inicio" />;
  }

  return (
    <Pantalla
      className="bolsa-lista"
      pie={
        <div className="bolsa-lista-botones">
          <button type="button" className="boton boton-principal boton-claro" onClick={() => navegar("contando", { reemplazar: true })}>
            <IconoSeguir /> Siguiente bolsa
          </button>
          <div className="fila-botones">
            {quedan > 0 && (
              <button
                type="button"
                className="boton boton-borde-claro"
                onClick={() => {
                  despachar({ tipo: "deshacerCierre" });
                  navegar("contando", { reemplazar: true });
                }}
              >
                <IconoDeshacer /> Deshacer · {quedan}
              </button>
            )}
            <button
              type="button"
              className="boton boton-borde-claro"
              onClick={() => {
                despachar({ tipo: "terminar", id: crypto.randomUUID(), fecha: new Date().toISOString() });
                navegar("resumen", { reemplazar: true });
              }}
            >
              <IconoTerminar /> Terminar
            </button>
          </div>
        </div>
      }
    >
      <div className="bolsa-lista-centro">
        <span className="chulo-grande">
          <IconoChulo />
        </span>
        <h2 className="bolsa-lista-titulo">¡Bolsa {ultima.numero} lista!</h2>
        <strong className="bolsa-lista-numero">{formatear(ultima.cantidad)}</strong>
        <span className="bolsa-lista-unidad">alevinos</span>
        <p className="bolsa-lista-instruccion">Cierre la compuerta y ponga una bolsa nueva</p>
      </div>
    </Pantalla>
  );
}
