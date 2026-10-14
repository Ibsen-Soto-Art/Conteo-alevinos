import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { estadoDeEjemplo, reducir, type Accion, type EstadoSesion } from "./sesion";

const Contexto = createContext<{ estado: EstadoSesion; despachar: Dispatch<Accion> } | null>(null);

export function SesionProveedor({ children, inicial }: { children: ReactNode; inicial?: EstadoSesion }) {
  const [estado, despachar] = useReducer(reducir, inicial ?? estadoDeEjemplo());
  return <Contexto.Provider value={{ estado, despachar }}>{children}</Contexto.Provider>;
}

export function useSesion() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useSesion se usa dentro de SesionProveedor");
  return valor;
}
