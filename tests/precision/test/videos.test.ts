import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONTROLES_INICIALES } from "@contador/counting-engine";
import { beforeAll, describe, expect, it } from "vitest";
import { contarVideo } from "../src/medir";
import { medidasVideo } from "../src/video";
import { videoSintetico } from "./sintetico";

/** Necesitan ffmpeg (también en la CI). */
const carpeta = mkdtempSync(join(tmpdir(), "precision-"));
const vertical = join(carpeta, "20261020_tilapia_pequeno_001.mp4");
const acostado = join(carpeta, "20261020_cachama_grande_001.mp4");

beforeAll(() => {
  videoSintetico(vertical, 12);
  videoSintetico(acostado, 8, { acostado: true });
}, 60_000);

describe("videos de prueba", () => {
  it("lee el tamaño del video, girado como se ve en el celular", async () => {
    expect(await medidasVideo(vertical)).toEqual({ ancho: 360, alto: 640 });
    expect(await medidasVideo(acostado)).toEqual({ ancho: 360, alto: 640 });
  });

  it("el motor cuenta exactamente los alevinos del video, cuadro por cuadro", async () => {
    const m = await contarVideo(vertical, CONTROLES_INICIALES);
    expect(m.crudo).toBe(12);
    expect(m.tamano).toEqual({ ancho: 180, alto: 320 });
    expect(m.cuadros).toBe(Math.round((12 * 0.5 + 3) * 30));
  });

  it("un video grabado acostado (con marca de rotación) se cuenta igual", async () => {
    expect((await contarVideo(acostado, CONTROLES_INICIALES)).crudo).toBe(8);
  });

  it("con el sentido al revés no cuenta nada (los ajustes de la fila se usan)", async () => {
    expect((await contarVideo(vertical, { ...CONTROLES_INICIALES, sentido: "arriba" })).crudo).toBe(0);
  });

  it("el script completo lee la plantilla, mide y guarda el informe por video y por especie", () => {
    writeFileSync(
      join(carpeta, "videos.csv"),
      [
        "archivo;usar;especie;tamano;conteo_a_mano;luz;celular",
        "20261020_tilapia_pequeno_001.mp4;si;tilapia;pequeno;12;buena;Samsung A15",
        "20261020_cachama_grande_001.mp4;si;cachama;grande;10;poca;Moto G",
        "20261020_cachama_grande_002.mp4;si;cachama;grande;10;buena;Moto G",
        "malo.mp4;no;cachama;grande;10;buena;Moto G",
      ].join("\n"),
    );
    const salida = join(carpeta, "resultados");
    let texto = "";
    let codigo = 0;
    try {
      texto = execFileSync("pnpm", ["exec", "tsx", "src/cli.ts", carpeta, "--salida", salida], { encoding: "utf8", stdio: "pipe" });
    } catch (e) {
      const err = e as { status: number; stdout: string; stderr: string };
      codigo = err.status;
      texto = err.stdout + err.stderr;
    }
    // La cachama contó 8 de 10 (−20 %): fuera de la meta, el script termina con error.
    expect(codigo).toBe(1);
    expect(texto).toContain("Fuera de la meta: cachama (-20,0 %)");
    expect(texto).toContain("20261020_cachama_grande_002.mp4: ✗ no está en la carpeta");

    const [md] = readdirSync(salida).filter((f) => f.endsWith(".md"));
    const informe = readFileSync(join(salida, md!), "utf8");
    expect(informe).toMatch(/\| tilapia +\| +1 \| +12 \| +12 \| +0,0 % \|/);
    expect(informe).toMatch(/\| cachama +\| +1 \| +10 \| +8 \| +-20,0 % \|/);
    expect(informe).toMatch(/\| \*\*Total\*\* +\| +2 \| +22 \| +20 \| +-9,1 % \|/);
  }, 60_000);
});
