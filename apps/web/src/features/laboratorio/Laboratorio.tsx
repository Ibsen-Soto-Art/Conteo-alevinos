import { PERFILES, perfilPorId } from "@contador/domain";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./laboratorio.css";
import { guardarAjustes, leerAjustes } from "../conteo/ajustes";
import { Captura, bucleDeCuadros, type Geometria } from "../conteo/captura";
import { COLOR_DESCARTE, dibujarEscena, pintarMascara } from "../conteo/dibujo";
import { type Controles, type MensajeDelMotor } from "../conteo/protocolo";
import { useMotor } from "../conteo/useMotor";
import { PanelControles } from "./PanelControles";

type Resultado = Extract<MensajeDelMotor, { tipo: "resultado" }>;
type Fuente = "ninguna" | "video" | "camara";

/** El lienzo visible se dibuja al doble del recorte para que se vea nítido. */
const ESCALA_DIBUJO = 2;
const VELOCIDADES = [1, 0.5, 0.25];
const SIN_PERFIL = "ninguno";

const NOMBRE_FUENTE: Record<Geometria["canal"]["fuente"], string> = {
  marcas: "las 4 marcas",
  luz: "la zona iluminada (sin las 4 marcas)",
  todo: "el cuadro entero (no se ve el borde del canal)",
};

/** Las marcas del canal (en px del video) pasadas al recorte, para dibujarlas. */
function marcasEnRecorte(g: Geometria) {
  const { zona } = g.canal;
  const k = g.recorte.ancho / zona.ancho;
  return g.canal.marcas.map((m) => ({ x: (m.x - zona.x) * k, y: (m.y - zona.y) * k, lado: m.lado * k }));
}

const NOMBRE_FLUJO = { bien: "bien", rapido: "rápido", "muy-rapido": "muy rápido: baje la inclinación" } as const;

/** Cuadros por segundo que entrega la cámara (no aplica a un video cargado). */
function cuadrosDeLaCamara(video: HTMLVideoElement | null): number | null {
  const stream = video?.srcObject;
  return stream instanceof MediaStream ? (stream.getVideoTracks()[0]?.getSettings().frameRate ?? null) : null;
}

const NOMBRE_FONDO: Record<string, string> = {
  aprendiendo: "aprendiendo el canal vacío",
  esperando: "esperando: hay movimiento",
  listo: "aprendido",
  "sin-fondo": "sin fondo (nunca hubo canal quieto): umbral fijo",
};

