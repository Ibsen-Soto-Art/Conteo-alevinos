Hola Claude. Este repositorio es el "Contador de alevinos": una app web (PWA) para que dueños de fincas piscícolas cuenten alevinos con la cámara del teléfono, sin internet. Trabaja siempre en español.

1. Antes de escribir código, lee completos CLAUDE.md y docs/arquitectura.md, y revisa packages/domain y packages/counting-engine.

2. Ejecuta `pnpm install`, `pnpm test` y `pnpm typecheck`, y dime si todo pasa.

3. Dame un análisis corto: qué está bien, qué ves incompleto o contradictorio en el diseño, y el plan de trabajo en pasos pequeños. Espera mi visto bueno antes de seguir.

4. Cuando te diga que sigas, construye en este orden, un paso a la vez, con pruebas en cada uno y un commit por paso:
   a. apps/web: una página de pruebas con React + Vite + TypeScript donde pueda cargar un video del celular o usar la cámara trasera. Debe dibujar el cuadro con las manchas detectadas y la línea de conteo, tener controles para el umbral, el área mínima, la posición de la línea y el sentido del flujo, y mostrar el conteo en grande. Usa el motor de packages/counting-engine dentro de un Web Worker.
   b. En esa misma página: calibración (cuento 100 a mano, la app calcula el factor con packages/domain) y meta por bolsa con botón "Cerrar bolsa" que guarda la bolsa y pone el contador en cero.
   c. Que la página sea instalable y funcione sin internet (vite-plugin-pwa).
   d. docs/guias/admin/grabar-videos-de-entrenamiento.md: guía sencilla para grabar en la finca videos de prueba con conteo manual conocido (altura del teléfono, luz, duración, cómo anotar especie, talla y cantidad).
   e. tests/precision/: un script que pase el motor por un video de prueba y compare con el conteo manual, mostrando el porcentaje de error.
   f. ml/: carpeta de entrenamiento en Python (requirements.txt, extraer cuadros de los videos, entrenar YOLO nano con Ultralytics y exportar a ONNX), con un README que explique cada paso para alguien que no es experto.
   g. docs/decisiones/: las ADR 0001 a 0007 que lista docs/arquitectura.md.
   h. .github/workflows: CI que corra install, typecheck y pruebas.

Reglas:
- Respeta las decisiones de CLAUDE.md: solo dos roles (dueño y administrador), la app solo cuenta (sin comprobantes, clientes ni WhatsApp), no se guarda video de los conteos, todo funciona sin internet.
- No agregues Supabase, inicio de sesión ni licencias todavía; eso va en una fase posterior.
- No desactives ni borres pruebas para que algo pase.
- Al terminar cada paso, dime en pocas líneas qué hiciste y cómo lo pruebo yo en mi computador o en mi celular (por ejemplo, abrir la página desde el celular en la misma red wifi).
