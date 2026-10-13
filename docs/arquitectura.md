# Contador de alevinos: documentación de la app web

13 de octubre de 2026 · Frezzer

Este documento reúne todo lo definido para la app del contador de alevinos, en tres partes que se pueden leer por separado:

- **Producto y usuarios**, para entender qué hace la app y quién la usa: Resumen · Requisitos · Roles y control de acceso · Flujo del dueño · Flujo del administrador · Pantallas
- **Arquitectura técnica**, para quien programa: Arquitectura general · Motor de conteo · Datos y sincronización · Stack · Estructura del código · Interfaz · Escalabilidad y seguridad · Calidad y pruebas
- **Plan del proyecto**: Fases · Documentación · Decisiones · Glosario

## Resumen

El contador de alevinos es un **servicio de conteo que se ofrece a dueños de fincas**: cada dueño cuenta con su propio teléfono, sin internet, y el administrador de la plataforma controla quién tiene acceso y hasta cuándo. La app es una **PWA offline-first con arquitectura limpia, en un monorepo TypeScript**.

- **Usuarios:** dos roles, dueño de finca y administrador de la plataforma.
- **Acceso sin internet:** una licencia firmada que el teléfono guarda y renueva cada vez que ve señal (por defecto vence a los 30 días sin conexión).
- **Conteo:** cámara del teléfono sobre un canal con luz LED; detección y seguimiento con un modelo de visión que corre en el propio teléfono.
- **Solo conteo:** la app sirve únicamente para contar; cada bolsa queda en el historial del dueño. No genera comprobantes, no maneja clientes ni envía nada por WhatsApp, y no guarda video.
- **Stack:** React + Vite + TypeScript, IndexedDB, ONNX Runtime Web, Supabase (PostgreSQL) como servidor.
- **Calidad:** cada cambio del motor se prueba contra videos de finca con conteo manual conocido; si el error supera la meta, no se publica.
- **Documentación:** dentro del repositorio, con Diátaxis, ADR y diagramas C4.

## Requisitos que guían la arquitectura

Cada decisión de este documento sale de uno de estos requisitos, tomados del diseño con celular y de lo que confirmaron los encargados de contar.

| Requisito | Consecuencia en la arquitectura |
| --- | --- |
| Fincas sin señal | Offline-first: la app instalada funciona sin internet; los datos viven primero en el teléfono y se sincronizan después |
| Cualquier smartphone, Android o iPhone | App web (PWA) en vez de app nativa; el motor se adapta a la potencia del teléfono (WebGPU si hay, si no WASM) |
| Miles de alevinos por conteo, error mínimo | Detección + seguimiento en tiempo real, calibración por lote y pruebas de precisión automáticas |
| Varias especies y tallas | Configuración por especie y talla, y modelos versionados que se pueden cambiar sin reinstalar la app |
| Sin video de respaldo | Los conteos de producción no guardan video; solo números y metadatos. Los videos de entrenamiento se graban aparte, en modo grabación |
| Crecer a varias fincas | Datos separados por finca desde el día uno (multi-finca) |
| Servicio ofrecido a varias fincas, con acceso controlado | Dos roles (dueño y administrador), planes con vencimiento y licencia sin conexión renovable |
| La app solo facilita el conteo | Sin comprobantes, clientes ni envíos por WhatsApp; la venta se maneja fuera de la app |

## Roles y control de acceso

La app tiene **dos roles**: el dueño de finca, que es el cliente del servicio y cuenta, y el administrador de la plataforma, que decide quién entra y hasta cuándo. El control funciona sin internet gracias a una **licencia sin conexión**: el teléfono guarda un permiso firmado con fecha de vencimiento y solo necesita conectarse de vez en cuando para renovarlo.

| Rol | Quién es | Qué hace en la app |
| --- | --- | --- |
| Administrador de la plataforma | Quien ofrece el servicio de conteo | Aprueba o crea las cuentas de los dueños; define plan, fecha de vencimiento y cuántos teléfonos puede usar cada finca; suspende o reactiva el acceso; publica modelos y perfiles de especie; ve el estado de cada cuenta (última conexión, conteos del mes), no el detalle de sus conteos |
| Dueño de finca | El piscicultor que contrata el servicio | Registra lotes, calibra, cuenta bolsa por bolsa y ve su historial de conteos, todo sin señal mientras su licencia esté vigente |

> _(Diagrama en el documento original: control de acceso · 2 roles)_

