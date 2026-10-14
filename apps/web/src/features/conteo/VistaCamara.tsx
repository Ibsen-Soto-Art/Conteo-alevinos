import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { IconoAviso, IconoProblema, IconoSol } from "../../shared/ui/Iconos";
import { flujoVertical, lineaEnVista, type Controles } from "./protocolo";
import type { EstadoCamara, Luz } from "./useConteoEnVivo";

const MENSAJES: Record<Exclude<EstadoCamara, "lista">, string> = {
  iniciando: "Abriendo la cámara…",
  "sin-permiso": "Dé permiso para usar la cámara",
  inseguro: "La cámara necesita abrir la app con https://",
  error: "No se pudo abrir la cámara",
};

/** La cámara con la línea de conteo encima, donde de verdad la ve el motor. */
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

  const vertical = flujoVertical(ajustes.sentido);
  const linea =
    estado === "lista" && video.ancho > 0 && vista.ancho > 0
      ? lineaEnVista(ajustes.lineaPorcentaje, ajustes.sentido, video, vista)
      : null;
  const lineaVisible = linea !== null && linea >= 0 && linea <= (vertical ? vista.alto : vista.ancho);

  return (
    <div ref={caja} className={`camara ${className}`}>
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        onLoadedMetadata={(e) => setVideo({ ancho: e.currentTarget.videoWidth, alto: e.currentTarget.videoHeight })}
      />
      {lineaVisible && (
        <div
          className={vertical ? "camara-linea" : "camara-linea camara-linea-vertical"}
          style={vertical ? { top: linea } : { left: linea }}
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
