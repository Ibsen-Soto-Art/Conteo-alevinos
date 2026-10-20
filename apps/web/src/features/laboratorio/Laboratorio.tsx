import { PERFILES, perfilPorId } from "@contador/domain";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./laboratorio.css";
import { guardarAjustes, leerAjustes } from "../conteo/ajustes";
import { Captura, bucleDeCuadros, recorrerCuadroPorCuadro, type Geometria } from "../conteo/captura";
import { COLOR_DESCARTE, dibujarEscena, pintarMascara, type Destello } from "../conteo/dibujo";
import { type Controles, type MensajeDelMotor } from "../conteo/protocolo";
import { useMotor } from "../conteo/useMotor";
import { PanelControles } from "./PanelControles";
import { registroCsv, resumenRegistro, type FilaRegistro } from "./registro";

type Resultado = Extract<MensajeDelMotor, { tipo: "resultado" }>;
type Fuente = "ninguna" | "video" | "camara";

/** El lienzo visible se dibuja al doble del recorte para que se vea nítido. */
const ESCALA_DIBUJO = 2;
const VELOCIDADES = [1, 0.5, 0.25];
const SIN_PERFIL = "ninguno";
/** Resultados del motor que dura en pantalla un «+1 #12». */
const VIDA_DESTELLO = 40;
/** Filas que se ven del registro (el CSV las trae todas). */
const FILAS_A_LA_VISTA = 15;