El administrador actúa siempre en línea; el dueño solo necesita señal para el primer ingreso y para renovar la licencia, y cuenta sin internet el resto del tiempo.

Cómo funciona, paso a paso:

1. El dueño solicita acceso desde la página con su nombre, finca y teléfono.
2. El administrador lo aprueba en su panel y define el plan, el vencimiento y el número de teléfonos permitidos.
3. El dueño inicia sesión una vez con señal. El servidor le entrega una licencia firmada digitalmente, que la app guarda junto con los modelos.
4. Desde ahí la app abre y cuenta sin internet. Cada vez que ve señal, renueva la licencia en segundo plano y sube el historial de conteos.
5. Si pasa el plazo sin conexión (por defecto 30 días, ajustable por cuenta) o la suscripción vence, la app deja de permitir conteos nuevos, pero conserva el historial de conteos.

Límites y protecciones:

- **Una suspensión no es instantánea en un teléfono sin señal:** se aplica en la siguiente conexión o al vencer el plazo. Un plazo más corto da más control; uno más largo, más comodidad en fincas sin señal.
- **La licencia no se puede falsificar:** está firmada con una clave que solo tiene el servidor, así que editarla la invalida.
- **Cambiar la fecha del teléfono no la extiende:** la app recuerda la última hora vista y bloquea si el reloj retrocede.
- **Trabajadores de la finca:** si el dueño quiere que otras personas cuenten, usan su misma cuenta en los teléfonos que permita su plan.

Las mismas reglas se aplican en el servidor con las reglas por fila de PostgreSQL: cada dueño solo ve los datos de su finca, y el administrador gestiona cuentas sin acceso al detalle de los conteos.

## Flujo de uso del dueño de finca

El dueño necesita señal solo dos veces: para entrar la primera vez y para sincronizar su historial. Todo el conteo ocurre sin internet.

> _(Diagrama en el documento original: flujo del dueño de finca · primer uso y venta)_

Detalles que la app cuida en este flujo:

- **Calibración por lote:** se pide una vez por lote y vale para todas sus bolsas; si cambia la especie o la talla, la app pide calibrar de nuevo.
- **Bolsa a bolsa:** cada bolsa se guarda al cerrarse, así que un corte de batería o una llamada no borra lo ya contado.
- **Meta por bolsa:** el dueño puede fijar cuántos alevinos lleva cada bolsa; la app vibra al llegar y muestra cuántas bolsas van.
- **Avisos:** luz insuficiente, canal fuera de cuadro, calibración vencida o licencia por vencer (7 días antes).

## Flujo de uso del administrador

El administrador tiene tres tareas: dar de alta a los dueños, controlar sus cuentas y mantener los modelos de conteo. Trabaja siempre en línea, desde un panel web en el navegador.

> _(Diagrama en el documento original: flujo del administrador · 3 tareas)_

Lo que ve y lo que no ve:

- **Ve** por cada cuenta: finca, plan, vencimiento, teléfonos activos, última conexión, número de conteos del mes y la precisión de la calibración por especie.
- **No ve** el detalle de los conteos de cada finca (lotes, cantidades, historial), para que los dueños confíen en el servicio.
- **Recibe avisos** de solicitudes nuevas, cuentas por vencer y teléfonos que no se conectan hace más de 20 días.

## Flujo de los videos de entrenamiento

Los videos para enseñar a la app nuevas especies y tallas se graban en la finca con un **modo grabación** de la misma app, se organizan en el panel del administrador y se entrenan en un computador aparte. Los conteos normales siguen sin guardar video.

> _(Diagrama en el documento original: videos de entrenamiento · finca, panel y computador)_

El modelo que sale del entrenamiento se publica en el panel y llega a todos los teléfonos la próxima vez que sincronizan.

Reglas del modo grabación:

- **Quién lo usa:** aparece solo para la cuenta del administrador, o en una finca a la que el administrador se lo active. Al inicio lo usa el administrador en sus visitas; más adelante, dueños de confianza.
- **Qué se guarda con cada clip:** especie, talla, fecha, teléfono y el número de alevinos contados a mano en ese clip.
- **Separado del conteo:** grabar no cuenta bolsas ni aparece en el historial de conteos.
- **Subida por wifi:** los videos pesan; se guardan en el teléfono y se suben cuando hay wifi o cuando el usuario lo autoriza con datos móviles.
- **Dónde quedan:** en el almacenamiento de Supabase, visibles solo en el panel del administrador.
- **El entrenamiento no ocurre en la página:** se hace en un computador con Python (carpeta `ml/` del repositorio).

