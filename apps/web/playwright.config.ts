import { defineConfig, devices } from "@playwright/test";
import { VIDEO_CAMARA } from "./e2e/video";

const PUERTO = 5199;

/** Los tamaños de pantalla de teléfonos comunes donde ninguna pantalla puede tener scroll. */
export const TELEFONOS = [
  { name: "360x640", viewport: { width: 360, height: 640 } },
  { name: "390x844", viewport: { width: 390, height: 844 } },
  { name: "412x915", viewport: { width: 412, height: 915 } },
];

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/preparar.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `https://localhost:${PUERTO}`,
    ignoreHTTPSErrors: true,
    hasTouch: true,
    isMobile: true,
  },
  projects: TELEFONOS.map((t, i) => ({
    name: t.name,
    // El conteo en vivo no depende del tamaño de pantalla: basta con correrlo en el primero.
    testIgnore: i === 0 ? undefined : ["conteo-en-vivo.spec.ts", "conteo-completo.spec.ts", "volver-a-cero.spec.ts"],
    use: {
      ...devices["Desktop Chrome"],
      viewport: t.viewport,
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2,
      // Cámara falsa de Chromium que muestra el video sintético de alevinos (e2e/preparar.ts).
      permissions: ["camera"],
      launchOptions: {
        args: [
          "--use-fake-ui-for-media-stream",
          "--use-fake-device-for-media-stream",
          `--use-file-for-fake-video-capture=${VIDEO_CAMARA}`,
        ],
      },
    },
  })),
  webServer: {
    command: `pnpm exec vite --port ${PUERTO} --strictPort`,
    url: `https://localhost:${PUERTO}`,
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI,
  },
});
