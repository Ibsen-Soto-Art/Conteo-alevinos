import { esNegativo, type VideoDePrueba } from "./plantilla";

/** Meta de error del prototipo (docs/arquitectura.md): menos de 2 %. En campo será 1 %. */
export const META_PROTOTIPO = 0.02;

export interface Resultado {
  video: VideoDePrueba;
  /** Lo que contó el motor; undefined si no se pudo medir. */
  app?: number;
  /** Cómo encontró el canal, p. ej. «4 marcas · 9,6 px/cm» o «sin marcas». */
  canal?: string;
  problema?: string;
}

export interface FilaResumen {
  grupo: string;
  videos: number;
  mano: number;
  app: number;
  /** (app − a mano) / a mano sobre la suma del grupo. */
  error: number;
  /** Suma de lo que sobró en los videos que contaron de más. */
  deMas: number;
  /** Suma de lo que faltó en los videos que contaron de menos. */
  deMenos: number;
  /** Promedio del error de cada video, sin signo: cuánto se equivoca un video cualquiera. */
  errorMedioAbs: number;
  /** El video con más error, sin signo. */
  peor: { archivo: string; error: number };
}

/** Videos sin alevinos de un tipo (vacío, burbujas, basura): lo que cuente la app es error. */
export interface FilaNegativos {
  tipo: string;
  videos: number;
  /** Total contado en esos videos (debería ser 0). */
  contados: number;
  peor: { archivo: string; contados: number };
}

export function errorRelativo(app: number, mano: number): number {
  return (app - mano) / mano;
}

type Medido = Resultado & { app: number };
const medidos = (rs: Resultado[]) => rs.filter((r): r is Medido => r.app !== undefined);
const conAlevinos = (rs: Resultado[]) => medidos(rs).filter((r) => !esNegativo(r.video));

function resumir(grupo: string, rs: Medido[]): FilaResumen {
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
    deMas: rs.reduce((s, r) => s + Math.max(0, r.app - r.video.conteoAMano), 0),
    deMenos: rs.reduce((s, r) => s + Math.max(0, r.video.conteoAMano - r.app), 0),
    errorMedioAbs: errores.reduce((s, e) => s + Math.abs(e.error), 0) / rs.length,
    peor,
  };
}

function agrupar(rs: Medido[], clave: (r: Medido) => string): FilaResumen[] {
  const grupos = new Map<string, Medido[]>();
  for (const r of rs) grupos.set(clave(r), [...(grupos.get(clave(r)) ?? []), r]);
  return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([g, lista]) => resumir(g, lista));
}

/** Una fila por especie (en orden alfabético) y al final el total. Solo videos con alevinos. */
export function porEspecie(resultados: Resultado[]): { especies: FilaResumen[]; total: FilaResumen | null } {
  const ok = conAlevinos(resultados);
  return { especies: agrupar(ok, (r) => r.video.especie), total: ok.length > 0 ? resumir("Total", ok) : null };
}

/** Una fila por especie exacta (solo los videos que la dicen), p. ej. «bocachico · Prochilodus magdalenae». */
export function porEspecieExacta(resultados: Resultado[]): FilaResumen[] {
  const ok = conAlevinos(resultados).filter((r) => r.video.especieExacta !== "");
  return agrupar(ok, (r) => `${r.video.especie} · ${r.video.especieExacta}`);
}

/** Los videos sin alevinos, por tipo. */
export function negativos(resultados: Resultado[]): FilaNegativos[] {
  const grupos = new Map<string, Medido[]>();
  for (const r of medidos(resultados).filter((r) => esNegativo(r.video))) grupos.set(r.video.tipo, [...(grupos.get(r.video.tipo) ?? []), r]);
  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tipo, rs]) => {
      const peor = rs.reduce((a, b) => (b.app > a.app ? b : a));
      return { tipo, videos: rs.length, contados: rs.reduce((s, r) => s + r.app, 0), peor: { archivo: peor.video.archivo, contados: peor.app } };
    });
}