## Pantallas de la app

Una sola página de entrada lleva a cada rol a su propio espacio: el dueño a la app instalada en su teléfono (6 pantallas) y el administrador a un panel web (5 pantallas).

> _(Diagrama en el documento original: mapa de pantallas · 2 roles)_

La pantalla **Contar** es el centro de la app: el número ocupa media pantalla, legible a 2 metros, con la meta por bolsa y el estado de la bolsa debajo. El panel del administrador no se instala en los teléfonos de los dueños.

Cuando el modo grabación está activo, la app del teléfono muestra una pantalla más, **Grabar video**, y el panel del administrador una pantalla **Videos**, para revisar y descargar los clips por especie y talla.

## Arquitectura general

La app sigue un modelo **offline-first de cliente pesado**: el teléfono captura, cuenta y guarda el resultado sin internet; la nube solo distribuye la app y los modelos, y guarda una copia de los datos.

> _(Diagrama en el documento original: arquitectura offline-first · teléfono y nube)_

El recorrido de un conteo va de la cámara al motor, del motor a la pantalla y de ahí a la base local; el service worker envía los pendientes a Supabase cuando hay señal y trae versiones nuevas de la app, de los modelos y de la licencia. El panel del administrador es una segunda app web, solo en línea, que trabaja sobre la misma base de datos.

Dentro del código se aplica **arquitectura limpia (hexagonal)**: el centro son las reglas del negocio (lote, conteo, bolsa, calibración) y el motor de conteo; la cámara, la base de datos y el servidor son "adaptadores" que se pueden cambiar sin tocar el centro.

## Motor de conteo en el teléfono

El motor es un paquete independiente (`packages/counting-engine`) que recibe cuadros de video y devuelve el conteo; no sabe nada de pantallas ni de servidores. Eso permite probarlo con videos grabados y mejorarlo sin tocar la app.

1. **Captura:** la cámara entrega cuadros a 30 por segundo; se recorta la zona del canal usando las 4 marcas impresas.
2. **Detección:** el modelo ONNX marca cada alevino en el cuadro (caja y confianza).
3. **Seguimiento:** un rastreador tipo ByteTrack asigna un número a cada alevino y lo sigue entre cuadros, para no contarlo dos veces.
4. **Cruce de línea:** se suma uno cuando un alevino seguido cruza la línea de conteo en el sentido del flujo.
5. **Corrección:** se aplica el factor de calibración del lote (los 100 contados a mano) y se calcula un margen de error.
6. **Resultado:** el worker publica el total en vivo a la interfaz y lo guarda en la bolsa activa.

Reglas de diseño del motor:

- Corre en un **Web Worker** para que la pantalla no se congele.
- Usa **WebGPU** cuando el teléfono lo tiene y **WASM** si no; al iniciar mide la velocidad y elige el tamaño de imagen.
- Cada especie y talla tiene un **perfil** (modelo, umbral de confianza, velocidad esperada) en un archivo de configuración versionado.
- Los modelos se descargan una vez, se guardan en el teléfono y se actualizan cuando hay señal; cada conteo anota la versión de modelo usada.

## Calibración del lote

La calibración mide cuánto se equivoca la app **con los alevinos de ese lote, ese día y en ese montaje**, y corrige el conteo con ese dato. Se hace pasando por el canal 100 alevinos contados a mano y comparando con lo que contó la app.

### Por qué hace falta

El modelo de visión nunca es perfecto, y su error cambia de un lote a otro por razones que el teléfono no puede saber de antemano:

- **Alevinos pegados o encimados:** dos que pasan juntos pueden contarse como uno.
- **Talla:** los muy pequeños o transparentes se pierden más; los grandes casi nunca.
- **Especie:** un bagre alargado y una tilapia se ven distintos en la cámara.
- **Agua y luz:** agua turbia, burbujas o luz débil reducen lo que la cámara ve.
- **Velocidad del flujo:** si pasan muy rápido o muchos a la vez, aumentan los cruces simultáneos.

Estos errores suelen ir **siempre en el mismo sentido** dentro de un lote (por ejemplo, la app cuenta un poco de menos). Ese error constante es el que la calibración elimina.

### Cómo funciona