/** 75,5 s → «01:15.500». */
function minutos(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(3).padStart(6, "0")}`;
}

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
  aprendiendo: "aprendiendo (cuenta con el umbral fijo)",
  listo: "aprendido",
};

export function Laboratorio() {
  const [controles, setControles] = useState<Controles>(leerAjustes);
  const [perfilId, setPerfilId] = useState("otra-mediano");
  const [usarFondo, setUsarFondo] = useState(true);
  // La app del campesino cuenta con el sentido fijo; averiguarlo es solo para probar aquí.
  const [sentidoAutomatico, setSentidoAutomatico] = useState(false);
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
    sentido: null as { sentido: Resultado["sentido"]; decidido: boolean; alReves: boolean } | null,
  });
  const [error, setError] = useState<string | null>(null);
  const [registro, setRegistro] = useState<FilaRegistro[]>([]);
  const [cpsArchivo, setCpsArchivo] = useState(30);
  /** Segundo del video procesado cuadro por cuadro; null si no se está haciendo. */
  const [avancePasos, setAvancePasos] = useState<number | null>(null);
  const modoPasos = useRef(false);
  const cpsArchivoRef = useRef(cpsArchivo);
  cpsArchivoRef.current = cpsArchivo;
  /** Para el modo cuadro por cuadro: se resuelve con el próximo mensaje del motor. */
  const esperando = useRef<(() => void) | null>(null);
  const destellos = useRef<(Destello & { vida: number })[]>([]);

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
    if (r.tipo !== "resultado") {
      esperando.current?.();
      return;
    }
    resultado.current = r;
    setTotal(r.total);
    // Registro: quién cambió el contador, cuánto y con qué medidas.
    destellos.current = destellos.current.map((d) => ({ ...d, vida: d.vida - 1 })).filter((d) => d.vida > 0);
    if (r.eventos.length > 0) {
      const video = videoRef.current;
      const hora = video && !(video.srcObject instanceof MediaStream) ? minutos(video.currentTime) : new Date().toLocaleTimeString("es-CO", { hour12: false }) + `.${String(Date.now() % 1000).padStart(3, "0")}`;
      const pxPorCm = captura.current?.geometria?.pxPorCmRecorte ?? null;
      const filas = r.eventos.map((e) => ({ ...e, hora, totalMostrado: r.total, pxPorCm }));
      setRegistro((antes) => [...antes, ...filas].slice(-5000));
      for (const e of r.eventos) {
        const color = e.sentido !== r.sentido ? "#9aa5ad" : e.cambio > 0 ? "#39ff6a" : "#ff5a4f";
        destellos.current.push({ x: e.x, y: e.y, texto: `${e.cambio > 0 ? "+" : ""}${e.cambio} #${e.id}`, color, vida: VIDA_DESTELLO });
      }
    }
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
        sentido: { sentido: r.sentido, decidido: r.sentidoDecidido, alReves: r.aguaAlReves },
      });
      contadorCps.current = { desde: ahora, cuadros: 0 };
    }
    esperando.current?.();
  }, []);

  const motor = useMotor(alResponder);

  // Los ajustes quedan guardados en este teléfono para que la app cuente con los mismos.
  useEffect(() => {
    guardarAjustes(controles);
    captura.current?.cambiar({ ajustes: controles });
  }, [controles]);

  useEffect(() => {
    captura.current?.cambiar({ perfil, fondo: usarFondo, sentidoAutomatico });
  }, [perfil, usarFondo, sentidoAutomatico]);

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
      sentidoAutomatico,
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
    const parar = modoPasos.current
      ? recorrerCuadroPorCuadro(video, c, esperarRespuesta, cpsArchivoRef.current, setAvancePasos, () => {
          modoPasos.current = false;
          setAvancePasos(null);
          setPausado(true);
        })
      : bucleDeCuadros(video, () => c.cuadro());
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
        destellos.current,
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

  /** Espera la próxima respuesta del motor (o 300 ms, por si ya llegó). */
  function esperarRespuesta() {
    return new Promise<void>((listo) => {
      const tiempo = setTimeout(() => {
        esperando.current = null;
        listo();
      }, 300);
      esperando.current = () => {
        clearTimeout(tiempo);
        esperando.current = null;
        listo();
      };
    });
  }

  /** Repite el video desde el inicio, cuadro por cuadro, sin saltarse ninguno. */
  function procesarCuadroPorCuadro() {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    modoPasos.current = true;
    setAvancePasos(0);
    empezarFuente("video");
    setPausado(true);
  }

  function pararCuadroPorCuadro() {
    modoPasos.current = false;
    setAvancePasos(null);
    empezarFuente("video");
    setPausado(true);
  }

  async function copiarRegistro() {
    try {
      await navigator.clipboard.writeText(registroCsv(registro));
    } catch {
      setError("No se pudo copiar: use «Descargar CSV».");
    }
  }

  function descargarRegistro() {
    const url = URL.createObjectURL(new Blob([registroCsv(registro)], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `registro-conteo-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function contadorACero() {
    motor.enviar({ tipo: "reiniciar" });
    resultado.current = null;
    setTotal(0);
  }

  /** Fuente nueva: se vuelve a mirar desde cero (canal, fondo y conteo). */
  function empezarFuente(nueva: Fuente) {
    contadorACero();
    setRegistro([]);
    destellos.current = [];
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
    modoPasos.current = false;
    setAvancePasos(null);
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
                  {avancePasos === null ? (
                    <button type="button" className="boton" onClick={procesarCuadroPorCuadro}>
                      Procesar cuadro por cuadro
                    </button>
                  ) : (
                    <button type="button" className="boton" onClick={pararCuadroPorCuadro}>
                      Parar ({minutos(avancePasos)})
                    </button>
                  )}
                  <label className="selector">
                    Cuadros por segundo del video
                    <select value={cpsArchivo} onChange={(e) => setCpsArchivo(Number(e.target.value))} disabled={avancePasos !== null}>
                      {[30, 60].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
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

          {fuente !== "ninguna" && (
            <section className="registro" aria-label="Registro de conteo">
              <div className="registro-cabecera">
                <strong>Registro de conteo</strong>
                <span>{resumir(registro, estado.sentido?.sentido ?? null)}</span>
              </div>
              <div className="registro-botones">
                <button type="button" className="boton" disabled={registro.length === 0} onClick={() => void copiarRegistro()}>
                  Copiar
                </button>
                <button type="button" className="boton" disabled={registro.length === 0} onClick={descargarRegistro}>
                  Descargar CSV
                </button>
                <button type="button" className="boton" disabled={registro.length === 0} onClick={() => setRegistro([])}>
                  Borrar
                </button>
              </div>
              {registro.length > 0 && (
                <table>
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>ID</th>
                      <th>Cambio</th>
                      <th>Peso</th>
                      <th>Largo×ancho px</th>
                      <th>Cuadros</th>
                      <th>Sentido</th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registro
                      .slice(-FILAS_A_LA_VISTA)
                      .reverse()
                      .map((f, i) => (
                        <tr key={`${f.cuadro}-${f.id}-${f.sentido}-${i}`} className={f.sentido !== estado.sentido?.sentido ? "otro-sentido" : ""}>
                          <td>{f.hora}</td>
                          <td>#{f.id}</td>
                          <td>{(f.cambio > 0 ? "+" : "") + f.cambio}</td>
                          <td>{f.peso}</td>
                          <td>{f.largo === null ? "—" : `${Math.round(f.largo)}×${Math.round(f.ancho!)}`}</td>
                          <td>{f.cuadrosSeguidos}</td>
                          <td>
                            {f.sentido}
                            {f.decidido ? "" : "?"}
                          </td>
                          <td>
                            {[
                              f.unida && "pedazos unidos",
                              f.nacioEnFranja && "nació en la franja",
                              f.recuperada > 0 && `recuperada ×${f.recuperada}`,
                              f.separadaDe !== null && `se separó de #${f.separadaDe}`,
                              f.llevadaPor !== null && `pegada a #${f.llevadaPor}`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </section>
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
            <dt>Sentido del agua</dt>
            <dd>
              {!estado.sentido
                ? "—"
                : !sentidoAutomatico
                  ? `fijo: ${estado.sentido.sentido}${estado.sentido.alReves ? " · ¡el agua corre al revés! (en la app: «El agua sube: gire el celular»)" : ""}`
                  : estado.sentido.decidido
                    ? `${estado.sentido.sentido} (averiguado)`
                    : `averiguando… (empezó con ${estado.sentido.sentido}; muestra el menor de los dos conteos)`}
            </dd>
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
              Aprender el fondo del canal
            </label>
            <label className="interruptor">
              <input type="checkbox" checked={sentidoAutomatico} onChange={(e) => setSentidoAutomatico(e.target.checked)} />
              Averiguar el sentido del agua (la app lo usa fijo hacia abajo)
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

/** «12 eventos: +3 de más por peso, 2 restas, 1 nacida en la franja…» */
function resumir(registro: FilaRegistro[], sentido: string | null): string {
  if (registro.length === 0) return "todavía nada: cada vez que el contador cambie aparece aquí";
  const r = resumenRegistro(registro, sentido);
  return [
    `${registro.length} eventos`,
    `total ${r.total}`,
    r.extraPorPeso > 0 && `+${r.extraPorPeso} por peso mayor que 1`,
    r.restas < 0 && `${r.restas} por regresos`,
    r.nacidasEnFranja > 0 && `${r.nacidasEnFranja} de pistas nacidas en la franja`,
    r.recuperadas > 0 && `${r.recuperadas} de pistas recuperadas`,
    r.unidas > 0 && `${r.unidas} de pedazos unidos`,
    r.separadas !== 0 && `${r.separadas} de manchas que se separaron`,
    r.llevadas !== 0 && `${r.llevadas} cruzando pegadas a otra`,
  ]
    .filter(Boolean)
    .join(" · ");
}
