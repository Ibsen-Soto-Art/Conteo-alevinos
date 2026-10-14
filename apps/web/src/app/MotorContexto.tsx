import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";
import type { MensajeDelMotor } from "../features/conteo/protocolo";
import { useMotor } from "../features/conteo/useMotor";

type Oyente = (r: MensajeDelMotor) => void;
type MotorCompartido = ReturnType<typeof useMotor> & { escuchar: (oyente: Oyente) => () => void };

const Contexto = createContext<MotorCompartido | null>(null);

/**
 * Un solo Web Worker para toda la app: así lo que aprende el motor en la prueba de 100
 * (el tamaño típico del alevino del lote) sigue valiendo al contar las bolsas.
 */
export function MotorProveedor({ children }: { children: ReactNode }) {
  const oyentes = useRef(new Set<Oyente>());
  const motor = useMotor((r) => oyentes.current.forEach((o) => o(r)));
  const valor = useMemo<MotorCompartido>(
    () => ({
      ...motor,
      escuchar: (oyente) => {
        oyentes.current.add(oyente);
        return () => oyentes.current.delete(oyente);
      },
    }),
    [motor],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useMotorCompartido(): MotorCompartido {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useMotorCompartido se usa dentro de MotorProveedor");
  return valor;
}