1. Al empezar un lote, la app pide calibrar y muestra la especie y la talla registradas.
2. El dueño cuenta a mano exactamente 100 alevinos del lote, en un recipiente aparte.
3. Los vierte en el canal y la app los cuenta como en un conteo normal.
4. La app compara: si contó 97, el factor de corrección es 100 ÷ 97 = 1,031.
5. Desde ese momento, cada bolsa del lote se multiplica por ese factor.
6. Esos 100 alevinos pasan a la primera bolsa, así no se pierden ni se cuentan dos veces.

| Ejemplo | Valor |
| --- | --- |
| Contados a mano | 100 |
| Contados por la app | 97 |
| Factor de corrección | 1,031 |
| Bolsa contada por la app | 970 |
| Bolsa corregida que muestra la app | 1.000 |

Los valores son ilustrativos.

### Reglas de la app

- **Cuándo calibrar:** al iniciar cada lote, y otra vez si cambia la especie o la talla, se mueve el soporte o el teléfono, o cambian mucho la luz o el agua.
- **Límite de seguridad (propuesto):** si el factor queda fuera de 0,90 a 1,10 (la app falla más de 10%), no lo acepta y avisa que revise la luz, el flujo o la posición del teléfono antes de contar.
- **Se puede repetir:** una segunda pasada de 100 y el promedio de ambas da un factor más confiable.
- **Queda registrada:** cada lote guarda su calibración, y el administrador ve la precisión por especie para saber qué modelo mejorar.

### Por qué es importante

- Es lo que permite pasar de un modelo con 3 o 5% de error a un conteo con error cercano al 1%, que es la meta en campo.
- Sirve como alarma: un factor raro indica que algo está mal en el montaje antes de contar miles.
- Da confianza al dueño, porque ve con sus propios ojos qué tan bien cuenta la app ese día.

### Límites

- El conteo manual de los 100 debe ser exacto: un alevino de más o de menos mueve el factor 1%.
- Con 100 alevinos la calibración tiene una resolución de 1%. Para la meta de error menor a 1% puede hacer falta calibrar con 200; se decidirá con los datos del piloto.
- Corrige el error constante, no los errores al azar de una bolsa puntual; esos se reducen con buena luz, flujo pausado y un buen modelo.

## Conteo por bolsa

Un **conteo** es una jornada de trabajo con un lote, y dentro de ella se llenan varias **bolsas**; la app cuenta cada bolsa desde cero y suma el total del conteo.

### El montaje

El teléfono va en el soporte, mirando hacia abajo al canal de acrílico con luz LED por debajo. Los alevinos entran por un extremo con agua, pasan por el canal uno tras otro y salen por el otro extremo hacia la bolsa. Una compuerta en la salida deja pasar o detiene el flujo (manual en la primera versión).

### Paso a paso

1. **Iniciar el conteo:** el dueño elige el lote (ya calibrado) y, si quiere, una meta por bolsa, por ejemplo 1.000 alevinos.
2. **Poner la bolsa:** coloca la bolsa en la salida del canal y abre la compuerta.
3. **Verter los alevinos:** los echa poco a poco a la entrada del canal. Cada alevino que cruza la línea de conteo suma uno, ya corregido con el factor de calibración.
4. **Seguir el número:** la pantalla muestra en grande cuántos van en la bolsa y, en pequeño, el total del conteo.
5. **Acercarse a la meta:** cuando faltan pocos (por ejemplo 50), la pantalla cambia de color para que vierta más despacio.
6. **Llegar a la meta:** la app vibra y suena; el dueño cierra la compuerta. Si alcanzan a pasar unos pocos más, la app los sigue contando, así el número guardado es el real (por ejemplo 1.003).
7. **Cerrar la bolsa:** toca «Cerrar bolsa»; la app guarda cantidad, hora y lote, y el contador de la bolsa vuelve a cero.
8. **Siguiente bolsa:** pone otra bolsa, abre la compuerta y repite desde el paso 3.
9. **Terminar:** al acabar, toca «Terminar conteo» y ve el resumen: número de bolsas, cantidad de cada una y total.

Sin meta, el dueño simplemente cierra cada bolsa cuando quiera y la app guarda lo que contó.

### Qué se ve en la pantalla Contar

