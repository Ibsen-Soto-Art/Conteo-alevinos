import { MotorConteo, aGris, analizarCanal, brilloMedio, combinarMaximo, type CuadroGris } from "@contador/counting-engine";
import { configuracionMotor, type ConfiguracionContar, type MensajeAlMotor, type MensajeDelMotor } from "./protocolo";

/**
 * Lógica del Web Worker, separada para poder probarla sin navegador.
 * Recibe un mensaje y devuelve la respuesta (o null si no hay que responder).
 */
export function crearManejador(reloj: () => number = () => performance.now()) {
  let motor: MotorConteo | null = null;
  let actual: ConfiguracionContar | null = null;
  let gris: Uint8Array | undefined;
  let cuadrosCanal: CuadroGris[] = [];

  return function manejar(msg: MensajeAlMotor): MensajeDelMotor | null {
    switch (msg.tipo) {
      case "canal": {
        cuadrosCanal.push(aGris(new Uint8ClampedArray(msg.rgba), msg.ancho, msg.alto));
        if (!msg.ultimo) return null;
        const combinado = combinarMaximo(cuadrosCanal);
        cuadrosCanal = [];
        return { tipo: "canal", analisis: analizarCanal(combinado), ancho: msg.ancho, alto: msg.alto };
      }
      case "configurar": {
        const { tipo: _, ...nueva } = msg;
        const config = {
          ...configuracionMotor(nueva.controles, nueva.ancho, nueva.alto),
          perfil: nueva.perfil ?? null,
          pxPorCm: nueva.pxPorCm ?? null,
          lote: nueva.lote ?? null,
          sentidoAutomatico: Boolean(nueva.sentidoAutomatico),
        };
        const mismoTamano = motor && actual?.ancho === nueva.ancho && actual?.alto === nueva.alto;
        if (!motor || !mismoTamano || Boolean(actual?.fondo) !== Boolean(nueva.fondo)) {
          motor = new MotorConteo({ ...config, fondo: nueva.fondo ? {} : null });
          gris = new Uint8Array(nueva.ancho * nueva.alto);
        } else {
          // El rastreador solo se rehace si cambia su distancia, para no perder las pistas en vivo.
          const cambiaRastreador = actual?.controles.distanciaMaxima !== nueva.controles.distanciaMaxima;
          motor.actualizarConfiguracion({
            detector: config.detector,
            posicionLinea: config.posicionLinea,
            franja: config.franja,
            sentido: config.sentido,
            perfil: config.perfil,
            pxPorCm: config.pxPorCm,
            lote: config.lote,
            sentidoAutomatico: config.sentidoAutomatico,
            ...(cambiaRastreador ? { rastreador: config.rastreador } : {}),
          });
        }
        actual = nueva;
        return null;
      }
      case "cuadro": {
        if (!motor || msg.ancho !== actual?.ancho || msg.alto !== actual?.alto) {
          return { tipo: "error", mensaje: "El motor no está configurado para este tamaño de cuadro." };
        }
        const inicio = reloj();
        const cuadro = aGris(new Uint8ClampedArray(msg.rgba), msg.ancho, msg.alto, gris);
        const r = motor.procesar(cuadro, inicio);
        return {
          tipo: "resultado",
          total: r.total,
          sumados: r.sumadosEnEsteCuadro,
          detecciones: r.detecciones,
          descartadas: r.descartadas,
          pistas: r.pistas.map(({ id, x, y, peso, contada }) => ({ id, x, y, peso, contada })),
          areaTipica: motor.areaTipica,
          ancho: msg.ancho,
          alto: msg.alto,
          brillo: brilloMedio(cuadro),
          ms: reloj() - inicio,
          fondo: r.fondo,
          franja: motor.franja,
          origenTamano: r.perfil?.origen ?? null,
          flujo: r.flujo,
          cuadrosPorSegundo: motor.cuadrosPorSegundo,
          sentido: r.sentido,
          sentidoDecidido: r.sentidoDecidido,
        };
      }
      case "reiniciar":
        motor?.reiniciarConteo();
        return null;
      case "olvidarArea":
        motor?.olvidarAreaTipica();
        return null;
      case "reiniciarFondo":
        motor?.reiniciarFondo();
        return null;
      case "estadisticas":
        return { tipo: "estadisticas", estadisticas: motor?.estadisticasDelConteo ?? null, anchoRecorte: actual?.ancho ?? 0 };
    }
  };
}
