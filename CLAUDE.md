# Contador de alevinos: guía para Claude Code

Lee esto antes de trabajar en el repositorio. El diseño completo está en `docs/arquitectura.md`.

## Qué es

App web (PWA) para que dueños de fincas piscícolas cuenten alevinos con la cámara de su teléfono, **sin internet**. El teléfono va en un soporte sobre un canal (de acrílico con luz LED por debajo, o de acero galvanizado con luz desde arriba, como el de campo); los alevinos pasan por el canal hacia la bolsa y la app los cuenta al cruzar una franja de conteo cerca de la salida.

Especies: por ahora el foco es **cachama, pangasius y bocachico** (Prochilodus, un solo perfil), más «Otra especie»; tallas pequeño 1–3, mediano 3–5 y grande 5–8 cm (`docs/especies/`). Miles de alevinos por conteo. Meta de error: menos de 2 % en prototipo y menos de 1 % en campo.

## Decisiones ya tomadas (no cambiarlas sin preguntar)

- Solo **dos roles**: dueño de finca y administrador de plataforma. No hay rol de encargado ni de cliente comprador.
- La app **solo facilita el conteo**: no hay comprobantes, PDF, QR, clientes, pedidos ni envíos por WhatsApp.
- **Nunca contar algo que no sea un alevino:** ante la duda, el motor descarta; en `/laboratorio` se ve lo descartado y por qué.
- **Funciona sin internet**: acceso con licencia firmada (Ed25519) guardada en el teléfono que se renueva al haber señal; bloquea conteos nuevos tras 30 días sin conexión (ajustable).
- **No se guarda video** de los conteos. Los videos de entrenamiento se graban aparte, en un "modo grabación" solo para el administrador o fincas autorizadas.
- Calibración por lote: 100 alevinos contados a mano; factor = mano / app; se rechaza si queda fuera de 0,90 a 1,10. Los 100 de la prueba se devuelven al tanque (no van en ninguna bolsa) y el conteo empieza en 0.
- Conteo por bolsa con meta opcional; compuerta manual en v1.

## Stack

pnpm workspaces, TypeScript estricto, React + Vite, vite-plugin-pwa, Tailwind + shadcn/ui, Dexie (IndexedDB), ONNX Runtime Web en Web Worker (más adelante), Supabase como servidor (propuesta, aún no confirmada). Entrenamiento en Python con Ultralytics YOLO, en la carpeta `ml/`.

Turborepo no está instalado todavía: con pocos paquetes basta `pnpm -r`. Se agrega cuando las compilaciones o la CI se vuelvan lentas.

## Estado actual del código

- `packages/domain`: calibración, lote, conteo y bolsa (crudo, factor, cantidad corregida, válida o descartada), UUID v7. Cada bolsa empieza en 0. **Perfiles por especie y tamaño** versionados (`perfiles.ts`, `VERSION_PERFILES`); el lote guarda su perfil, la versión y lo medido en la Prueba de 100. Con pruebas.
- `packages/counting-engine`: motor de conteo **clásico, sin entrenamiento** (ADR 0008): busca el canal y sus 4 marcas de 2 × 2 cm (`canal.ts`, px/cm), cuenta solo el recorte del canal (`geometria.ts`, ≤480 px), fondo aprendido mientras cuenta (desde el cuadro 10), con la variación de cada punto para no contar ondas ni reflejos (`fondo.ts`, ADR 0009 y 0012), cierre morfológico, medidas por momentos (largo, ancho, solidez, dos cuerpos, anillo de burbuja), filtro de forma con el perfil en píxeles (lote > marcas > amplio) y motivo del descarte (`forma.ts`), peso por largo/ancho y unión de pedazos, rastreador que sigue también lo descartado, sentido del agua fijo hacia abajo con aviso «El agua sube: gire el celular» (ADR 0011; el sentido automático de la ADR 0010 queda solo para /laboratorio) y **franja de conteo con conteo neto** (solo cuenta una pista que fue alevino sus últimos 3 cuadros seguidos y ≥60 % de sus cuadros; `franja.ts`). Medidor de flujo (`flujo.ts`). Con pruebas sobre cuadros sintéticos.
- `apps/web`: app del campesino (7 pantallas, navegación por hash, estado en `app/sesion.ts`, acciones que guardan en `app/acciones.ts`, IndexedDB con Dexie en `shared/datos/`) y `/laboratorio` con los controles técnicos. El motor corre en un Web Worker (`features/conteo/`). HTTPS de desarrollo para usar la cámara desde el celular.
- PWA (vite-plugin-pwa): instalable, vertical, abre sin internet después de la primera visita; las versiones nuevas se aplican solo en el Inicio sin conteo abierto (`app/useActualizacion.ts`).
- CI en `.github/workflows/ci.yml`: install, typecheck, test, build y e2e en cada push y PR; publica en Cloudflare solo si pasa, en `main`.
- Guía para grabar videos de entrenamiento (3 especies, tallas, flujo, de lado, devueltos y negativos: vacío, burbujas, basura) y plantilla CSV con `tipo` y `especie_exacta`: `docs/guias/admin/`. Montaje del canal (marcas, escalón, inclinación, luz): `docs/hardware/canal.md`.
- `tests/precision`: `pnpm precision [carpeta]` pasa cada video por el mismo camino que la app (canal y marcas, recorte, perfil de la fila, fondo) y da por especie el error total, contados de más y de menos; por especie exacta; y los videos sin alevinos aparte (meta 0). Los ajustes y la geometría del canal viven en `counting-engine` para que la app y el script midan igual.
- ADR 0001 a 0012 en `docs/decisiones/` (0004 Supabase y 0006 licencia: propuestas). Una decisión nueva va en una ADR nueva.
- `ml/` (Python 3.12): cuadros de los videos, pre-etiquetas con el método del motor clásico (negativos sin cajas), ida y vuelta a CVAT, división por video y por especie/tipo con `conjunto/videos.csv` (tipo, especie, especie exacta), entrenamiento YOLO nano de una clase `alevino` (Ultralytics, AGPL: solo `entrenar.py` y `exportar.py` lo usan), exportación a ONNX y `evaluar.py` (de más, de menos y error por especie, con ONNX Runtime); `coco.py` para cambiar a YOLOX o RTMDet. Pruebas con pytest en la CI.
- Siguiente fase (no empezar sin que lo pidan): Supabase, inicio de sesión, licencias, sincronización y usar el modelo ONNX en la app.

## Comandos

```bash
pnpm install
pnpm test        # todas las pruebas (las de precisión necesitan ffmpeg)
pnpm precision   # error del motor contra videos con conteo a mano (tests/precision)
pnpm typecheck
pnpm e2e         # Playwright (necesita ffmpeg): sin scroll en 360×640, 390×844 y 412×915, conteo en vivo con cámara falsa, y app compilada sin internet
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
