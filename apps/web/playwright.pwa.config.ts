import { defineConfig, devices } from "@playwright/test";
import { VIDEO_CAMARA } from "./e2e/video";

const PUERTO = 4174;

/**
 * Pruebas de la app compilada (como queda publicada): instalable y sin internet.
 * El servidor de desarrollo no usa service worker, por eso estas van aparte.
 */
export default defineConfig({
  testDir: "e2e-pwa",
  globalSetup: "./e2e/preparar.ts",
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: {
    ...devices["Desktop Chrome"],
    // http: Chromium no registra un service worker con certificado autofirmado; localhost ya es seguro.
    baseURL: `http://localhost:${PUERTO}`,
    viewport: { width: 360, height: 640 },
    hasTouch: true,
    isMobile: true,
    permissions: ["camera"],
    launchOptions: {
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        `--use-file-for-fake-video-capture=${VIDEO_CAMARA}`,
      ],
    },
  },
  webServer: {
    command: `SIN_HTTPS=1 pnpm exec vite build && SIN_HTTPS=1 pnpm exec vite preview --port ${PUERTO} --strictPort`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
