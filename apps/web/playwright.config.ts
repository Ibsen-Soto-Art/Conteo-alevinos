import { defineConfig, devices } from "@playwright/test";

const PUERTO = 5199;

/** Los tamaños de pantalla de teléfonos comunes donde ninguna pantalla puede tener scroll. */
export const TELEFONOS = [
  { name: "360x640", viewport: { width: 360, height: 640 } },
  { name: "390x844", viewport: { width: 390, height: 844 } },
  { name: "412x915", viewport: { width: 412, height: 915 } },
];

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `https://localhost:${PUERTO}`,
    ignoreHTTPSErrors: true,
    hasTouch: true,
    isMobile: true,
  },
  projects: TELEFONOS.map((t) => ({
    name: t.name,
    use: { ...devices["Desktop Chrome"], viewport: t.viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
  })),
  webServer: {
    command: `pnpm exec vite --port ${PUERTO} --strictPort`,
    url: `https://localhost:${PUERTO}`,
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI,
  },
});
