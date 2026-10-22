import { hayPocaLuz, type EstadisticasLote, type EstadoFlujo, type PerfilForma } from "@contador/counting-engine";
import type { EstadisticasMedidas } from "@contador/domain";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMotorCompartido } from "../../app/MotorContexto";
import { ajustesDelCampesino } from "./ajustes";
import { prenderLinterna } from "./linterna";
import { Captura, bucleDeCuadros, type Geometria } from "./captura";

export type EstadoCamara = "iniciando" | "lista" | "sin-permiso" | "inseguro" | "error";
export type Luz = "bien" | "poca" | null;

/** Cuánto pesa cada cuadro nuevo en el promedio del brillo (evita que el aviso parpadee). */
const SUAVIZADO_BRILLO = 0.1;

/**
 * Abre la cámara trasera y le pasa los cuadros al motor: primero busca el canal y sus marcas
 * (unos pocos cuadros) y enseguida cuenta con el perfil de la especie, mientras aprende el fondo. Avisa cuántos alevinos
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
  // De /laboratorio solo se toman los ajustes de detección; el agua baja y la franja va abajo.
  const ajustes = useMemo(() => ajustesDelCampesino(), []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const captura = useRef<Captura | null>(null);
  const [estado, setEstado] = useState<EstadoCamara>("iniciando");
  const [luz, setLuz] = useState<Luz>(null);
  const [flujo, setFlujo] = useState<EstadoFlujo | null>(null);
  /** Los alevinos suben en la pantalla: el celular está montado al revés. */
  const [aguaAlReves, setAguaAlReves] = useState(false);
  /** Solo en ?demo: un aviso de flujo forzado por las pruebas, que gana sobre lo medido. */
  const flujoForzado = useRef<EstadoFlujo | null | undefined>(undefined);
  const [geometria, setGeometria] = useState<Geometria | null>(null);
  const [intento, setIntento] = useState(0);
  const alSumar = useRef(onSumados);
  alSumar.current = onSumados;
  const perfilRef = useRef(perfil);
  perfilRef.current = perfil;
  const loteRef = useRef(lote);
  loteRef.current = lote;

  // Respuestas del motor: el canal encontrado, lo que cruzó y la luz.
  useEffect(() => {
    let brillo: number | null = null;
    return motor.escuchar((r) => {
      captura.current?.recibir(r);
      if (r.tipo !== "resultado") return;
      setAguaAlReves(r.aguaAlReves);
      // También negativo: un alevino ya contado que se devuelve por la franja se resta.
      if (r.sumados !== 0) alSumar.current(r.sumados);
      brillo = brillo === null ? r.brillo : brillo + (r.brillo - brillo) * SUAVIZADO_BRILLO;
      setLuz(hayPocaLuz(brillo) ? "poca" : "bien");
      setFlujo(flujoForzado.current !== undefined ? flujoForzado.current : (r.flujo?.estado ?? null));
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
        // La linterna se prende sola si el celular lo deja (más luz: imagen más nítida).
        void prenderLinterna(s.getVideoTracks()[0]);
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
    const c = new Captura(video, motor, {
      ajustes,
      perfil: perfilRef.current,
      lote: loteRef.current,
      fondo: true,
      // Sentido fijo hacia abajo: la franja nunca se mueve (si el agua sube, se avisa).
      sentidoAutomatico: false,
      alGeometria: setGeometria,
    });
    captura.current = c;
    const parar = bucleDeCuadros(video, () => c.cuadro());
    return () => {
      parar();
      captura.current = null;
    };
  }, [activo, estado, motor, ajustes]);

  /**
   * Lo que se midió de los alevinos contados (para la Prueba de 100), con el ancho del recorte en
   * que se midió. null si el motor no contesta a tiempo o no hay suficientes medidas.
   */
  const pedirEstadisticas = useCallback(
    () =>
      new Promise<EstadisticasMedidas | null>((resolver) => {
        const tiempo = setTimeout(() => {
          quitar();
          resolver(null);
        }, 1500);
        const quitar = motor.escuchar((r) => {
          if (r.tipo !== "estadisticas") return;
          clearTimeout(tiempo);
          quitar();
          resolver(r.estadisticas ? { ...r.estadisticas, anchoRecorte: r.anchoRecorte } : null);
        });
        motor.enviar({ tipo: "estadisticas" });
      }),
    [motor],
  );

  // Solo en el modo de ejemplo (?demo): las pruebas fuerzan el aviso de flujo para revisar que quepa.
  useEffect(() => {
    const forzar = (e: Event) => {
      flujoForzado.current = (e as CustomEvent<EstadoFlujo | null>).detail;
      setFlujo(flujoForzado.current);
    };
    window.addEventListener("demo-flujo", forzar);
    return () => window.removeEventListener("demo-flujo", forzar);
  }, []);

  return { videoRef, estado, luz, flujo, aguaAlReves, ajustes, geometria, pedirEstadisticas, reintentar: () => setIntento((i) => i + 1) };
}
