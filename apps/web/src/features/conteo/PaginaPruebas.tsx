import { useCallback, useEffect, useRef, useState } from "react";
import { dibujarEscena, pintarMascara } from "./dibujo";
import { PanelControles } from "./PanelControles";
import { CONTROLES_INICIALES, LADO_PROCESO, tamanoProceso, type Controles, type MensajeDelMotor } from "./protocolo";
import { useMotor } from "./useMotor";

type Resultado = Extract<MensajeDelMotor, { tipo: "resultado" }>;
type Fuente = "ninguna" | "video" | "camara";

/** El lienzo visible se dibuja al doble del cuadro procesado para que se vea nítido. */
const ESCALA_DIBUJO = 2;
const VELOCIDADES = [1, 0.5, 0.25];

export function PaginaPruebas() {
  const [controles, setControles] = useState<Controles>(CONTROLES_INICIALES);
  const [fuente, setFuente] = useState<Fuente>("ninguna");
  const [total, setTotal] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [velocidad, setVelocidad] = useState(1);
  const [verMascara, setVerMascara] = useState(false);
  const [estado, setEstado] = useState({ cps: 0, ms: 0, areaTipica: null as number | null });
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const lienzoRef = useRef<HTMLCanvasElement>(null);
  const proceso = useRef<HTMLCanvasElement | null>(null);
  const mascara = useRef<HTMLCanvasElement | null>(null);
  const tamano = useRef({ ancho: 0, alto: 0 });
  const resultado = useRef<Resultado | null>(null);
  const controlesRef = useRef(controles);
  const verMascaraRef = useRef(verMascara);
  const urlVideo = useRef<string | null>(null);
  const contadorCps = useRef({ desde: 0, cuadros: 0 });
  controlesRef.current = controles;
  verMascaraRef.current = verMascara;

  const alResponder = useCallback((r: MensajeDelMotor) => {
    if (r.tipo === "error") {
      setError(r.mensaje);
      return;
    }
    resultado.current = r;
    setTotal(r.total);
    const c = contadorCps.current;
    c.cuadros++;
    const ahora = performance.now();
    if (ahora - c.desde >= 1000) {
      setEstado({ cps: Math.round((c.cuadros * 1000) / (ahora - c.desde)), ms: r.ms, areaTipica: r.areaTipica });
      contadorCps.current = { desde: ahora, cuadros: 0 };
    }
  }, []);

  const motor = useMotor(alResponder);

  // Cada cambio de controles va al motor sin reiniciar el conteo.
  useEffect(() => {
    const { ancho, alto } = tamano.current;
    if (ancho > 0) motor.enviar({ tipo: "configurar", controles, ancho, alto });
  }, [controles, motor]);

  // Bucle: cada cuadro nuevo del video se reduce, se envía al motor y se dibuja con lo detectado.
  useEffect(() => {
    if (fuente === "ninguna") return;
    proceso.current ??= document.createElement("canvas");
    mascara.current ??= document.createElement("canvas");
    const ctxProceso = proceso.current.getContext("2d", { willReadFrequently: true })!;
    const ctxMascara = mascara.current.getContext("2d")!;
    let ultimoTiempo = -1;
    let id = 0;
    // requestVideoFrameCallback avisa de cada cuadro nuevo; sin él se compara currentTime.
    const video = videoRef.current;
    const conAviso = !!video && "requestVideoFrameCallback" in video;
    let cuadroNuevo = false;
    let idAviso = 0;
    const avisar = () => {
      cuadroNuevo = true;
      idAviso = video!.requestVideoFrameCallback(avisar);
    };
    if (conAviso) idAviso = video.requestVideoFrameCallback(avisar);

    const paso = () => {
      id = requestAnimationFrame(paso);
      const video = videoRef.current;
      const lienzo = lienzoRef.current;
      if (!video || !lienzo || video.readyState < 2 || video.videoWidth === 0) return;

      const t = tamanoProceso(video.videoWidth, video.videoHeight, LADO_PROCESO);
      if (t.ancho !== tamano.current.ancho || t.alto !== tamano.current.alto) {
        tamano.current = t;
        proceso.current!.width = mascara.current!.width = t.ancho;
        proceso.current!.height = mascara.current!.height = t.alto;
        lienzo.width = t.ancho * ESCALA_DIBUJO;
        lienzo.height = t.alto * ESCALA_DIBUJO;
        resultado.current = null;
        motor.enviar({ tipo: "configurar", controles: controlesRef.current, ...t });
      }

      const hayCuadroNuevo = conAviso ? cuadroNuevo : video.currentTime !== ultimoTiempo;
      if (hayCuadroNuevo && motor.libre()) {
        cuadroNuevo = false;
        ultimoTiempo = video.currentTime;
        ctxProceso.drawImage(video, 0, 0, t.ancho, t.alto);
        const img = ctxProceso.getImageData(0, 0, t.ancho, t.alto);
        if (verMascaraRef.current) {
          const capa = ctxMascara.createImageData(t.ancho, t.alto);
          pintarMascara(img.data, controlesRef.current.umbral, capa.data);
          ctxMascara.putImageData(capa, 0, 0);
        }
        motor.enviarCuadro(t.ancho, t.alto, img.data.buffer);
      }

      dibujarEscena(
        lienzo.getContext("2d")!,
        video,
        verMascaraRef.current ? mascara.current : null,
        resultado.current,
        controlesRef.current,
        tamano.current,
      );
    };
    id = requestAnimationFrame(paso);
    return () => {
      cancelAnimationFrame(id);
      if (conAviso) video.cancelVideoFrameCallback(idAviso);
    };
  }, [fuente, motor]);

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

  async function cargarVideo(archivo: File) {
    const video = videoRef.current;
    if (!video) return;
    apagarFuente();
    setError(null);
    urlVideo.current = URL.createObjectURL(archivo);
    video.src = urlVideo.current;
    video.playbackRate = velocidad;
    contadorACero();
    setFuente("video");
    setPausado(false);
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
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      apagarFuente();
      video.removeAttribute("src");
      video.srcObject = stream;
      contadorACero();
      setFuente("camara");
      setPausado(false);
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
    contadorACero();
    void video.play();
    setPausado(false);
  }

  function cambiarVelocidad(v: number) {
    setVelocidad(v);
    if (videoRef.current) videoRef.current.playbackRate = v;
  }

  return (
    <main className="pagina">
      <header className="cabecera">
        <h1>Contador de alevinos · página de pruebas</h1>
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
                Ver lo que detecta
              </label>
            </div>
          )}

          <p className="estado">
            {estado.cps} cuadros/s · motor {estado.ms.toFixed(1)} ms · área típica{" "}
            {estado.areaTipica === null ? "aprendiendo…" : `${Math.round(estado.areaTipica)} px`} · cuadro{" "}
            {tamano.current.ancho}×{tamano.current.alto}
          </p>
        </section>

        <aside className="lateral">
          <PanelControles controles={controles} onCambio={setControles} />
          <button type="button" className="boton" onClick={() => motor.enviar({ tipo: "olvidarArea" })}>
            Volver a aprender el tamaño del alevino
          </button>
        </aside>
      </div>
    </main>
  );
}