| Zona | Qué muestra |
| --- | --- |
| Número grande | Alevinos en la bolsa actual |
| Barra de meta | Cuánto falta para la meta (si hay meta) |
| Línea inferior | Bolsa número, total del conteo y lote |
| Avisos | Luz insuficiente, canal fuera de cuadro, flujo demasiado rápido |
| Botones | Pausar, Cerrar bolsa, Terminar conteo |

### Detalles importantes

- **Flujo pausado:** verter de a pocos mejora la precisión; si pasan demasiados a la vez, la app avisa «flujo muy rápido».
- **Pausa:** si hay que detenerse, «Pausar» congela el contador sin cerrar la bolsa.
- **Nada se pierde:** cada bolsa se guarda al cerrarse; si el teléfono se apaga, lo ya cerrado queda en el historial.
- **Compuerta automática (versión 2):** un servo por Bluetooth podría cerrar la compuerta justo al llegar a la meta, para que cada bolsa quede exacta. Bluetooth desde una app web no funciona en iPhone.

## Datos y sincronización

El teléfono es la fuente de verdad mientras no hay señal; el servidor recibe una copia y nunca reescribe una bolsa ya cerrada.

| Entidad | Qué guarda | Dónde se crea |
| --- | --- | --- |
| Cuenta del dueño | Nombre, correo o teléfono, estado (pendiente, activa, suspendida) | Solicitud en la página, aprobada en el panel |
| Plan y licencia | Vencimiento, teléfonos permitidos, días sin señal permitidos, licencia firmada vigente | Panel del administrador |
| Teléfono autorizado | Identificador del teléfono, última conexión, versión de app y de modelo | Al iniciar sesión en un teléfono |
| Finca | Nombre y ubicación | App del dueño |
| Lote | Especie, talla, fecha, calibración (100 a mano y factor) | App del dueño, sin señal |
| Conteo | Lote, meta por bolsa (opcional), hora de inicio y fin, versión de modelo | App del dueño, sin señal |
| Bolsa | Conteo, cantidad contada, margen de error, estado (válida o descartada) | App del dueño, sin señal |
| Modelo y perfil de especie | Versión del modelo, umbrales, especie y tallas | Panel del administrador |
| Video de entrenamiento | Archivo de video, especie, talla, fecha, teléfono, conteo manual del clip, estado (pendiente, revisado, usado) | Modo grabación en la app; se revisa en el panel |

Cómo funciona la sincronización:

- **Identificadores creados en el teléfono** (UUID v7), así nunca chocan aunque dos teléfonos cuenten sin señal.
- **Bandeja de salida (outbox):** cada cambio se guarda también como pendiente; cuando vuelve la señal, el service worker los envía en orden y el servidor los acepta una sola vez aunque lleguen repetidos.
- **Bolsas de solo agregar:** una bolsa cerrada no se edita; si hubo un error se marca como descartada y se cuenta de nuevo, y ambas quedan en el historial.
- **Reglas por fila en PostgreSQL:** cada usuario solo ve los datos de sus fincas.

## Stack tecnológico recomendado

Un solo lenguaje, TypeScript, en la app, el motor y el servidor; Python solo para entrenar modelos. Así una persona o un equipo pequeño puede mantener todo.

| Capa | Elección | Por qué |
| --- | --- | --- |
| Interfaz | React 19 + Vite + TypeScript | Ecosistema más grande, fácil conseguir desarrolladores, Vite compila rápido |
| Instalación y offline | vite-plugin-pwa (Workbox) | Service worker que guarda la app y los modelos en el teléfono |
| Estilos y componentes | Tailwind CSS + shadcn/ui (Radix) | Componentes accesibles y personalizables para una interfaz propia y llamativa |
| Navegación | TanStack Router | Rutas tipadas, carga diferida por pantalla |
| Estado de la app | Zustand | Simple, sin ceremonia; el estado del conteo en vivo vive en el worker |
| Base de datos local | IndexedDB con Dexie | Guarda lotes, conteos y bolsas sin señal |
| Cámara | getUserMedia + requestVideoFrameCallback | Acceso a la cámara trasera cuadro a cuadro |
| Visión | ONNX Runtime Web (WebGPU, con respaldo WASM) en un Web Worker | Corre el detector en el teléfono sin congelar la pantalla |
| Servidor (v1) | Supabase: PostgreSQL, autenticación, almacenamiento y reglas por fila | Backend listo sin administrar servidores; es PostgreSQL estándar, se puede migrar |
| Entrenamiento | Python + Ultralytics YOLO, exportado a ONNX | Detector pequeño (tipo YOLO nano) que cabe en un teléfono |
| Pruebas | Vitest, Playwright, pruebas de precisión con videos | Ver la sección de calidad |
| Monorepo y CI | pnpm + Turborepo + GitHub Actions | Varios paquetes en un repositorio, compilación incremental |
| Publicación | Hosting estático con CDN (Cloudflare Pages o Vercel) | La app es estática; barato y rápido en cualquier lugar |
| Licencias sin conexión | Token firmado con clave Ed25519 (librería jose), emitido por una Edge Function de Supabase | El teléfono verifica la firma sin internet; nadie puede alargar su licencia |
| Panel del administrador | Segunda app React + Vite, con los mismos componentes de packages/ui y TanStack Table | Reutiliza el sistema de diseño; no se instala en los teléfonos de los dueños |

