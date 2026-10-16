import type { VideoDePrueba } from "./plantilla";

/** Meta de error del prototipo (docs/arquitectura.md): menos de 2 %. En campo será 1 %. */
export const META_PROTOTIPO = 0.02;

export interface Resultado {
  video: VideoDePrueba;
  /** Lo que contó el motor; undefined si no se pudo medir. */
  app?: number;
  problema?: string;
}

export interface FilaResumen {
  grupo: string;
  videos: number;
  mano: number;
  app: number;
  /** (app − mano) / mano sobre la suma del grupo. */
  error: number;
  /** Promedio del error de cada video, sin signo: cuánto se equivoca un video cualquiera. */
  errorMedioAbs: number;
  /** El video con más error, sin signo. */
  peor: { archivo: string; error: number };
}

export function errorRelativo(app: number, mano: number): number {
  return (app - mano) / mano;
}

const medidos = (rs: Resultado[]) => rs.filter((r): r is Resultado & { app: number } => r.app !== undefined);

function resumir(grupo: string, rs: (Resultado & { app: number })[]): FilaResumen {
  const mano = rs.reduce((s, r) => s + r.video.conteoAMano, 0);
  const app = rs.reduce((s, r) => s + r.app, 0);
  const errores = rs.map((r) => ({ archivo: r.video.archivo, error: errorRelativo(r.app, r.video.conteoAMano) }));
  const peor = errores.reduce((a, b) => (Math.abs(b.error) > Math.abs(a.error) ? b : a));
  return {
    grupo,
    videos: rs.length,
    mano,
    app,
    error: errorRelativo(app, mano),
    errorMedioAbs: errores.reduce((s, e) => s + Math.abs(e.error), 0) / rs.length,
    peor,
  };
}

/** Una fila por especie (en orden alfabético) y al final el total. */
export function porEspecie(resultados: Resultado[]): { especies: FilaResumen[]; total: FilaResumen | null } {
  const ok = medidos(resultados);
  const grupos = new Map<string, (Resultado & { app: number })[]>();
  for (const r of ok) grupos.set(r.video.especie, [...(grupos.get(r.video.especie) ?? []), r]);
  const especies = [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([e, rs]) => resumir(e, rs));
  return { especies, total: ok.length > 0 ? resumir("Total", ok) : null };
}

const numero = new Intl.NumberFormat("es-CO", { useGrouping: "always", maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" });
const sinSigno = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 0.0153 → «+1,5 %». */
export function porcentaje(x: number, conSigno = true): string {
  return `${(conSigno ? decimal : sinSigno).format(x * 100)} %`;
}

const marcaMeta = (error: number, meta: number) => (Math.abs(error) <= meta ? "✓" : "✗");

/** Tabla en Markdown con columnas alineadas: se lee igual en la terminal y en el archivo .md. */
export function tabla(cabecera: string[], filas: string[][], derecha: boolean[]): string {
  const anchos = cabecera.map((c, i) => Math.max(c.length, ...filas.map((f) => (f[i] ?? "").length), 3));
  const celda = (t: string, i: number) => (derecha[i] ? t.padStart(anchos[i]!) : t.padEnd(anchos[i]!));
  const linea = (f: string[]) => `| ${f.map(celda).join(" | ")} |`;
  const separador = `| ${anchos.map((a, i) => (derecha[i] ? `${"-".repeat(a - 1)}:` : "-".repeat(a))).join(" | ")} |`;
  return [linea(cabecera), separador, ...filas.map(linea)].join("\n");
}

export function informeMarkdown(resultados: Resultado[], meta = META_PROTOTIPO, fecha = new Date()): string {
  const ok = medidos(resultados);
  const fallidos = resultados.filter((r) => r.app === undefined);
  const { especies, total } = porEspecie(resultados);

  const porVideo = tabla(
    ["Video", "Especie", "Tamaño", "A mano", "App", "Diferencia", "Error", "Meta"],
    ok.map((r) => {
      const e = errorRelativo(r.app, r.video.conteoAMano);
      return [
        r.video.archivo,
        r.video.especie,
        r.video.tamano,
        numero.format(r.video.conteoAMano),
        numero.format(r.app),
        (r.app - r.video.conteoAMano > 0 ? "+" : "") + numero.format(r.app - r.video.conteoAMano),
        porcentaje(e),
        marcaMeta(e, meta),
      ];
    }),
    [false, false, false, true, true, true, true, false],
  );

  const filaResumen = (f: FilaResumen) => [
    f.grupo,
    String(f.videos),
    numero.format(f.mano),
    numero.format(f.app),
    porcentaje(f.error),
    porcentaje(f.errorMedioAbs, false),
    `${f.peor.archivo} (${porcentaje(f.peor.error)})`,
    marcaMeta(f.error, meta),
  ];
  const resumen = tabla(
    ["Especie", "Videos", "A mano", "App", "Error total", "Error medio", "Peor video", "Meta"],
    [...especies.map(filaResumen), ...(total ? [filaResumen({ ...total, grupo: "**Total**" })] : [])],
    [false, true, true, true, true, true, false, false],
  );

  const partes = [
    `# Precisión del motor · ${fecha.toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })}`,
    "",
    `Meta: error de ±${sinSigno.format(meta * 100)} %. Error = (app − a mano) ÷ a mano, con lo que cuenta el motor sin factor de calibración. ` +
      "Positivo: la app contó de más. «Error medio»: promedio del error de cada video, sin signo.",
    "",
    "## Por especie",
    "",
    especies.length > 0 ? resumen : "_No se pudo medir ningún video._",
    "",
    "## Por video",
    "",
    ok.length > 0 ? porVideo : "_No se pudo medir ningún video._",
  ];
  if (fallidos.length > 0) {
    partes.push("", "## No medidos", "", ...fallidos.map((r) => `- ${r.video.archivo}: ${r.problema}`));
  }
  return partes.join("\n") + "\n";
}

/** Una fila por video, para abrir en una hoja de cálculo. */
export function informeCsv(resultados: Resultado[]): string {
  const filas = [["archivo", "especie", "tamano", "luz", "agua", "flujo", "celular", "conteo_a_mano", "app", "error_porcentaje", "problema"]];
  for (const r of resultados) {
    const v = r.video;
    filas.push([
      v.archivo, v.especie, v.tamano, v.luz, v.agua, v.flujo, v.celular,
      String(v.conteoAMano),
      r.app === undefined ? "" : String(r.app),
      r.app === undefined ? "" : (errorRelativo(r.app, v.conteoAMano) * 100).toFixed(2),
      r.problema ?? "",
    ]);
  }
  return filas.map((f) => f.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n") + "\n";
}
