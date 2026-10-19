import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useMotorCompartido } from "../../app/MotorContexto";
import { IconoAviso, IconoProblema, IconoSol } from "../../shared/ui/Iconos";
import { flujoVertical, franjaPorcentaje, lineaEnVista, puntoEnVista, type Controles, type MensajeDelMotor } from "./protocolo";
import type { EstadoCamara, Luz } from "./useConteoEnVivo";

const MENSAJES: Record<Exclude<EstadoCamara, "lista">, string> = {
  iniciando: "Abriendo la cámara…",
  "sin-permiso": "Dé permiso para usar la cámara",
  inseguro: "La cámara necesita abrir la app con https://",
  error: "No se pudo abrir la cámara",
};

const COLOR_MANCHA = "#00e5ff";
const COLOR_CONTADO = "#39ff6a";

/** Dibuja lo que ve el motor: un círculo por mancha y un punto verde por alevino ya contado. */
function dibujarMarcas(
  lienzo: HTMLCanvasElement,
  r: Extract<MensajeDelMotor, { tipo: "resultado" }>,
  vista: { ancho: number; alto: number },
) {
  const ctx = lienzo.getContext("2d");
  if (!ctx) return;
  const ppp = window.devicePixelRatio || 1;
  if (lienzo.width !== Math.round(vista.ancho * ppp) || lienzo.height !== Math.round(vista.alto * ppp)) {
    lienzo.width = Math.round(vista.ancho * ppp);
    lienzo.height = Math.round(vista.alto * ppp);
  }
  ctx.setTransform(ppp, 0, 0, ppp, 0, 0);
  ctx.clearRect(0, 0, vista.ancho, vista.alto);
  const proceso = { ancho: r.ancho, alto: r.alto };

  ctx.lineWidth = 3;
  ctx.strokeStyle = COLOR_MANCHA;
  for (const d of r.detecciones) {
    const p = puntoEnVista(d.x, d.y, proceso, vista);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.sqrt(d.area / Math.PI) * p.escala + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = COLOR_CONTADO;
  for (const t of r.pistas) {
    if (!t.contada) continue;
    const p = puntoEnVista(t.x, t.y, proceso, vista);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** La cámara con la línea de conteo y las marcas de lo que detecta, donde de verdad lo ve el motor. */
export function VistaCamara({
  videoRef,
  estado,
  ajustes,
  onReintentar,
  className = "",
  children,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  estado: EstadoCamara;
  ajustes: Controles;
  onReintentar: () => void;
  className?: string;
  children?: ReactNode;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const marcas = useRef<HTMLCanvasElement>(null);
  const motor = useMotorCompartido();
  const [vista, setVista] = useState({ ancho: 0, alto: 0 });
  const [video, setVideo] = useState({ ancho: 0, alto: 0 });

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => setVista({ ancho: el.clientWidth, alto: el.clientHeight });
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  // Cada resultado del motor se dibuja encima de la imagen.
  useEffect(() => {
    if (estado !== "lista") return;
    return motor.escuchar((r) => {
      if (r.tipo === "resultado" && marcas.current && vista.ancho > 0) dibujarMarcas(marcas.current, r, vista);
    });
  }, [motor, estado, vista]);

  // La franja de conteo: dos bordes donde de verdad los ve el motor (recortados a la vista).
  const vertical = flujoVertical(ajustes.sentido);
  const largoVista = vertical ? vista.alto : vista.ancho;
  const franja =
    estado === "lista" && video.ancho > 0 && vista.ancho > 0
      ? franjaPorcentaje(ajustes).map((p) => Math.min(largoVista, Math.max(0, lineaEnVista(p, ajustes.sentido, video, vista))))
      : null;
  const franjaVisible = franja !== null && franja[1]! > franja[0]!;

  return (
    <div ref={caja} className={`camara ${className}`}>
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        onLoadedMetadata={(e) => setVideo({ ancho: e.currentTarget.videoWidth, alto: e.currentTarget.videoHeight })}
      />
      {estado === "lista" && <canvas ref={marcas} className="camara-marcas" aria-hidden="true" />}
      {franjaVisible && (
        <div
          className={vertical ? "camara-franja" : "camara-franja camara-franja-vertical"}
          style={vertical ? { top: franja[0], height: franja[1]! - franja[0]! } : { left: franja[0], width: franja[1]! - franja[0]! }}
        />
      )}
      {estado !== "lista" && (
        <div className="camara-mensaje" role={estado === "iniciando" ? "status" : "alert"}>
          {estado !== "iniciando" && <IconoProblema />}
          <span>{MENSAJES[estado]}</span>
          {(estado === "sin-permiso" || estado === "error") && (
            <button type="button" className="boton" onClick={onReintentar}>
              Intentar de nuevo
            </button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

/** «Luz bien» o «Poca luz», siempre con ícono y palabra. */
export function AvisoLuz({ luz, className = "" }: { luz: Luz; className?: string }) {
  if (luz === null) return null;
  return luz === "bien" ? (
    <span className={`estado estado-exito ${className}`}>
      <IconoSol /> Luz bien
    </span>
  ) : (
    <span className={`estado estado-aviso ${className}`}>
      <IconoAviso /> Poca luz
    </span>
  );
}
