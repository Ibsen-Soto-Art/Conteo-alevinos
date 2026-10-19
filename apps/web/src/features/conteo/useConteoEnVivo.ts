import { hayPocaLuz, type EstadisticasLote, type EstadoFlujo, type EstadoFondo, type PerfilForma } from "@contador/counting-engine";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMotorCompartido } from "../../app/MotorContexto";
import { leerAjustes } from "./ajustes";
import { Captura, bucleDeCuadros, type Geometria } from "./captura";

export type EstadoCamara = "iniciando" | "lista" | "sin-permiso" | "inseguro" | "error";
export type Luz = "bien" | "poca" | null;

/** Qué está haciendo la app antes de poder contar. */
export type Preparacion = "buscando-canal" | EstadoFondo;

/** Cuánto pesa cada cuadro nuevo en el promedio del brillo (evita que el aviso parpadee). */
const SUAVIZADO_BRILLO = 0.1;

/**
 * Abre la cámara trasera y le pasa los cuadros al motor: primero busca el canal y sus marcas,
 * después aprende el canal vacío y cuenta con el perfil de la especie. Avisa cuántos alevinos
 * cruzaron la franja en cada cuadro (`onSumados`) y si hay poca luz. No guarda video.
 */
export function useConteoEnVivo({
  activo,
  onSumados,
  perfil,
  lote = null,
}: {
  activo: boolean;
  onSumados: (n: number) => void;
  perfil: PerfilForma | null;
  lote?: EstadisticasLote | null;
}) {
  const motor = useMotorCompartido();
  const ajustes = useMemo(() => leerAjustes(), []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const captura = useRef<Captura | null>(null);
  const [estado, setEstado] = useState<EstadoCamara>("iniciando");
  const [luz, setLuz] = useState<Luz>(null);
  const [flujo, setFlujo] = useState<EstadoFlujo | null>(null);
  /** Solo en ?demo: un aviso de flujo forzado por las pruebas, que gana sobre lo medido. */
  const flujoForzado = useRef<EstadoFlujo | null | undefined>(undefined);
  const [geometria, setGeometria] = useState<Geometria | null>(null);
  const [preparacion, setPreparacion] = useState<{ estado: Preparacion; progreso: number }>({ estado: "buscando-canal", progreso: 0 });
  const [intento, setIntento] = useState(0);
  const alSumar = useRef(onSumados);
  alSumar.current = onSumados;
  const perfilRef = useRef(perfil);
  perfilRef.current = perfil;
  const loteRef = useRef(lote);
  loteRef.current = lote;

  // Respuestas del motor: el canal encontrado, lo que cruzó, la luz y cómo va el fondo.
  useEffect(() => {
    let brillo: number | null = null;
    return motor.escuchar((r) => {
      captura.current?.recibir(r);
      if (r.tipo !== "resultado") return;
      if (r.sumados > 0) alSumar.current(r.sumados);
      brillo = brillo === null ? r.brillo : brillo + (r.brillo - brillo) * SUAVIZADO_BRILLO;
      setLuz(hayPocaLuz(brillo) ? "poca" : "bien");
      setFlujo(flujoForzado.current !== undefined ? flujoForzado.current : (r.flujo?.estado ?? null));
      const f = r.fondo ?? { estado: "listo" as const, progreso: 1 };
      // Solo cambia el estado cuando cambia algo que se ve (el progreso en pasos de 10 %).
      setPreparacion((p) => (p.estado === f.estado && Math.round(p.progreso * 10) === Math.round(f.progreso * 10) ? p : f));
    });
  }, [motor]);

  // El perfil o el lote pueden cambiar sin volver a buscar el canal.
  useEffect(() => {
    captura.current?.cambiar({ perfil, lote });
  }, [perfil, lote]);

  // Cámara trasera.
  useEffect(() => {
    if (!activo) return;
    const video = videoRef.current;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setEstado("inseguro");
      return;
    }
    let cancelado = false;
    let stream: MediaStream | null = null;
    setEstado("iniciando");
    navigator.mediaDevices
      .getUserMedia({
        // La mayor cantidad de cuadros por segundo que dé la cámara: un alevino rápido se ve en más cuadros.
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } },
        audio: false,
      })
      .then(async (s) => {
        if (cancelado || !video) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        video.srcObject = s;
        await video.play().catch(() => {});
        if (!cancelado) setEstado("lista");
      })
      .catch((e: unknown) => {
        if (cancelado) return;
        const nombre = e instanceof DOMException ? e.name : "";
        setEstado(nombre === "NotAllowedError" || nombre === "SecurityError" ? "sin-permiso" : "error");
      });
    return () => {
      cancelado = true;
      stream?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
    };
  }, [activo, intento]);

  // Cada cuadro nuevo va a la captura: primero el canal, luego el recorte para contar.
  useEffect(() => {
    const video = videoRef.current;
    if (!activo || estado !== "lista" || !video) return;
    setGeometria(null);
    setPreparacion({ estado: "buscando-canal", progreso: 0 });
    const c = new Captura(video, motor, {
      ajustes,
      perfil: perfilRef.current,
      lote: loteRef.current,
      fondo: true,
      alGeometria: setGeometria,
    });
    captura.current = c;
    const parar = bucleDeCuadros(video, () => c.cuadro());
    return () => {
      parar();
      captura.current = null;
    };
  }, [activo, estado, motor, ajustes]);

  // Solo en el modo de ejemplo (?demo): las pruebas fuerzan el aviso de flujo para revisar que quepa.
  useEffect(() => {
    const forzar = (e: Event) => {
      flujoForzado.current = (e as CustomEvent<EstadoFlujo | null>).detail;
      setFlujo(flujoForzado.current);
    };
    window.addEventListener("demo-flujo", forzar);
    return () => window.removeEventListener("demo-flujo", forzar);
  }, []);

  return { videoRef, estado, luz, flujo, ajustes, geometria, preparacion, reintentar: () => setIntento((i) => i + 1) };
}
