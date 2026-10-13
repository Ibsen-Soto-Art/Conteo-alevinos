import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// HTTPS de desarrollo: el celular solo deja usar la cámara en páginas seguras.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "test" ? [] : [basicSsl()])],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  worker: { format: "es" },
  test: { environment: "node" },
}));
