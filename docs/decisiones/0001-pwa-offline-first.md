# 0001. App web instalable (PWA) que funciona sin internet

- Estado: Aceptada
- Fecha: 2026-10-13
- Decide: Frezzer

## Contexto

Los dueños de finca cuentan en lugares **sin señal**, con su propio teléfono, que puede ser Android o iPhone y muchas veces de gama baja. La app tiene que abrir, contar y guardar lo contado aunque no haya internet en todo el día. El servicio lo mantiene una persona o un equipo pequeño.

## Decisión

- Una **app web progresiva (PWA)**: se instala desde el navegador, sin tienda de aplicaciones, y queda guardada en el teléfono.
- **Offline-first:** el service worker guarda la app completa (código, motor, letra, íconos) en la primera visita; desde ahí abre y cuenta sin internet. Los datos viven primero en el teléfono (IndexedDB con Dexie) y se sincronizan cuando hay señal (fase posterior).
- Un solo lenguaje, **TypeScript**, en la app, el motor y el servidor; monorepo con pnpm.
- Publicación como sitio estático con HTTPS en **Cloudflare** (se creó como Worker de archivos estáticos; la CI publica solo si pasan las pruebas).

## Alternativas descartadas

- **App nativa (Kotlin y Swift):** dos apps que mantener, publicar en tiendas y actualizar en cada teléfono; demasiado para un equipo pequeño.
- **React Native o Flutter:** una sola base de código, pero igual hay que pasar por las tiendas y el motor de visión tendría que reescribirse para cada plataforma.
- **App web que necesita internet:** no sirve en fincas sin señal.

## Consecuencias

- Se instala con un enlace y se actualiza sola al tener señal; las versiones nuevas se aplican solo en el Inicio sin un conteo abierto, para no cortar una bolsa.
- La cámara y el service worker exigen **HTTPS** (también en desarrollo, con un certificado local).
- En iPhone hay límites de Apple para apps web: no vibra, no hay Bluetooth (la compuerta automática de la v2 no funcionaría ahí) y el almacenamiento puede borrarse si la app no se usa por semanas; se pide almacenamiento persistente y la sincronización lo mitigará.
- El rendimiento del motor depende del navegador: corre en un Web Worker y procesa cuadros de 320 px.
