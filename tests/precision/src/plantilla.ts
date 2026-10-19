import { CONTROLES_INICIALES, type Controles, type SentidoFlujo } from "@contador/counting-engine";
import { perfilDe, type EspeciePerfil, type PerfilEspecie, type TamanoPerfil } from "@contador/domain";
import { leerCsv } from "./csv";

/** Qué hay en el video: alevinos, o nada que deba contarse (negativos). */
export type TipoVideo = "alevinos" | "vacio" | "burbujas" | "basura";
export const TIPOS: TipoVideo[] = ["alevinos", "vacio", "burbujas", "basura"];
const TAMANOS: TamanoPerfil[] = ["pequeno", "mediano", "grande"];
const ESPECIES_CON_PERFIL: EspeciePerfil[] = ["cachama", "pangasius", "bocachico"];

/** Un video de la plantilla (docs/guias/admin/plantilla-videos.csv), ya revisado. */
export interface VideoDePrueba {
  /** Número de fila en la plantilla (la cabecera es la 1), para los mensajes. */
  fila: number;
  archivo: string;
  tipo: TipoVideo;
  especie: string;
  /** Opcional, p. ej. «Prochilodus magdalenae» (el bocachico es un solo perfil). */
  especieExacta: string;
  tamano: string;
  conteoAMano: number;
  luz: string;
  agua: string;
  flujo: string;
  celular: string;
  /** Ajustes del motor: los de fábrica, cambiados por las columnas técnicas si vienen llenas. */
  ajustes: Controles;
  /** Sin «sentido» en la fila, el motor lo averigua solo, como la app del campesino. */
  sentidoAutomatico: boolean;
  /**
   * El perfil con que cuenta la app para esa especie y tamaño («Otra especie» si no es una de
   * las tres). null si la fila no dice el tamaño: se mide sin perfil.
   */
  perfil: PerfilEspecie | null;
}

/** Un video sin alevinos: la app debe contar 0. */
export const esNegativo = (v: Pick<VideoDePrueba, "tipo">) => v.tipo !== "alevinos";

/**
 * El perfil que elegiría el campesino. En los videos sin alevinos que no dicen especie ni tamaño
 * se prueba con «Otra especie, mediano», el más amplio.
 */
export function perfilDelVideo(especie: string, tamano: string, tipo: TipoVideo): PerfilEspecie | null {
  const t = TAMANOS.find((x) => x === tamano) ?? (tipo === "alevinos" ? null : "mediano");
  if (!t) return null;
  const e = ESPECIES_CON_PERFIL.find((x) => x === especie) ?? "otra";
  return perfilDe(e, t);
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
    const tipo = (normalizar(valor("tipo")) || "alevinos") as TipoVideo;
    if (!TIPOS.includes(tipo)) {
      plantilla.problemas.push(`Fila ${fila} (${archivo}): «tipo» debe ser alevinos, vacio, burbujas o basura.`);
      return;
    }
    const textoConteo = valor("conteo_a_mano").replace(/[.\s]/g, "");
    const conteo = tipo !== "alevinos" && textoConteo === "" ? 0 : Number(textoConteo);
    if (tipo === "alevinos" && (!Number.isInteger(conteo) || conteo <= 0)) {
      plantilla.problemas.push(`Fila ${fila} (${archivo}): «conteo_a_mano» debe ser un número entero mayor que 0.`);
      return;
    }
    if (tipo !== "alevinos" && conteo !== 0) {
      plantilla.problemas.push(`Fila ${fila} (${archivo}): un video de tipo «${tipo}» no tiene alevinos: «conteo_a_mano» debe ser 0.`);
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
      ["franja_ancho", "franjaAncho"],
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

    const especie = normalizar(valor("especie"));
    const tamano = normalizar(valor("tamano"));
    plantilla.videos.push({
      fila,
      archivo,
      tipo,
      especie: especie || (tipo === "alevinos" ? "sin especie" : ""),
      especieExacta: valor("especie_exacta").trim(),
      tamano,
      conteoAMano: conteo,
      luz: normalizar(valor("luz")),
      agua: normalizar(valor("agua")),
      flujo: normalizar(valor("flujo")),
      celular: valor("celular"),
      ajustes,
      sentidoAutomatico: !sentido,
      perfil: perfilDelVideo(especie, tamano, tipo),
    });
  });
  return plantilla;
}
