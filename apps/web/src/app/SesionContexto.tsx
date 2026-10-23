import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Repositorio } from "../shared/datos/repositorio";
import { crearAcciones, crearAlmacen, type Acciones } from "./acciones";
import { conConteoAbierto, guardarEnCurso } from "./enCurso";
import type { Accion, EstadoSesion } from "./sesion";

const Contexto = createContext<{ estado: EstadoSesion; despachar: (a: Accion) => void; acciones: Acciones } | null>(null);

export function SesionProveedor({
  children,
  inicial,
  repo,
  cargarAlIniciar,
}: {
  children: ReactNode;
  inicial: EstadoSesion;
  repo: Repositorio;
  /** Leer el historial guardado al abrir la app (no en el modo de ejemplo). */
  cargarAlIniciar: boolean;
}) {
  // Si la página se cerró contando, se sigue donde iba (antes de dibujar la primera pantalla).
  const [almacen] = useState(() => crearAlmacen(cargarAlIniciar ? conConteoAbierto(inicial) : inicial));
  const estado = useSyncExternalStore(almacen.suscribir, almacen.leer);
  const acciones = useMemo(() => crearAcciones(almacen, { repo }), [almacen, repo]);

  useEffect(() => {
    if (!cargarAlIniciar) return;
    void acciones.cargar();
    // Desde aquí, cada cambio del conteo abierto queda guardado en el teléfono (no en ?demo).
    return almacen.suscribir(() => guardarEnCurso(almacen.leer()));
  }, [acciones, almacen, cargarAlIniciar]);

  const valor = useMemo(() => ({ estado, despachar: almacen.despachar, acciones }), [estado, almacen, acciones]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useSesion se usa dentro de SesionProveedor");
  return valor;
}
