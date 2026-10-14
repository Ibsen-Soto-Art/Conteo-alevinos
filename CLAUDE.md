# Contador de alevinos: guía para Claude Code

Lee esto antes de trabajar en el repositorio. El diseño completo está en `docs/arquitectura.md`.

## Qué es

App web (PWA) para que dueños de fincas piscícolas cuenten alevinos con la cámara de su teléfono, **sin internet**. El teléfono va en un soporte sobre un canal de acrílico con luz LED por debajo; los alevinos pasan por el canal hacia la bolsa y la app los cuenta al cruzar una línea.

Especies: cachama, bocachico, bagres (pintadillo, yaque, pangasius) y tilapia, de varias tallas. Miles de alevinos por conteo. Meta de error: menos de 2 % en prototipo y menos de 1 % en campo.

## Decisiones ya tomadas (no cambiarlas sin preguntar)

- Solo **dos roles**: dueño de finca y administrador de plataforma. No hay rol de encargado ni de cliente comprador.
- La app **solo facilita el conteo**: no hay comprobantes, PDF, QR, clientes, pedidos ni envíos por WhatsApp.
- **Funciona sin internet**: acceso con licencia firmada (Ed25519) guardada en el teléfono que se renueva al haber señal; bloquea conteos nuevos tras 30 días sin conexión (ajustable).
- **No se guarda video** de los conteos. Los videos de entrenamiento se graban aparte, en un "modo grabación" solo para el administrador o fincas autorizadas.
- Calibración por lote: 100 alevinos contados a mano; factor = mano / app; se rechaza si queda fuera de 0,90 a 1,10.
- Conteo por bolsa con meta opcional; compuerta manual en v1.

## Stack

pnpm workspaces, TypeScript estricto, React + Vite, vite-plugin-pwa, Tailwind + shadcn/ui, Dexie (IndexedDB), ONNX Runtime Web en Web Worker (más adelante), Supabase como servidor (propuesta, aún no confirmada). Entrenamiento en Python con Ultralytics YOLO, en la carpeta `ml/`.

Turborepo no está instalado todavía: con pocos paquetes basta `pnpm -r`. Se agrega cuando las compilaciones o la CI se vuelvan lentas.

## Estado actual del código

- `packages/domain`: calibración y tipos de lote, conteo y bolsa. Con pruebas.
- `packages/counting-engine`: motor de conteo **clásico, sin entrenamiento**: umbral sobre fondo iluminado, manchas conectadas, rastreador por cercanía y cruce de línea. Las manchas grandes cuentan según área / área típica. El rastreador predice la posición con la velocidad de cada pista y recalcula el peso cuando una mancha se separa. Con pruebas sobre cuadros sintéticos.
- `apps/web`: app del campesino (7 pantallas, navegación por hash, estado en `app/sesion.ts`) y `/laboratorio` con los controles técnicos. El motor corre en un Web Worker (`features/conteo/`). HTTPS de desarrollo para usar la cámara desde el celular.
- Falta: calibración y bolsas en la página, PWA, guía para grabar videos en finca, carpeta `ml/`, ADR en `docs/decisiones/`, CI.

## Comandos

```bash
pnpm install
pnpm test        # todas las pruebas
pnpm typecheck
pnpm e2e         # Playwright (necesita ffmpeg): sin scroll en 360×640, 390×844 y 412×915, y conteo en vivo con cámara falsa
pnpm dev         # app web, cuando exista apps/web
```

## Reglas de código

- `domain` no depende de nada; `counting-engine` no conoce React ni el navegador (recibe cuadros en gris).
- Ningún paquete importa desde `apps/`.
- Código y nombres en español, como el existente.
- Cada cambio al motor lleva pruebas. Ninguna prueba se desactiva para que pase.
- Textos de la interfaz en español, botones grandes (mínimo 56 px), alto contraste.

## Reglas de diseño (siempre; detalle y pantallas en `docs/diseno.md`)

La usa un campesino al sol, con manos mojadas, con prisa y a veces con poca lectura.

1. Una sola tarea por pantalla; un solo botón principal abajo, de al menos 72 px. Todo lo tocable mide al menos 56 px.
2. Nada de teclado: todo se elige tocando botones grandes.
3. Palabras simples y trato de usted: «Prueba de 100» (no «calibración»), «Cerrar bolsa», «Siguiente bolsa», «Luz bien», «Poca luz».
4. **Sin scroll en el celular:** raíz `height: 100dvh; overflow: hidden`, zona central flex que se encoge, letras con `clamp()`. Listas largas por páginas.
5. Colores: acción `#0B6E69`, fondo `#F3F6F5`, texto `#0F2A30`, bordes `#C9D9D7`, éxito `#1E7A3C`, aviso ámbar, problema rojo. Siempre ícono y palabra, nunca solo color.
6. Letra Atkinson Hyperlegible, empacada en la app (sin internet).
7. Solo vertical. Wake Lock mientras cuenta. Vibración y sonido al llegar a la meta.

Los controles técnicos del motor solo existen en `/laboratorio`, que el campesino nunca ve.
