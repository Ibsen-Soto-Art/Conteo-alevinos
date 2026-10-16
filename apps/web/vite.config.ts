import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // HTTPS de desarrollo: el celular solo deja usar la cámara en páginas seguras.
    // SIN_HTTPS=1 lo apaga (pruebas en localhost: Chromium no registra un service
    // worker con un certificado autofirmado, y localhost ya cuenta como seguro).
    ...(mode === "test" || process.env.SIN_HTTPS ? [] : [basicSsl()]),
    VitePWA({
      // La versión nueva espera a que la app esté en el Inicio sin un conteo abierto
      // (ver app/useActualizacion.ts): nunca se recarga a mitad de una bolsa.
      registerType: "prompt",
      injectRegister: false,
      manifest: {
        id: "/",
        name: "Contador de alevinos",
        short_name: "Alevinos",
        description: "Cuente alevinos con la cámara del teléfono, sin internet.",
        lang: "es",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#F3F6F5",
        theme_color: "#0B6E69",
        icons: [
          { src: "icono-192.png", sizes: "192x192", type: "image/png" },
          { src: "icono-512.png", sizes: "512x512", type: "image/png" },
          { src: "icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Todo lo necesario para abrir y contar sin internet: código, Worker del motor, letra e íconos.
        globPatterns: ["**/*.{js,css,html,woff,woff2,png,svg,webmanifest}"],
        // Cualquier dirección sin archivo (/laboratorio, /?demo) abre la app guardada.
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  worker: { format: "es" },
  // Las pruebas de Playwright (e2e/) corren aparte con `pnpm e2e`.
  test: { environment: "node", include: ["test/**/*.test.ts"] },
}));
