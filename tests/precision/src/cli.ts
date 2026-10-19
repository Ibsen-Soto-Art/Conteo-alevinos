import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { META_PROTOTIPO, describirCanal, informeCsv, informeMarkdown, negativos, porEspecie, porcentaje, type Resultado } from "./informe";
import { contarVideo } from "./medir";
import { esNegativo, leerPlantilla } from "./plantilla";

const AYUDA = `
Uso: pnpm precision [carpeta] [--meta 2] [--plantilla videos.csv] [--salida carpeta]

  carpeta      Carpeta con los videos y la plantilla llena (por defecto tests/precision/videos).
  --meta N     Error permitido en %, por defecto 2. Si alguna especie lo pasa, o si cuenta algo
               en un video sin alevinos, termina con error (sirve para que una versión que cuenta
               peor no se publique).
  --plantilla  Nombre de la plantilla dentro de la carpeta (por defecto videos.csv).
  --salida     Dónde guardar el informe (por defecto tests/precision/resultados).
`;

function leerArgumentos(argv: string[]) {
  // pnpm ejecuta el script desde tests/precision: las rutas que escribe la persona son
  // relativas a donde estaba (INIT_CWD).
  const base = process.env.INIT_CWD ?? process.cwd();
  const op = { carpeta: resolve("videos"), plantilla: "videos.csv", salida: resolve("resultados"), meta: META_PROTOTIPO };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    const siguiente = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`Falta el valor de ${a}`);
      return v;
    };
    if (a === "--ayuda" || a === "--help" || a === "-h") {
      console.log(AYUDA);
      process.exit(0);
    } else if (a === "--meta") op.meta = Number(siguiente().replace(",", ".")) / 100;
    else if (a === "--plantilla") op.plantilla = siguiente();
    else if (a === "--salida") op.salida = resolve(base, siguiente());
    else if (!a.startsWith("--")) op.carpeta = resolve(base, a);
    else throw new Error(`No conozco la opción ${a}.${AYUDA}`);
  }
  if (!Number.isFinite(op.meta) || op.meta <= 0) throw new Error("--meta debe ser un número mayor que 0.");
  return op;
}

async function principal() {
  const op = leerArgumentos(process.argv.slice(2));
  const rutaPlantilla = join(op.carpeta, op.plantilla);
  if (!existsSync(rutaPlantilla)) {
    throw new Error(
      `No encontré la plantilla ${rutaPlantilla}.\nCopie docs/guias/admin/plantilla-videos.csv a esa carpeta con el nombre ${op.plantilla} y llénela.`,
    );
  }
  const plantilla = leerPlantilla(await readFile(rutaPlantilla, "utf8"));
  for (const p of plantilla.problemas) console.warn(`⚠ ${p}`);
  if (plantilla.omitidos > 0) console.log(`(${plantilla.omitidos} videos marcados «usar = no»)`);
  if (plantilla.videos.length === 0) throw new Error("La plantilla no tiene videos para medir.");

  const resultados: Resultado[] = [];
  for (const [i, video] of plantilla.videos.entries()) {
    const ruta = join(op.carpeta, video.archivo);
    const prefijo = `[${i + 1}/${plantilla.videos.length}] ${video.archivo}`;
    if (!existsSync(ruta)) {
      resultados.push({ video, problema: "no está en la carpeta" });
      console.log(`${prefijo}: ✗ no está en la carpeta`);
      continue;
    }
    try {
      const m = await contarVideo(ruta, video.ajustes, video.perfil, { sentidoAutomatico: video.sentidoAutomatico });
      const canal = describirCanal(m.canal, m.pxPorCm);
      resultados.push({ video, app: m.crudo, canal });
      const perfil = video.perfil?.nombre ?? "sin perfil (falta el tamaño)";
      const medida = esNegativo(video)
        ? `${video.tipo}: contó ${m.crudo} ${m.crudo === 0 ? "✓" : "✗"}`
        : `app ${m.crudo}, a mano ${video.conteoAMano} (${porcentaje((m.crudo - video.conteoAMano) / video.conteoAMano)})`;
      console.log(`${prefijo}: ${medida} · ${perfil} · ${canal} · ${m.cuadros} cuadros`);
    } catch (e) {
      const problema = e instanceof Error ? e.message : String(e);
      resultados.push({ video, problema });
      console.log(`${prefijo}: ✗ ${problema}`);
    }
  }

  const fecha = new Date();
  const md = informeMarkdown(resultados, op.meta, fecha);
  console.log(`\n${md}`);
  await mkdir(op.salida, { recursive: true });
  // Nombre con la hora local del computador: AAAA-MM-DD-HH-MM.
  const dos = (n: number) => String(n).padStart(2, "0");
  const nombre = `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}-${dos(fecha.getHours())}-${dos(fecha.getMinutes())}`;
  await writeFile(join(op.salida, `${nombre}.md`), md);
  await writeFile(join(op.salida, `${nombre}.csv`), informeCsv(resultados));
  console.log(`Informe guardado en ${join(op.salida, nombre)}.md y .csv`);

  const { especies } = porEspecie(resultados);
  const sinAlevinos = negativos(resultados);
  const fuera = [
    ...especies.filter((f) => Math.abs(f.error) > op.meta).map((f) => `${f.grupo} (${porcentaje(f.error)})`),
    ...sinAlevinos.filter((n) => n.contados > 0).map((n) => `${n.tipo} (contó ${n.contados} sin alevinos)`),
  ];
  if (fuera.length > 0 || (especies.length === 0 && sinAlevinos.length === 0)) {
    console.error(`\n✗ Fuera de la meta: ${fuera.join(", ") || "nada medido"}`);
    process.exitCode = 1;
  }
}

principal().catch((e: unknown) => {
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
});
