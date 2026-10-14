import { hayPocaLuz } from "@contador/counting-engine";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMotorCompartido } from "../../app/MotorContexto";
import { leerAjustes } from "./ajustes";
import { LADO_PROCESO, tamanoProceso } from "./protocolo";

export type EstadoCamara = "iniciando" | "lista" | "sin-permiso" | "inseguro" | "error";
export type Luz = "bien" | "poca" | null;

/** Cuánto pesa cada cuadro nuevo en el promedio del brillo (evita que el aviso parpadee). */
const SUAVIZADO_BRILLO = 0.1;

/**
 * Abre la cámara trasera y le pasa cada cuadro nuevo al motor. Avisa cuántos alevinos
 * cruzaron la línea en cada cuadro (`onSumados`) y si hay poca luz. No guarda video.
 */
export function useConteoEnVivo({ activo, onSumados }: { activo: boolean; onSumados: (n: number) => void }) {
  const motor = useMotorCompartido();
  const ajustes = useMemo(() => leerAjustes(), []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [estado, setEstado] = useState<EstadoCamara>("iniciando");
  const [luz, setLuz] = useState<Luz>(null);
  const [intento, setIntento] = useState(0);
  const alSumar = useRef(onSumados);
  alSumar.current = onSumados;

  // Resultados del motor: sumar lo que cruzó y vigilar la luz.
  useEffect(() => {
    let brillo: number | null = null;
    return motor.escuchar((r) => {
      if (r.tipo !== "resultado") return;
      if (r.sumados > 0) alSumar.current(r.sumados);
      brillo = brillo === null ? r.brillo : brillo + (r.brillo - brillo) * SUAVIZADO_BRILLO;
      setLuz(hayPocaLuz(brillo) ? "poca" : "bien");
    });
  }, [motor]);

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
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
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

  // Bucle: cada cuadro nuevo se reduce a 320 px y va al motor (solo uno en camino a la vez).
  useEffect(() => {
    const video = videoRef.current;
    if (!activo || estado !== "lista" || !video) return;
    const lienzo = document.createElement("canvas");
    const ctx = lienzo.getContext("2d", { willReadFrequently: true })!;
    let tamano = { ancho: 0, alto: 0 };
    let vivo = true;
    let ultimoTiempo = -1;
    // En navegadores viejos no existe aunque TypeScript diga que sí.
    const conAviso = typeof video.requestVideoFrameCallback === "function";
    let id = 0;

    const procesar = () => {
      if (!vivo || video.readyState < 2 || video.videoWidth === 0) return;
      const t = tamanoProceso(video.videoWidth, video.videoHeight, LADO_PROCESO);
      if (t.ancho !== tamano.ancho || t.alto !== tamano.alto) {
        tamano = t;
        lienzo.width = t.ancho;
        lienzo.height = t.alto;
        motor.enviar({ tipo: "configurar", controles: ajustes, ...t });
      }
      if (!motor.libre()) return;
      ctx.drawImage(video, 0, 0, t.ancho, t.alto);
      motor.enviarCuadro(t.ancho, t.alto, ctx.getImageData(0, 0, t.ancho, t.alto).data.buffer);
    };

    const siguiente = () => {
      if (!vivo) return;
      if (conAviso) {
        id = video.requestVideoFrameCallback(() => {
          procesar();
          siguiente();
        });
      } else {
        id = requestAnimationFrame(() => {
          if (video.currentTime !== ultimoTiempo) {
            ultimoTiempo = video.currentTime;
            procesar();
          }
          siguiente();
        });
      }
    };
    siguiente();
    return () => {
      vivo = false;
      if (conAviso) video.cancelVideoFrameCallback(id);
      else cancelAnimationFrame(id);
    };
  }, [activo, estado, motor, ajustes]);

  return { videoRef, estado, luz, ajustes, reintentar: () => setIntento((i) => i + 1) };
}
