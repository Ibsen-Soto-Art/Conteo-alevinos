import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useMotorCompartido } from "../../app/MotorContexto";
import { IconoAviso, IconoProblema, IconoSol } from "../../shared/ui/Iconos";
import { recorteAVideo, type Geometria } from "./captura";
import { flujoVertical, posicionParaVerFranja, puntoEnVista, type Controles, type MensajeDelMotor } from "./protocolo";
import type { EstadoCamara, Luz, Preparacion } from "./useConteoEnVivo";

const MENSAJES: Record<Exclude<EstadoCamara, "lista">, string> = {
  iniciando: "Abriendo la cámara…",
  "sin-permiso": "Dé permiso para usar la cámara",
  inseguro: "La cámara necesita abrir la app con https://",
  error: "No se pudo abrir la cámara",
};

const COLOR_FRANJA = "#ffd400";
const COLOR_MANCHA = "#00e5ff";
const COLOR_CONTADO = "#39ff6a";

type Resultado = Extract<MensajeDelMotor, { tipo: "resultado" }>;
type Punto = { x: number; y: number };

/**
 * Dibuja encima de la imagen lo que ve el motor, donde de verdad lo ve: la franja de conteo,
 * un círculo por mancha y un punto verde por alevino contado. Todo viene en píxeles del
 * recorte del canal; se pasa a píxeles del video y luego a la vista (`object-fit: cover`).
 */
function dibujarMarcas(
  lienzo: HTMLCanvasElement,
  r: Resultado,
  g: Geometria,
  video: { ancho: number; alto: number },
  vista: { ancho: number; alto: number },
  sentido: Controles["sentido"],
  posicion: { x: number; y: number },
) {
  const ctx = lienzo.getContext("2d");
  if (!ctx || r.ancho !== g.recorte.ancho) return;
  const ppp = window.devicePixelRatio || 1;
  if (lienzo.width !== Math.round(vista.ancho * ppp) || lienzo.height !== Math.round(vista.alto * ppp)) {
    lienzo.width = Math.round(vista.ancho * ppp);
    lienzo.height = Math.round(vista.alto * ppp);
  }
  ctx.setTransform(ppp, 0, 0, ppp, 0, 0);
  ctx.clearRect(0, 0, vista.ancho, vista.alto);
  const aVista = (x: number, y: number) => {
    const v = recorteAVideo(x, y, g);
    return puntoEnVista(v.x, v.y, video, vista, posicion);
  };

  // Franja: los dos bordes de un lado al otro del recorte, con el medio sombreado.
  const vertical = flujoVertical(sentido);
  const borde = (b: number): [Punto, Punto] => (vertical ? [aVista(0, b), aVista(r.ancho, b)] : [aVista(b, 0), aVista(b, r.alto)]);
  const [a0, a1] = borde(r.franja.inicio);
  const [b0, b1] = borde(r.franja.fin);
  ctx.fillStyle = "rgb(255 212 0 / 0.14)";
  ctx.beginPath();
  ctx.moveTo(a0.x, a0.y);
  ctx.lineTo(a1.x, a1.y);
  ctx.lineTo(b1.x, b1.y);
  ctx.lineTo(b0.x, b0.y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = COLOR_FRANJA;
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 8]);
  for (const [p, q] of [
    [a0, a1],
    [b0, b1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(p!.x, p!.y);
    ctx.lineTo(q!.x, q!.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const escala = g.canal.zona.ancho / g.recorte.ancho;
  ctx.lineWidth = 3;
  ctx.strokeStyle = COLOR_MANCHA;
  for (const d of r.detecciones) {
    const p = aVista(d.x, d.y);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.sqrt(d.area / Math.PI) * p.escala * escala + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = COLOR_CONTADO;
  for (const t of r.pistas) {
    if (!t.contada) continue;
    const p = aVista(t.x, t.y);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** La cámara con la franja de conteo y las marcas de lo que detecta el motor. */
export function VistaCamara({
  videoRef,
  estado,
  ajustes,
  geometria,
  preparacion,
  onReintentar,
  className = "",
  children,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  estado: EstadoCamara;
  ajustes: Controles;
  geometria: Geometria | null;
  preparacion: { estado: Preparacion; progreso: number };
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

  // Se muestra la parte del video donde está la franja (la vista es más baja que el video).
  const posicion = geometria && video.ancho > 0 ? posicionParaVerFranja(geometria.canal.zona, video, ajustes) : { x: 0.5, y: 0.5 };

  // Cada resultado del motor se dibuja encima de la imagen.
  useEffect(() => {
    if (estado !== "lista" || !geometria || video.ancho === 0) return;
    return motor.escuchar((r) => {
      if (r.tipo === "resultado" && marcas.current && vista.ancho > 0) dibujarMarcas(marcas.current, r, geometria, video, vista, ajustes.sentido, posicion);
    });
  }, [motor, estado, geometria, video, vista, ajustes.sentido, posicion.x, posicion.y]);

  const preparando = preparacion.estado === "buscando-canal" || preparacion.estado === "aprendiendo" || preparacion.estado === "esperando";

  return (
    <div ref={caja} className={`camara ${className}`}>
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        style={{ objectPosition: `${posicion.x * 100}% ${posicion.y * 100}%` }}
        onLoadedMetadata={(e) => setVideo({ ancho: e.currentTarget.videoWidth, alto: e.currentTarget.videoHeight })}
      />
      {estado === "lista" && <canvas ref={marcas} className="camara-marcas" aria-hidden="true" />}
      {estado === "lista" && preparando && (
        <div className="camara-preparando" role="status">
          {preparacion.estado === "esperando" ? (
            <>
              <IconoAviso /> Espere: hay movimiento en el canal
            </>
          ) : (
            <>
              <IconoSol /> Mirando el canal vacío: no eche alevinos · {Math.round(preparacion.progreso * 100)} %
            </>
          )}
        </div>
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
