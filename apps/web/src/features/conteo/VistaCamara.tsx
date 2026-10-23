import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useMotorCompartido } from "../../app/MotorContexto";
import type { EstadoFlujo } from "@contador/counting-engine";
import { IconoAviso, IconoChulo, IconoLinterna, IconoLinternaApagada, IconoProblema, IconoSol } from "../../shared/ui/Iconos";
import { recorteAVideo, type Geometria } from "./captura";
import { encuadreCanal, encuadreCubrir, flujoVertical, posicionParaVerFranja, type Controles, type Encuadre, type MensajeDelMotor } from "./protocolo";
import type { EstadoCamara, Luz } from "./useConteoEnVivo";

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
 * recorte del canal; se pasa a píxeles del video y luego a la vista con el encuadre.
 */
function dibujarMarcas(lienzo: HTMLCanvasElement, r: Resultado, g: Geometria, vista: { ancho: number; alto: number }, e: Encuadre) {
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
    return { x: v.x * e.escala + e.dx, y: v.y * e.escala + e.dy };
  };

  // Franja: los dos bordes de un lado al otro del recorte, con el medio sombreado.
  const vertical = flujoVertical(r.sentido);
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
    ctx.arc(p.x, p.y, Math.sqrt(d.area / Math.PI) * e.escala * escala + 5, 0, Math.PI * 2);
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

/**
 * La cámara con la franja de conteo y las marcas de lo que detecta el motor.
 * - encuadre «franja»: la imagen llena la vista y se corre para que se vea la franja.
 * - encuadre «canal»: se ve el canal entero, entre los avisos de arriba y lo que vaya abajo
 *   sobre la imagen (el elemento con la clase `camara-banda`, p. ej. el contador).
 */
export function VistaCamara({
  videoRef,
  estado,
  ajustes,
  geometria,
  onReintentar,
  encuadre: modo = "franja",
  className = "",
  children,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  estado: EstadoCamara;
  ajustes: Controles;
  geometria: Geometria | null;
  onReintentar: () => void;
  encuadre?: "franja" | "canal";
  className?: string;
  children?: ReactNode;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const marcas = useRef<HTMLCanvasElement>(null);
  const motor = useMotorCompartido();
  const [vista, setVista] = useState({ ancho: 0, alto: 0 });
  const [video, setVideo] = useState({ ancho: 0, alto: 0 });
  /** Lo tapado arriba (avisos) y abajo (la banda), en px, para el encuadre «canal». */
  const [tapado, setTapado] = useState({ arriba: 0, abajo: 0 });

  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const medir = () => {
      setVista({ ancho: el.clientWidth, alto: el.clientHeight });
      const marco = el.getBoundingClientRect();
      const banda = el.querySelector(".camara-banda")?.getBoundingClientRect();
      const aviso = el.querySelector(".camara-bolsa, .camara-luz")?.getBoundingClientRect();
      // Arriba van dos filas de avisos (luz y bolsa; debajo, el flujo cuando aparece).
      const arriba = aviso ? aviso.bottom - marco.top + aviso.height + 12 : 0;
      const abajo = banda ? marco.bottom - banda.top : 0;
      setTapado((t) => (t.arriba === arriba && t.abajo === abajo ? t : { arriba, abajo }));
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    const banda = el.querySelector(".camara-banda");
    if (banda) observador.observe(banda);
    return () => observador.disconnect();
  }, [estado]);

  // Dónde está la franja que usa el motor (cambia si averigua que el agua corre al revés), en % del canal.
  const [lineaMotor, setLineaMotor] = useState<number | null>(null);
  useEffect(() => {
    if (estado !== "lista") return;
    return motor.escuchar((r) => {
      if (r.tipo !== "resultado") return;
      const largo = flujoVertical(r.sentido) ? r.alto : r.ancho;
      const linea = Math.round(((r.franja.inicio + r.franja.fin) / 2 / largo) * 100);
      setLineaMotor((antes) => (antes === linea ? antes : linea));
    });
  }, [motor, estado]);

  // «franja»: se muestra la parte del video donde está la franja (la vista es más baja que el video).
  const posicion =
    geometria && video.ancho > 0
      ? posicionParaVerFranja(geometria.canal.zona, video, { ...ajustes, lineaPorcentaje: lineaMotor ?? ajustes.lineaPorcentaje })
      : { x: 0.5, y: 0.5 };
  const listo = video.ancho > 0 && vista.ancho > 0;
  const enCanal = modo === "canal" && geometria !== null && listo;
  const e: Encuadre | null = !listo ? null : enCanal ? encuadreCanal(geometria.canal.zona, vista, tapado) : encuadreCubrir(video, vista, posicion);

  // Cada resultado del motor se dibuja encima de la imagen.
  useEffect(() => {
    if (estado !== "lista" || !geometria || !e) return;
    return motor.escuchar((r) => {
      if (r.tipo === "resultado" && marcas.current) dibujarMarcas(marcas.current, r, geometria, vista, e);
    });
  }, [motor, estado, geometria, vista, e?.escala, e?.dx, e?.dy]);

  return (
    <div ref={caja} className={`camara ${className}`}>
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        style={
          enCanal
            ? // El video del tamaño y en el sitio que dice el encuadre: el canal entero a la vista.
              { position: "absolute", left: e!.dx, top: e!.dy, width: video.ancho * e!.escala, height: video.alto * e!.escala, maxWidth: "none", objectFit: "fill" }
            : { objectPosition: `${posicion.x * 100}% ${posicion.y * 100}%` }
        }
        onLoadedMetadata={(e) => setVideo({ ancho: e.currentTarget.videoWidth, alto: e.currentTarget.videoHeight })}
      />
      {estado === "lista" && <canvas ref={marcas} className="camara-marcas" aria-hidden="true" />}
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

/** Qué tan rápido pasan: para ajustar la inclinación del canal hasta verlo en verde. */
export function AvisoFlujo({ flujo, className = "" }: { flujo: EstadoFlujo | null; className?: string }) {
  if (flujo === null) return null;
  if (flujo === "bien")
    return (
      <span className={`estado estado-exito ${className}`}>
        <IconoChulo /> Flujo bien
      </span>
    );
  if (flujo === "rapido")
    return (
      <span className={`estado estado-aviso ${className}`}>
        <IconoAviso /> Flujo rápido
      </span>
    );
  return (
    <span className={`estado estado-problema ${className}`} role="alert">
      <IconoProblema /> Muy rápido: baje la inclinación
    </span>
  );
}

/** Los alevinos suben en la pantalla: el celular está al revés (la franja no se mueve sola). */
export function AvisoAlReves({ alReves, className = "" }: { alReves: boolean; className?: string }) {
  if (!alReves) return null;
  return (
    <span className={`estado estado-problema ${className}`} role="alert">
      <IconoProblema /> El agua sube: gire el celular
    </span>
  );
}

/**
 * Botón para prender y apagar la linterna del celular. Solo aparece si el celular deja manejarla
 * desde la página. Prendida: fondo amarillo y linterna con rayos; apagada: blanca y tachada.
 */
export function BotonLinterna({
  linterna,
  onAlternar,
  className = "",
}: {
  linterna: { disponible: boolean; prendida: boolean };
  onAlternar: () => void;
  className?: string;
}) {
  if (!linterna.disponible) return null;
  return (
    <button type="button" className={`boton boton-linterna ${className}`} aria-pressed={linterna.prendida} onClick={onAlternar}>
      {linterna.prendida ? <IconoLinterna /> : <IconoLinternaApagada />} Linterna
    </button>
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