Si más adelante se necesita lógica de servidor propia (facturación, integraciones), se agrega un servicio Node.js con Fastify sobre la misma base de datos, sin tocar la app.

## Estructura del código

Un solo repositorio, dividido por responsabilidad. La app se organiza por funcionalidades (todo lo de "conteo" junto), y las reglas del negocio viven en paquetes que no dependen de React.

```
contador-alevinos/
├── apps/
│   ├── web/                    # app del dueño (PWA, funciona sin señal)
│   │   └── src/
│   │       ├── app/            # arranque, rutas, service worker
│   │       ├── features/
│   │       │   ├── acceso/     # inicio de sesión, licencia, solicitud
│   │       │   ├── lotes/
│   │       │   ├── calibracion/
│   │       │   ├── grabacion/  # modo grabación (solo autorizado)
│   │       │   ├── conteo/     # cámara, conteo en vivo, bolsas
│   │       │   ├── historial/
│   │       │   └── ajustes/
│   │       └── shared/
│   └── admin/                  # panel del administrador (solo en línea)
│       └── src/features/
│           ├── solicitudes/
│           ├── cuentas/        # planes, teléfonos, suspender
│           ├── videos/         # clips de entrenamiento
│           ├── modelos/
│           └── metricas/
├── packages/
│   ├── counting-engine/        # detección, seguimiento, cruce de línea (sin UI)
│   ├── domain/                 # entidades y reglas: lote, conteo, bolsa, calibración
│   ├── licensing/              # verificar licencia y reloj sin internet
│   ├── sync/                   # base local, bandeja de salida, conexión al servidor
│   └── ui/                     # sistema de diseño: tokens y componentes
├── ml/                         # Python: datos, entrenamiento, exportación ONNX
├── supabase/
│   ├── migrations/             # tablas y reglas por fila
│   └── functions/              # emitir y renovar licencias
├── tests/precision/            # videos de prueba y conteos esperados
└── docs/                       # documentación (ver más abajo)
```

Reglas de dependencia, que se pueden verificar en CI con dependency-cruiser:

- `domain` no depende de nada.
- `counting-engine` y `sync` dependen solo de `domain`.
- `apps/web` usa todos los paquetes; ningún paquete importa desde `apps/`.
- Una funcionalidad no importa el interior de otra; comparten a través de `shared/` o de un paquete.

## Interfaz llamativa y funcional

La app se usa al sol, con manos mojadas y con prisa por terminar el conteo, así que "llamativa" significa clara de lejos y agradable, no recargada. Todo sale de un sistema de diseño propio en `packages/ui`.

- **Tokens de diseño:** colores, tipografía, espacios y radios definidos una vez. Paleta de marca con tonos de agua (azul y turquesa) y un acento cálido para el número del conteo.
- **El número manda:** en la pantalla de conteo, el total ocupa la mitad de la pantalla, legible a 2 metros, con una animación breve al subir.
- **Alto contraste para exteriores** y modo oscuro para galpones con poca luz.
- **Botones grandes** (mínimo 56 px) para dedos mojados; acciones clave abajo, al alcance del pulgar.
- **Respuesta sensorial:** vibración y sonido al cerrar una bolsa o al llegar a la meta por bolsa.
- **Estados claros:** sin señal, sincronizando, calibración vencida, luz insuficiente; cada uno con color e ícono propios.
- **Pantalla siempre encendida** durante el conteo (Wake Lock API).
- **Español primero,** con textos en archivos de traducción para agregar otros idiomas después.
- **Catálogo de componentes** en Storybook, para revisar cada pantalla y estado sin tener la cámara.

