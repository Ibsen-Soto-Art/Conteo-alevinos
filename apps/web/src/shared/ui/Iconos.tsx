import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

/** Base de los íconos: trazo grueso del color del texto, para verse bien al sol. */
function Icono({ children, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconoChulo = (p: Props) => (
  <Icono {...p}>
    <path d="M4 12.5l5 5L20 6.5" />
  </Icono>
);

export const IconoAviso = (p: Props) => (
  <Icono {...p}>
    <path d="M12 3L2 20h20L12 3z" />
    <path d="M12 10v4" />
    <path d="M12 17.5v.01" />
  </Icono>
);

export const IconoProblema = (p: Props) => (
  <Icono {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" />
  </Icono>
);

export const IconoVolver = (p: Props) => (
  <Icono {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Icono>
);

export const IconoSiguiente = (p: Props) => (
  <Icono {...p}>
    <path d="M9 5l7 7-7 7" />
  </Icono>
);

export const IconoMas = (p: Props) => (
  <Icono {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icono>
);

export const IconoMenos = (p: Props) => (
  <Icono {...p}>
    <path d="M5 12h14" />
  </Icono>
);

export const IconoPausa = (p: Props) => (
  <Icono {...p}>
    <path d="M8 5v14M16 5v14" />
  </Icono>
);

export const IconoSeguir = (p: Props) => (
  <Icono {...p}>
    <path d="M7 4.5l12 7.5-12 7.5z" />
  </Icono>
);

export const IconoLista = (p: Props) => (
  <Icono {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="M4 6h.01M4 12h.01M4 18h.01" />
  </Icono>
);

export const IconoAyuda = (p: Props) => (
  <Icono {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7" />
    <path d="M12 17.2v.01" />
  </Icono>
);

export const IconoSol = (p: Props) => (
  <Icono {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
  </Icono>
);

/** Linterna prendida: con rayos de luz. */
export const IconoLinterna = (p: Props) => (
  <Icono {...p}>
    <path d="M8 10h8l-1.5 4v7h-5v-7L8 10z" />
    <path d="M8 10V8h8v2" />
    <path d="M12 2v2.5M6 3.5l1.3 1.8M18 3.5l-1.3 1.8" />
  </Icono>
);

/** Linterna apagada: tachada, sin rayos. */
export const IconoLinternaApagada = (p: Props) => (
  <Icono {...p}>
    <path d="M8 10h8l-1.5 4v7h-5v-7L8 10z" />
    <path d="M8 10V8h8v2" />
    <path d="M4 4l16 16" />
  </Icono>
);

export const IconoBolsa = (p: Props) => (
  <Icono {...p}>
    <path d="M7 4h10l-1.5 3c3 2 4.5 5 4.5 8a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5c0-3 1.5-6 4.5-8L7 4z" />
  </Icono>
);

export const IconoDeshacer = (p: Props) => (
  <Icono {...p}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </Icono>
);

export const IconoTerminar = (p: Props) => (
  <Icono {...p}>
    <path d="M5 21V4" />
    <path d="M5 4h12l-2.5 4L17 12H5" />
  </Icono>
);

export const IconoInicio = (p: Props) => (
  <Icono {...p}>
    <path d="M3 11l9-7 9 7" />
    <path d="M5.5 9.5V20h13V9.5" />
  </Icono>
);

export const IconoGirar = (p: Props) => (
  <Icono {...p}>
    <rect x="7" y="2.5" width="10" height="19" rx="2" />
    <path d="M11 18.5h2" />
  </Icono>
);

/** Dibujo del pez para el botón principal del inicio. */
export const DibujoPez = (p: Props) => (
  <svg viewBox="0 0 120 64" aria-hidden="true" focusable="false" {...p}>
    <path
      d="M10 32c14-20 44-26 68-12l22-14c-2 9-3 17-2 26-1 9 0 17 2 26L78 44C54 58 24 52 10 32z"
      fill="currentColor"
      opacity="0.95"
    />
    <circle cx="28" cy="28" r="4.5" fill="#F3F6F5" />
    <path d="M44 20c4 7 4 17 0 24" fill="none" stroke="#F3F6F5" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
  </svg>
);

/** Flecha circular de «Volver a cero». */
export const IconoReiniciar = (p: Props) => (
  <Icono {...p}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7" />
    <path d="M4 4v5h5" />
  </Icono>
);

/** Dibujo: un balde con los alevinos de la prueba y una flecha hacia el tanque con agua. */
export const DibujoDevolver = (p: Props) => (
  <svg viewBox="0 0 240 140" aria-hidden="true" focusable="false" {...p}>
    {/* balde */}
    <path d="M14 52h62l-8 70H22z" fill="#ffffff" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
    <path d="M22 52c0-16 14-26 32-26s32 10 32 26" fill="none" stroke="currentColor" strokeWidth="4" />
    <text x="45" y="96" textAnchor="middle" fontSize="24" fontWeight="700" fill="currentColor">
      100
    </text>
    {/* flecha */}
    <path d="M86 46c26-30 62-30 84-4" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <path d="M160 30l12 14-18 4" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    {/* tanque con agua y peces */}
    <rect x="132" y="64" width="98" height="64" rx="6" fill="#ffffff" stroke="currentColor" strokeWidth="5" />
    <path d="M136 82c10-6 20 6 30 0s20 6 30 0 20 6 30 0v42h-90z" fill="#0b6e69" opacity="0.35" />
    <path d="M156 100c5-6 13-7 19-2l6-4-1 6 1 6-6-4c-6 5-14 4-19-2z" fill="currentColor" />
    <path d="M192 112c5-6 13-7 19-2l6-4-1 6 1 6-6-4c-6 5-14 4-19-2z" fill="currentColor" />
  </svg>
);
