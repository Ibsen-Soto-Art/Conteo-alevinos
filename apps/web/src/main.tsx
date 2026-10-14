import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";

// El laboratorio es solo para quien desarrolla: se carga aparte y el campesino nunca lo ve.
const Laboratorio = lazy(() => import("./features/laboratorio/Laboratorio").then((m) => ({ default: m.Laboratorio })));
const esLaboratorio = location.pathname.replace(/\/$/, "").endsWith("/laboratorio");
if (esLaboratorio) document.documentElement.classList.add("modo-laboratorio");

createRoot(document.getElementById("raiz")!).render(
  <StrictMode>
    {esLaboratorio ? (
      <Suspense fallback={null}>
        <Laboratorio />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
