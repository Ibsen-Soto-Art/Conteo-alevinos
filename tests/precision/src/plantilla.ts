import { CONTROLES_INICIALES, type Controles, type SentidoFlujo } from "@contador/counting-engine";
import { leerCsv } from "./csv";

/** Un video de la plantilla (docs/guias/admin/plantilla-videos.csv), ya revisado. */
export interface VideoDePrueba {
  /** Número de fila en la plantilla (la cabecera es la 1), para los mensajes. */
  fila: number;
  archivo: string;
  especie: string;
  tamano: string;
  conteoAMano: number;
  luz: string;
  agua: string;
  flujo: string;
  celular: string;
  /** Ajustes del motor: los de fábrica, cambiados por las columnas técnicas si vienen llenas. */
  ajustes: Controles;
}

export interface Plantilla {
  videos: VideoDePrueba[];
  /** Filas con `usar = no`. */
  omitidos: number;
  /** Filas que no se pueden medir, con el porqué. */
  problemas: string[];
}

const SENTIDOS: SentidoFlujo[] = ["abajo", "arriba", "derecha", "izquierda"];

/** «Tamaño» → «tamano», «Sí» → «si»: la gente escribe con tildes y mayúsculas. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export function leerPlantilla(texto: string): Plantilla {
  const plantilla: Plantilla = { videos: [], omitidos: 0, problemas: [] };

  leerCsv(texto).forEach((crudo, i) => {
    const fila = i + 2;
    // Los nombres de columna también se aceptan con tilde o mayúscula («Tamaño»).
    const columnas = new Map(Object.entries(crudo).map(([k, v]) => [normalizar(k), v]));
    const valor = (nombre: string) => columnas.get(nombre) ?? "";

    if (["no", "n", "0", "false"].includes(normalizar(valor("usar")))) {
      plantilla.omitidos++;
      return;
    }
    const archivo = valor("archivo");
    if (!archivo) {
      plantilla.problemas.push(`Fila ${fila}: falta el nombre del archivo.`);
      return;
    }
    const conteo = Number(valor("conteo_a_mano").replace(/[.\s]/g, ""));
    if (!Number.isInteger(conteo) || conteo <= 0) {
      plantilla.problemas.push(`Fila ${fila} (${archivo}): «conteo_a_mano» debe ser un número entero mayor que 0.`);
      return;
    }

    const ajustes: Controles = { ...CONTROLES_INICIALES };
    const sentido = normalizar(valor("sentido")) as SentidoFlujo;
    if (sentido) {
      if (!SENTIDOS.includes(sentido)) {
        plantilla.problemas.push(`Fila ${fila} (${archivo}): «sentido» debe ser abajo, arriba, derecha o izquierda.`);
        return;
      }
      ajustes.sentido = sentido;
    }
    const numericas: [string, keyof Controles][] = [
      ["umbral", "umbral"],
      ["area_minima", "areaMinima"],
      ["linea", "lineaPorcentaje"],
      ["distancia", "distanciaMaxima"],
    ];
    for (const [columna, clave] of numericas) {
      const v = valor(columna).replace(",", ".");
      if (v === "") continue;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) {
        plantilla.problemas.push(`Fila ${fila} (${archivo}): «${columna}» debe ser un número.`);
        return;
      }
      (ajustes[clave] as number) = n;
    }

    plantilla.videos.push({
      fila,
      archivo,
      especie: normalizar(valor("especie")) || "sin especie",
      tamano: normalizar(valor("tamano")),
      conteoAMano: conteo,
      luz: normalizar(valor("luz")),
      agua: normalizar(valor("agua")),
      flujo: normalizar(valor("flujo")),
      celular: valor("celular"),
      ajustes,
    });
  });
  return plantilla;
}
