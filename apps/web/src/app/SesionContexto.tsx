import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { estadoInicial, reducir, type Accion, type EstadoSesion } from "./sesion";

const Contexto = createContext<{ estado: EstadoSesion; despachar: Dispatch<Accion> } | null>(null);

export function SesionProveedor({ children, inicial }: { children: ReactNode; inicial?: EstadoSesion }) {
  const [estado, despachar] = useReducer(reducir, inicial ?? estadoInicial());
  return <Contexto.Provider value={{ estado, despachar }}>{children}</Contexto.Provider>;
}

export function useSesion() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useSesion se usa dentro de SesionProveedor");
  return valor;
}
