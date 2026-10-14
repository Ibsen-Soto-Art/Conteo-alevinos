import { MotorConteo, aGris, brilloMedio } from "@contador/counting-engine";
import { configuracionMotor, type Controles, type MensajeAlMotor, type MensajeDelMotor } from "./protocolo";

/**
 * Lógica del Web Worker, separada para poder probarla sin navegador.
 * Recibe un mensaje y devuelve la respuesta (o null si no hay que responder).
 */
export function crearManejador(reloj: () => number = () => performance.now()) {
  let motor: MotorConteo | null = null;
  let tamano = { ancho: 0, alto: 0 };
  let controles: Controles | null = null;
  let gris: Uint8Array | undefined;

  return function manejar(msg: MensajeAlMotor): MensajeDelMotor | null {
    switch (msg.tipo) {
      case "configurar": {
        const config = configuracionMotor(msg.controles, msg.ancho, msg.alto);
        const mismoTamano = motor && tamano.ancho === msg.ancho && tamano.alto === msg.alto;
        if (!motor || !mismoTamano) {
          motor = new MotorConteo(config);
          gris = new Uint8Array(msg.ancho * msg.alto);
        } else {
          // El rastreador solo se rehace si cambia su distancia, para no perder las pistas en vivo.
          const cambiaRastreador = controles?.distanciaMaxima !== msg.controles.distanciaMaxima;
          motor.actualizarConfiguracion({
            detector: config.detector,
            posicionLinea: config.posicionLinea,
            sentido: config.sentido,
            ...(cambiaRastreador ? { rastreador: config.rastreador } : {}),
          });
        }
        tamano = { ancho: msg.ancho, alto: msg.alto };
        controles = msg.controles;
        return null;
      }
      case "cuadro": {
        if (!motor || msg.ancho !== tamano.ancho || msg.alto !== tamano.alto) {
          return { tipo: "error", mensaje: "El motor no está configurado para este tamaño de cuadro." };
        }
        const inicio = reloj();
        const cuadro = aGris(new Uint8ClampedArray(msg.rgba), msg.ancho, msg.alto, gris);
        const r = motor.procesar(cuadro);
        return {
          tipo: "resultado",
          total: r.total,
          sumados: r.sumadosEnEsteCuadro,
          detecciones: r.detecciones,
          pistas: r.pistas.map(({ id, x, y, peso, contada }) => ({ id, x, y, peso, contada })),
          areaTipica: motor.areaTipica,
          ancho: msg.ancho,
          alto: msg.alto,
          brillo: brilloMedio(cuadro),
          ms: reloj() - inicio,
        };
      }
      case "reiniciar":
        motor?.reiniciarConteo();
        return null;
      case "olvidarArea":
        motor?.olvidarAreaTipica();
        return null;
    }
  };
}
