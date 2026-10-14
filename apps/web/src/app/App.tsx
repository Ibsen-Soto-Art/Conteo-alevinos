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
import { SesionProveedor } from "./SesionContexto";
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

export function App() {
  const ruta = useRuta();
  const Pantalla = PANTALLAS[ruta];
  return (
    <SesionProveedor>
      <div className="app" data-ruta={ruta}>
        <Pantalla key={ruta} />
      </div>
      <AvisoGirar />
    </SesionProveedor>
  );
}