Las pantallas de cada rol están en la sección Pantallas de la app. El panel del administrador usa el mismo sistema de diseño, pensado para computador: tablas, filtros y acciones rápidas por cuenta.

## Escalabilidad y seguridad

Como el conteo ocurre en cada teléfono, sumar fincas no aumenta la carga del servidor de forma importante: solo recibe registros pequeños.

- **Multi-finca desde el inicio:** toda tabla lleva la finca; las reglas por fila de PostgreSQL aíslan los datos de cada finca.
- **Nuevas especies sin reprogramar:** se agrega un perfil y un modelo nuevo; la app los descarga sola.
- **Nuevas funciones como módulos:** un panel web para el dueño, la compuerta con servo Bluetooth (v2) o la facturación entran como funcionalidades o servicios nuevos sin tocar el motor.
- **App estática en CDN:** soporta miles de usuarios sin servidores propios.
- **Seguridad:** inicio de sesión con correo o teléfono, roles (dueño y administrador), licencias firmadas para el uso sin señal, HTTPS obligatorio y respaldos diarios de la base.
- **Observabilidad:** errores de la app con Sentry y métricas anónimas de precisión por especie para saber dónde mejorar el modelo.

## Calidad y pruebas

La prueba más importante no es de software sino de precisión: un cambio que empeora el conteo no se publica.

| Tipo de prueba | Herramienta | Qué asegura |
| --- | --- | --- |
| Precisión del conteo | Colección de videos de prueba por especie y talla, con conteo manual conocido | Error por debajo de la meta (2% en prototipo, 1% en campo) antes de cada versión |
| Unitarias | Vitest | Reglas del dominio, rastreador, cruce de línea, cálculo de calibración |
| Integración | Vitest + IndexedDB simulada | Bandeja de salida y sincronización sin duplicados |
| De punta a punta | Playwright con cámara simulada desde un video | Flujo completo: calibrar, contar, cerrar bolsa y ver el historial, sin red |
| Teléfonos reales | Lista de 3 a 5 teléfonos de gama baja y media | Velocidad mínima de cuadros por segundo en cada uno |
| Estilo y tipos | ESLint, Prettier, TypeScript estricto | Código uniforme |
| Acceso y licencias | Vitest + Playwright con reloj y red simulados | La app cuenta sin señal con licencia vigente, bloquea al vencer o si el reloj retrocede, y una suspensión llega al renovar |

Los videos de prueba son material de desarrollo grabado a propósito en finca; no cambian la decisión de no guardar video en los conteos reales. Todas las pruebas corren en GitHub Actions en cada cambio.

## Guía a seguir: fases del desarrollo

El orden recomendado es demostrar primero que el motor cuenta bien con videos reales y solo después construir la app completa. Cada fase termina en una "puerta": no se pasa a la siguiente hasta cumplirla.

> _(Diagrama en el documento original: fases del desarrollo · 6 fases, 5 puertas)_

La fase 0 deja el repositorio, la documentación y las siete primeras ADR listas; la fase 1 es la más riesgosa y la que decide si la meta de error es alcanzable con el teléfono.

## Cómo estructurar la documentación

La documentación vive en el mismo repositorio que el código ("docs-as-code"), en Markdown, y se revisa en cada cambio igual que el código. Se organiza con el método **Diátaxis** (cuatro tipos de documento) más **ADR** para las decisiones y el **modelo C4** para los diagramas, y se publica como sitio con Starlight o MkDocs Material.