const numero = new Intl.NumberFormat("es-CO", { useGrouping: "always", maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" });
const sinSigno = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 0.0153 → «+1,5 %». */
export function porcentaje(x: number, conSigno = true): string {
  return `${(conSigno ? decimal : sinSigno).format(x * 100)} %`;
}

/** «4 marcas · 9,6 px/cm» o «sin marcas». */
export function describirCanal(fuente: "marcas" | "todo", pxPorCm: number | null): string {
  return fuente === "marcas" && pxPorCm ? `4 marcas · ${sinSigno.format(pxPorCm)} px/cm` : "sin marcas";
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

function tablaResumen(titulo: string, filas: FilaResumen[], meta: number): string {
  const fila = (f: FilaResumen) => [
    f.grupo,
    String(f.videos),
    numero.format(f.mano),
    numero.format(f.app),
    porcentaje(f.error),
    `+${numero.format(f.deMas)}`,
    `-${numero.format(f.deMenos)}`,
    porcentaje(f.errorMedioAbs, false),
    `${f.peor.archivo} (${porcentaje(f.peor.error)})`,
    marcaMeta(f.error, meta),
  ];
  return tabla(
    [titulo, "Videos", "A mano", "App", "Error total", "De más", "De menos", "Error medio", "Peor video", "Meta"],
    filas.map(fila),
    [false, true, true, true, true, true, true, true, false, false],
  );
}

export function informeMarkdown(resultados: Resultado[], meta = META_PROTOTIPO, fecha = new Date()): string {
  const ok = conAlevinos(resultados);
  const fallidos = resultados.filter((r) => r.app === undefined);
  const { especies, total } = porEspecie(resultados);
  const exactas = porEspecieExacta(resultados);
  const sinAlevinos = negativos(resultados);

  const porVideo = tabla(
    ["Video", "Especie", "Tamaño", "A mano", "App", "Diferencia", "Error", "Meta", "Canal"],
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
        r.canal ?? "",
      ];
    }),
    [false, false, false, true, true, true, true, false, false],
  );

  const partes = [
    `# Precisión del motor · ${fecha.toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })}`,
    "",
    `Meta: error de ±${sinSigno.format(meta * 100)} %. Error = (app − a mano) ÷ a mano, con lo que cuenta el motor sin factor de calibración. ` +
      "Positivo: la app contó de más. «De más» y «De menos»: lo que sobró en los videos que contaron de más y lo que faltó en los que contaron de menos " +
      "(dentro de un mismo video no se puede separar). «Error medio»: promedio del error de cada video, sin signo.",
    "",
    "## Por especie",
    "",
    especies.length > 0 ? tablaResumen("Especie", [...especies, ...(total ? [{ ...total, grupo: "**Total**" }] : [])], meta) : "_No se pudo medir ningún video con alevinos._",
  ];
  if (exactas.length > 0) partes.push("", "## Por especie exacta", "", tablaResumen("Especie exacta", exactas, meta));
  if (sinAlevinos.length > 0) {
    partes.push(
      "",
      "## Sin alevinos",
      "",
      "Videos de canal vacío, solo burbujas o solo basura: la app debe contar 0.",
      "",
      tabla(
        ["Tipo", "Videos", "Contados", "Peor video", "Meta"],
        sinAlevinos.map((n) => [n.tipo, String(n.videos), numero.format(n.contados), `${n.peor.archivo} (${numero.format(n.peor.contados)})`, n.contados === 0 ? "✓" : "✗"]),
        [false, true, true, false, false],
      ),
    );
  }
  partes.push("", "## Por video", "", ok.length > 0 ? porVideo : "_No se pudo medir ningún video con alevinos._");
  if (fallidos.length > 0) {
    partes.push("", "## No medidos", "", ...fallidos.map((r) => `- ${r.video.archivo}: ${r.problema}`));
  }
  return partes.join("\n") + "\n";
}

/** Una fila por video, para abrir en una hoja de cálculo. */
export function informeCsv(resultados: Resultado[]): string {
  const filas = [
    ["archivo", "especie", "tamano", "luz", "agua", "flujo", "celular", "conteo_a_mano", "app", "error_porcentaje", "problema", "tipo", "especie_exacta", "perfil", "canal"],
  ];
  for (const r of resultados) {
    const v = r.video;
    filas.push([
      v.archivo, v.especie, v.tamano, v.luz, v.agua, v.flujo, v.celular,
      String(v.conteoAMano),
      r.app === undefined ? "" : String(r.app),
      r.app === undefined || esNegativo(v) ? "" : (errorRelativo(r.app, v.conteoAMano) * 100).toFixed(2),
      r.problema ?? "",
      v.tipo, v.especieExacta, v.perfil?.id ?? "sin perfil", r.canal ?? "",
    ]);
  }
  return filas.map((f) => f.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n") + "\n";
}
