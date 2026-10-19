import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONTROLES_INICIALES } from "@contador/counting-engine";
import { perfilDe } from "@contador/domain";
import { beforeAll, describe, expect, it } from "vitest";
import { contarVideo } from "../src/medir";
import { medidasVideo } from "../src/video";
import { PX_POR_CM, videoSintetico } from "./sintetico";

/** Necesitan ffmpeg (también en la CI). */
const carpeta = mkdtempSync(join(tmpdir(), "precision-"));
const vertical = join(carpeta, "20261020_tilapia_pequeno_001.mp4");
const acostado = join(carpeta, "20261020_cachama_grande_001.mp4");
const negativo = join(carpeta, "20261020_burbujas_001.mp4");
const mezclado = join(carpeta, "20261020_cachama_mediano_001.mp4");
const sinVacio = join(carpeta, "20261020_cachama_mediano_002.mp4");
const alReves = join(carpeta, "20261020_cachama_mediano_003.mp4");
const cachama = perfilDe("cachama", "mediano");
let segundosVertical = 0;

beforeAll(() => {
  segundosVertical = videoSintetico(vertical, 12).segundos;
  videoSintetico(acostado, 8, { acostado: true });
  videoSintetico(negativo, ["burbuja", "basura", "burbuja", "basura", "burbuja", "basura"]);
  videoSintetico(mezclado, ["pez", "burbuja", "pez", "basura", "pez", "pez"]);
  videoSintetico(sinVacio, 10, { vacio: 0 });
  videoSintetico(alReves, 10, { alReves: true });
}, 120_000);

describe("videos de prueba", () => {
  it("lee el tamaño del video, girado como se ve en el celular", async () => {
    expect(await medidasVideo(vertical)).toMatchObject({ ancho: 360, alto: 640, cuadrosPorSegundo: 30 });
    expect(await medidasVideo(acostado)).toMatchObject({ ancho: 360, alto: 640 });
  });

  it("como la app: encuentra el canal por las marcas, recorta a 480 px y cuenta exacto con el perfil, cuadro por cuadro", async () => {
    const m = await contarVideo(vertical, CONTROLES_INICIALES, cachama);
    expect(m.crudo).toBe(12);
    expect(m.canal).toBe("marcas");
    expect(m.tamano.alto).toBe(480);
    // El canal entre marcas mide 272 px de ancho en el video; el recorte, m.tamano.ancho.
    expect(m.pxPorCm).toBeCloseTo((PX_POR_CM * m.tamano.ancho) / 272, 0);
    expect(m.cuadros).toBe(Math.round(segundosVertical * 30));
  }, 60_000);

  it("como la app, averigua el sentido: un video con el agua subiendo (celular al revés) cuenta igual", async () => {
    expect((await contarVideo(acostado, CONTROLES_INICIALES, cachama, { sentidoAutomatico: true })).crudo).toBe(8);
    expect((await contarVideo(alReves, CONTROLES_INICIALES, cachama, { sentidoAutomatico: true })).crudo).toBe(10);
  }, 60_000);

  it("un video grabado acostado (con marca de rotación) se cuenta igual", async () => {
    expect((await contarVideo(acostado, CONTROLES_INICIALES, cachama)).crudo).toBe(8);
  }, 60_000);

  it("con el sentido al revés no cuenta nada (los ajustes de la fila se usan)", async () => {
    expect((await contarVideo(vertical, { ...CONTROLES_INICIALES, sentido: "arriba" }, cachama)).crudo).toBe(0);
  }, 60_000);

  it("un video con solo burbujas y basura cuenta 0, también con el perfil más amplio", async () => {
    expect((await contarVideo(negativo, CONTROLES_INICIALES, cachama)).crudo).toBe(0);
    expect((await contarVideo(negativo, CONTROLES_INICIALES, perfilDe("otra", "mediano"))).crudo).toBe(0);
  }, 60_000);

  it("cuenta exacto aunque los alevinos pasen desde el primer segundo (sin canal vacío)", async () => {
    expect((await contarVideo(sinVacio, CONTROLES_INICIALES, cachama)).crudo).toBe(10);
  }, 60_000);

  it("entre burbujas y basura cuenta solo los alevinos", async () => {
    expect((await contarVideo(mezclado, CONTROLES_INICIALES, cachama)).crudo).toBe(4);
  }, 60_000);

  it("el script completo lee la plantilla, mide y guarda el informe por video y por especie", () => {
    writeFileSync(
      join(carpeta, "videos.csv"),
      [
        "archivo;usar;tipo;especie;especie_exacta;tamano;conteo_a_mano;luz;celular",
        "20261020_tilapia_pequeno_001.mp4;si;;tilapia;;mediano;12;buena;Samsung A15",
        "20261020_cachama_grande_001.mp4;si;;cachama;;mediano;10;poca;Moto G",
        "20261020_cachama_grande_002.mp4;si;;cachama;;mediano;10;buena;Moto G",
        "20261020_cachama_mediano_001.mp4;si;;bocachico;Prochilodus magdalenae;mediano;4;buena;Moto G",
        "20261020_burbujas_001.mp4;si;burbujas;;;;0;buena;Moto G",
        "malo.mp4;no;;cachama;;grande;10;buena;Moto G",
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
    expect(informe).toMatch(/\| bocachico +\| +1 \| +4 \| +4 \| +0,0 % \|/);
    expect(informe).toMatch(/\| \*\*Total\*\* +\| +3 \| +26 \| +24 \| +-7,7 % \| +\+0 \| +-2 \|/);
    expect(informe).toMatch(/\| bocachico · Prochilodus magdalenae +\| +1 \|/);
    expect(informe).toMatch(/\| burbujas +\| +1 \| +0 \| .*\| ✓ +\|/);
    expect(informe).toContain("4 marcas · 9,8 px/cm");
  }, 180_000);
});