```
docs/
├── index.md                         # qué es el proyecto y por dónde empezar
├── tutoriales/                      # aprender haciendo
│   ├── dueno-primer-conteo.md       # para el dueño de finca
│   ├── admin-primera-cuenta.md      # para el administrador
│   └── entorno-de-desarrollo.md     # para quien programa
├── guias/                           # cómo resolver una tarea concreta
│   ├── dueno/
│   │   ├── calibrar-un-lote.md
│   │   ├── contar-un-lote.md
│   │   └── revisar-el-historial.md
│   ├── admin/
│   │   ├── aprobar-una-solicitud.md
│   │   ├── suspender-o-renovar.md
│   │   └── publicar-un-modelo.md
│   └── desarrollo/
│       ├── agregar-una-especie.md
│       ├── entrenar-un-modelo.md
│       └── publicar-una-version.md
├── referencia/                      # datos exactos para consultar
│   ├── roles-y-permisos.md
│   ├── modelo-de-datos.md
│   ├── licencia-sin-conexion.md
│   ├── perfiles-de-especie.md
│   └── api-y-sincronizacion.md
├── explicacion/                     # por qué funciona así
│   ├── arquitectura.md              # diagramas C4
│   ├── flujos-de-uso.md             # diagramas por rol
│   ├── motor-de-conteo.md
│   └── precision-y-calibracion.md
├── decisiones/                      # ADR: una decisión por archivo, numeradas
│   ├── 0001-pwa-offline-first.md
│   ├── 0002-conteo-en-el-telefono.md
│   ├── 0003-sin-video-de-respaldo.md
│   ├── 0004-supabase-como-backend-v1.md
│   ├── 0005-solo-dos-roles.md
│   ├── 0006-licencia-sin-conexion.md
│   └── 0007-solo-conteo.md
├── hardware/                        # canal, LED, soporte, marcas impresas
└── glosario.md
```

En la raíz del repositorio van además:

- `README.md`: qué es, cómo correrlo en 5 minutos y enlaces a `docs/`.
- `CONTRIBUTING.md`: cómo proponer cambios, ramas, revisión y pruebas obligatorias.
- `CHANGELOG.md`: qué cambió en cada versión, en lenguaje claro, generado desde mensajes de commit convencionales.
- Plantillas de issue y de pull request en `.github/`.

Cada ADR sigue el mismo formato corto: contexto, decisión, alternativas descartadas y consecuencias. Las siete primeras recogen decisiones ya tomadas en este proyecto y en este documento.

## Decisiones tomadas y abiertas

Seis decisiones están tomadas o propuestas y forman las siete primeras ADR; quedan cinco preguntas abiertas que afectan el diseño.

| Decisión | Estado | ADR |
| --- | --- | --- |
| Contar con el teléfono del dueño, en una app web instalable que funciona sin internet | Decidida por Frezzer | 0001, 0002 |
| No guardar video en los conteos; los videos de entrenamiento se graban aparte, en modo grabación | Decidida por Frezzer | 0003 |
| Supabase como servidor en la primera versión | Propuesta | 0004 |
| Solo dos roles: dueño de finca y administrador de la plataforma | Decidida por Frezzer | 0005 |
| Acceso sin internet con licencia firmada que vence (30 días sin conexión por defecto) | Propuesta | 0006 |
| La app solo facilita el conteo: sin comprobantes, clientes ni envíos por WhatsApp | Decidida por Frezzer | 0007 |

Preguntas abiertas:

- [ ] Modelos de teléfono más comunes entre los piscicultores (define el tamaño del modelo de visión).
- [ ] Talla mínima y máxima de alevinos a contar.
- [ ] Planes y precios del servicio (mensual, por conteo, por finca).
- [ ] Plazo definitivo sin conexión antes de bloquear el conteo.
- [ ] Nombre del producto, para el repositorio, el dominio y el sistema de diseño.

## Glosario

| Término | Qué significa |
| --- | --- |
| ADR | Registro de una decisión de arquitectura: qué se decidió, por qué y qué se descartó |
| Calibración | Contar 100 alevinos a mano para ajustar el conteo automático de un lote |
| CDN | Red de servidores que entrega la app rápido desde cualquier lugar |
| Detección y seguimiento | Encontrar cada alevino en la imagen y seguirlo entre cuadros para no contarlo dos veces |
| IndexedDB | Base de datos dentro del navegador del teléfono, que funciona sin internet |
| Licencia sin conexión | Permiso firmado que el teléfono guarda para poder contar sin internet hasta su vencimiento |
| Modelo (ONNX) | Archivo con la “inteligencia” entrenada para reconocer alevinos de una especie |
| Monorepo | Un solo repositorio de código que contiene la app, el panel y los paquetes compartidos |
| Offline-first | La app está pensada para funcionar primero sin internet y sincronizar después |
| PWA | App web que se instala en el teléfono desde el navegador, sin tienda de aplicaciones |
| Reglas por fila | Reglas de la base de datos que solo dejan ver a cada usuario sus propios datos |
| Service worker | Parte de la app que guarda los archivos en el teléfono y sincroniza en segundo plano |
| Sincronizar | Enviar al servidor lo hecho sin señal y traer novedades (licencia, modelos) |
| Supabase | Servicio en la nube con base de datos PostgreSQL, inicio de sesión y almacenamiento |
