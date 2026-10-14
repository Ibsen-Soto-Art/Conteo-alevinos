import { Ayuda } from "../features/ayuda/Ayuda";
import { Prueba100 } from "../features/calibracion/Prueba100";
import { BolsaLista } from "../features/conteo/BolsaLista";
import { Contando } from "../features/conteo/Contando";
import { Meta } from "../features/conteo/Meta";
import { Resumen } from "../features/conteo/Resumen";
import { Conteos } from "../features/historial/Conteos";
import { Inicio } from "../features/inicio/Inicio";
import { QuePez } from "../features/lotes/QuePez";
import { AvisoGirar } from "../shared/ui/AvisoGirar";
import { useRuta, type Ruta } from "./rutas";
import { MotorProveedor } from "./MotorContexto";
import { estadoDeEjemplo, estadoInicial } from "./sesion";
import { SesionProveedor, useSesion } from "./SesionContexto";
import { useEffect } from "react";
import "../shared/ui/app.css";

const PANTALLAS: Record<Ruta, () => React.JSX.Element> = {
  inicio: Inicio,
  pez: QuePez,
  prueba: Prueba100,
  meta: Meta,
  contando: Contando,
  "bolsa-lista": BolsaLista,
  resumen: Resumen,
  conteos: Conteos,
  ayuda: Ayuda,
};

/** Con `?demo` en la dirección la app arranca con datos de ejemplo (para ver y probar las pantallas). */
function modoDemo() {
  return new URLSearchParams(location.search).has("demo");
}

export function App() {
  const ruta = useRuta();
  const Pantalla = PANTALLAS[ruta];
  return (
    <SesionProveedor inicial={modoDemo() ? estadoDeEjemplo() : estadoInicial()}>
      <MotorProveedor>
        <div className="app" data-ruta={ruta}>
          <Pantalla key={ruta} />
        </div>
        <AvisoGirar />
        {modoDemo() && <EngancheDemo />}
      </MotorProveedor>
    </SesionProveedor>
  );
}

/**
 * Solo con `?demo`: deja `window.__demo.despachar` para que las pruebas de Playwright
 * fijen datos (por ejemplo, el resultado de la prueba de 100) sin esperar a la cámara.
 */
function EngancheDemo() {
  const { despachar } = useSesion();
  useEffect(() => {
    (window as unknown as { __demo?: unknown }).__demo = { despachar };
  }, [despachar]);
  return null;
}