export function Laboratorio() {
  const [controles, setControles] = useState<Controles>(leerAjustes);
  const [perfilId, setPerfilId] = useState("otra-mediano");
  const [usarFondo, setUsarFondo] = useState(true);
  const [fuente, setFuente] = useState<Fuente>("ninguna");
  const [total, setTotal] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [velocidad, setVelocidad] = useState(1);
  const [verMascara, setVerMascara] = useState(false);
  const [geometria, setGeometria] = useState<Geometria | null>(null);
  const [estado, setEstado] = useState({
    cps: 0,
    ms: 0,
    areaTipica: null as number | null,
    fondo: null as Resultado["fondo"],
    origen: null as Resultado["origenTamano"],
    flujo: null as Resultado["flujo"],
    cpsCamara: null as number | null,
  });
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const lienzoRef = useRef<HTMLCanvasElement>(null);
  const mascara = useRef<HTMLCanvasElement | null>(null);
  const captura = useRef<Captura | null>(null);
  const resultado = useRef<Resultado | null>(null);
  const controlesRef = useRef(controles);
  const verMascaraRef = useRef(verMascara);
  const urlVideo = useRef<string | null>(null);
  const contadorCps = useRef({ desde: 0, cuadros: 0 });
  controlesRef.current = controles;
  verMascaraRef.current = verMascara;
  const perfil = useMemo(() => (perfilId === SIN_PERFIL ? null : (perfilPorId(perfilId) ?? null)), [perfilId]);

  const alResponder = useCallback((r: MensajeDelMotor) => {
    captura.current?.recibir(r);
    if (r.tipo === "error") {
      setError(r.mensaje);
      return;
    }
    if (r.tipo !== "resultado") return;
    resultado.current = r;
    setTotal(r.total);
    const c = contadorCps.current;
    c.cuadros++;
    const ahora = performance.now();
    if (ahora - c.desde >= 1000) {
      setEstado({
        cps: Math.round((c.cuadros * 1000) / (ahora - c.desde)),
        ms: r.ms,
        areaTipica: r.areaTipica,
        fondo: r.fondo,
        origen: r.origenTamano,
        flujo: r.flujo,
        cpsCamara: cuadrosDeLaCamara(videoRef.current),
      });
      contadorCps.current = { desde: ahora, cuadros: 0 };
    }
  }, []);

  const motor = useMotor(alResponder);

  // Los ajustes quedan guardados en este teléfono para que la app cuente con los mismos.
  useEffect(() => {
    guardarAjustes(controles);
    captura.current?.cambiar({ ajustes: controles });
  }, [controles]);

  useEffect(() => {
    captura.current?.cambiar({ perfil, fondo: usarFondo });
  }, [perfil, usarFondo]);

  // Cada fuente nueva (video o cámara): se busca el canal y se cuenta con el recorte.
  useEffect(() => {
    const video = videoRef.current;
    if (fuente === "ninguna" || !video) return;
    mascara.current ??= document.createElement("canvas");
    const ctxMascara = mascara.current.getContext("2d")!;
    setGeometria(null);
    resultado.current = null;
    const c = new Captura(video, motor, {
      ajustes: controlesRef.current,
      perfil,
      lote: null,
      fondo: usarFondo,
      alGeometria: setGeometria,
      alRecorte: (img) => {
        if (!verMascaraRef.current) return;
        mascara.current!.width = img.width;
        mascara.current!.height = img.height;
        const capa = ctxMascara.createImageData(img.width, img.height);
        pintarMascara(img.data, controlesRef.current.umbral, capa.data);
        ctxMascara.putImageData(capa, 0, 0);
      },
    });
    captura.current = c;
    const parar = bucleDeCuadros(video, () => c.cuadro());
    return () => {
      parar();
      captura.current = null;
    };
    // El perfil y el fondo se cambian aparte (sin volver a buscar el canal).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuente, motor]);

  // Dibujo: el recorte del canal con lo que ve el motor encima.
  useEffect(() => {
    if (fuente === "ninguna") return;
    let id = 0;
    const paso = () => {
      id = requestAnimationFrame(paso);
      const video = videoRef.current;
      const lienzo = lienzoRef.current;
      if (!video || !lienzo || video.readyState < 2 || video.videoWidth === 0) return;
      const g = captura.current?.geometria ?? null;
      const proceso = g?.recorte ?? { ancho: Math.round(video.videoWidth / 4), alto: Math.round(video.videoHeight / 4) };
      if (lienzo.width !== proceso.ancho * ESCALA_DIBUJO || lienzo.height !== proceso.alto * ESCALA_DIBUJO) {
        lienzo.width = proceso.ancho * ESCALA_DIBUJO;
        lienzo.height = proceso.alto * ESCALA_DIBUJO;
      }
      dibujarEscena(
        lienzo.getContext("2d")!,
        video,
        g?.canal.zona ?? null,
        verMascaraRef.current && g ? mascara.current : null,
        g ? resultado.current : null,
        controlesRef.current,
        proceso,
        g ? marcasEnRecorte(g) : [],
      );
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [fuente]);

  // La pantalla no se apaga mientras la cámara está encendida.
  useEffect(() => {
    if (fuente !== "camara" || !("wakeLock" in navigator)) return;
    let bloqueo: WakeLockSentinel | null = null;
    navigator.wakeLock.request("screen").then((b) => (bloqueo = b)).catch(() => {});
    return () => void bloqueo?.release();
  }, [fuente]);

  useEffect(() => () => apagarFuente(), []);

  function apagarFuente() {
    const video = videoRef.current;
    if (video?.srcObject instanceof MediaStream) video.srcObject.getTracks().forEach((t) => t.stop());
    if (video) video.srcObject = null;
    if (urlVideo.current) URL.revokeObjectURL(urlVideo.current);
    urlVideo.current = null;
  }

  function contadorACero() {
    motor.enviar({ tipo: "reiniciar" });
    resultado.current = null;
    setTotal(0);
  }

  /** Fuente nueva: se vuelve a mirar desde cero (canal, fondo y conteo). */
  function empezarFuente(nueva: Fuente) {
    contadorACero();
    setFuente("ninguna");
    // un cuadro después, para que el efecto arranque una captura nueva aunque la fuente sea la misma
    requestAnimationFrame(() => setFuente(nueva));
    setPausado(false);
  }

  async function cargarVideo(archivo: File) {
    const video = videoRef.current;
    if (!video) return;
    apagarFuente();
    setError(null);
    urlVideo.current = URL.createObjectURL(archivo);
    video.src = urlVideo.current;
    video.playbackRate = velocidad;
    empezarFuente("video");
    await video.play().catch((e) => setError(`No se pudo reproducir el video: ${e}`));
  }

  async function usarCamara() {
    const video = videoRef.current;
    if (!video) return;
    setError(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("La cámara solo funciona si la página se abre con https:// (ver README de apps/web).");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } },
        audio: false,
      });
      apagarFuente();
      video.removeAttribute("src");
      video.srcObject = stream;
      empezarFuente("camara");
      await video.play();
    } catch (e) {
      setError(`No se pudo abrir la cámara: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function alternarPausa() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
    setPausado(!video.paused);
  }

  function desdeElInicio() {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    empezarFuente(fuente);
    void video.play();
  }

  function cambiarVelocidad(v: number) {
    setVelocidad(v);
    if (videoRef.current) videoRef.current.playbackRate = v;
  }

  const canal = geometria?.canal;

  return (
    <main className="laboratorio pagina">
      <header className="cabecera">
        <h1>Laboratorio del motor</h1>
      </header>

      <section className="conteo" aria-live="polite">
        <span className="conteo-etiqueta">Alevinos</span>
        <output className="conteo-numero">{total.toLocaleString("es-CO")}</output>
      </section>

      <section className="fuentes">
        <label className="boton primario">
          Cargar video
          <input
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              if (archivo) void cargarVideo(archivo);
              e.target.value = "";
            }}
          />
        </label>
        <button type="button" className="boton primario" onClick={() => void usarCamara()}>
          Usar cámara trasera
        </button>
        <button type="button" className="boton peligro" onClick={contadorACero}>
          Contador a cero
        </button>
      </section>

      {error && (
        <p className="aviso" role="alert">
          {error}
        </p>
      )}

      <div className="trabajo">
        <section className="visor">
          <video ref={videoRef} muted playsInline hidden onEnded={() => setPausado(true)} />
          {fuente === "ninguna" ? (
            <p className="vacio">Carga un video del celular o usa la cámara trasera para empezar.</p>
          ) : (
            <canvas ref={lienzoRef} className="lienzo" />
          )}

          {fuente !== "ninguna" && (
            <div className="barra">
              <button type="button" className="boton" onClick={alternarPausa}>
                {pausado ? "Seguir" : "Pausar"}
              </button>
              {fuente === "video" && (
                <>
                  <button type="button" className="boton" onClick={desdeElInicio}>
                    Desde el inicio
                  </button>
                  <label className="selector">
                    Velocidad
                    <select value={velocidad} onChange={(e) => cambiarVelocidad(Number(e.target.value))}>
                      {VELOCIDADES.map((v) => (
                        <option key={v} value={v}>
                          {v}×
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              <label className="interruptor">
                <input type="checkbox" checked={verMascara} onChange={(e) => setVerMascara(e.target.checked)} />
                Ver lo que es oscuro
              </label>
            </div>
          )}

          <dl className="estado ficha">
            <dt>Canal</dt>
            <dd>
              {canal
                ? `encontrado con ${NOMBRE_FUENTE[canal.fuente]} · marcas ${canal.marcas.length}/4 · recorte ${geometria!.recorte.ancho}×${geometria!.recorte.alto}`
                : fuente === "ninguna"
                  ? "—"
                  : "buscando…"}
            </dd>
            <dt>Escala</dt>
            <dd>{geometria?.pxPorCmRecorte ? `${geometria.pxPorCmRecorte.toFixed(1)} px por cm en el recorte` : "sin marcas: no se sabe"}</dd>
            <dt>Fondo</dt>
            <dd>{estado.fondo ? `${NOMBRE_FONDO[estado.fondo.estado]} (${Math.round(estado.fondo.progreso * 100)} %)` : "apagado"}</dd>
            <dt>Tamaño del alevino</dt>
            <dd>
              {estado.origen === "lote"
                ? "medido en el lote"
                : estado.origen === "escala"
                  ? "del perfil, con la escala de las marcas"
                  : estado.origen === "amplio"
                    ? "aprendiendo (perfil amplio)"
                    : "sin perfil"}
              {estado.areaTipica !== null && ` · área típica ${Math.round(estado.areaTipica)} px`}
            </dd>
            <dt>Cuadros por segundo</dt>
            <dd>
              cámara {estado.cpsCamara ? Math.round(estado.cpsCamara) : "—"} · procesados {estado.cps} · motor {estado.ms.toFixed(1)} ms por cuadro
            </dd>
            <dt>Flujo</dt>
            <dd>
              {estado.flujo
                ? `${NOMBRE_FLUJO[estado.flujo.estado]} · ${estado.flujo.velocidad.toFixed(1)} px por cuadro (límite ${estado.flujo.limite.toFixed(1)}: ancho de la franja ÷ 3)` +
                  (estado.flujo.pxPorSegundo ? ` · ${Math.round(estado.flujo.pxPorSegundo)} px/s` : "") +
                  (geometria?.pxPorCmRecorte && estado.flujo.pxPorSegundo ? ` · ${(estado.flujo.pxPorSegundo / geometria.pxPorCmRecorte).toFixed(0)} cm/s` : "")
                : "nada se mueve"}
            </dd>
          </dl>
        </section>

        <aside className="lateral">
          <fieldset className="panel">
            <legend>Pez y canal</legend>
            <label className="campo">
              <span className="etiqueta">Perfil de especie y tamaño</span>
              <select className="selector-perfil" value={perfilId} onChange={(e) => setPerfilId(e.target.value)}>
                <option value={SIN_PERFIL}>Sin perfil (contar toda mancha, como antes)</option>
                {PERFILES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="interruptor">
              <input type="checkbox" checked={usarFondo} onChange={(e) => setUsarFondo(e.target.checked)} />
              Aprender el canal vacío (fondo)
            </label>
            <button type="button" className="boton" disabled={fuente === "ninguna"} onClick={() => empezarFuente(fuente)}>
              Buscar el canal de nuevo
            </button>
          </fieldset>
          <fieldset className="panel leyenda">
            <legend>Qué es cada color</legend>
            <p>
              <span style={{ color: "#00e5ff" }}>●</span> alevino: largo×ancho en px y peso (cuántos cuenta)
            </p>
            <p>
              <span style={{ color: "#39ff6a" }}>●</span> ya contado · <span style={{ color: "#39ff6a" }}>□</span> marca del canal
            </p>
            {(["tamano", "forma", "burbuja", "quieto"] as const).map((m) => (
              <p key={m}>
                <span style={{ color: COLOR_DESCARTE[m] }}>◌</span> descartado por{" "}
                {{ tamano: "tamaño (fuera del perfil)", forma: "forma (poco sólido, palito)", burbuja: "burbuja (redondo o anillo)", quieto: "quieto (no se mueve)" }[m]}
              </p>
            ))}
          </fieldset>
          <PanelControles controles={controles} onCambio={setControles} />
          <button type="button" className="boton" onClick={() => motor.enviar({ tipo: "olvidarArea" })}>
            Volver a aprender el tamaño del alevino
          </button>
        </aside>
      </div>
    </main>
  );
}
