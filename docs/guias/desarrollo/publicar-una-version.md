# Publicar una versión (Cloudflare)

**Dirección publicada:** <https://conteo-alevinos.ibsensotart23.workers.dev> (proyecto `conteo-alevinos`, creado como Worker; ver «Si Cloudflare abre la pantalla de Workers»).

La app se publica sola en Cloudflare cada vez que se hace `git push` a la rama `main` del repositorio `Ibsen-Soto-Art/Conteo-alevinos`. Cloudflare descarga el código, lo compila y lo publica con HTTPS. Esta guía explica cómo dejarlo configurado la primera vez.

> Los nombres de los botones son los de la página de Cloudflare en octubre de 2026. Si alguno cambió un poco, busque el más parecido.

## Configuración de compilación (resumen)

| Campo en Cloudflare | Valor |
| --- | --- |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `npx pnpm@10.0.0 install --frozen-lockfile && npx pnpm@10.0.0 build:web` |
| Build output directory | `apps/web/dist` |
| Root directory (advanced) | *(vacío)* |
| Variable `NODE_VERSION` | `22` |
| Variable `SKIP_DEPENDENCY_INSTALL` | `1` |

Por qué así: el repositorio es un monorepo con pnpm 10. `SKIP_DEPENDENCY_INSTALL` evita que Cloudflare instale con su propia versión de pnpm; el comando de compilación instala con la misma versión que se usa al programar (la de `packageManager` en `package.json`) y compila solo `apps/web`.

## 1. Crear la cuenta

1. Abra <https://dash.cloudflare.com/sign-up>.
2. Escriba su correo y una contraseña, y toque **Sign up**.
3. Abra el correo de Cloudflare y toque el enlace para verificar la cuenta.
4. Si le pregunta qué quiere hacer o le ofrece agregar un dominio, puede saltarlo: no hace falta un dominio propio, Cloudflare da una dirección `.pages.dev` gratis.

## 2. Crear el proyecto y conectar GitHub

1. En el menú de la izquierda toque **Workers & Pages** (puede estar dentro de **Compute**).
2. Toque **Create application** (o **Create**).
3. Elija la pestaña **Pages** y, en **Import an existing Git repository**, toque **Get started**. (Si solo ve opciones de Workers, busque el enlace **Looking to deploy Pages? Get started**.)
4. Toque **Connect GitHub**. Se abre GitHub:
   1. Si le pide, inicie sesión en GitHub con la cuenta `Ibsen-Soto-Art`.
   2. En **Repository access** elija **Only select repositories** y escoja `Conteo-alevinos`.
   3. Toque **Install & Authorize**.
5. De vuelta en Cloudflare, elija la cuenta `Ibsen-Soto-Art`, el repositorio `Conteo-alevinos` y toque **Begin setup**.

## 3. Configurar la compilación

En **Set up builds and deployments**:

1. **Project name:** `contador-alevinos`. De aquí sale la dirección: `https://contador-alevinos.pages.dev`. Si el nombre ya está tomado, Cloudflare le agrega letras; anote la dirección que le muestre.
2. **Production branch:** `main`.
3. **Framework preset:** `None`.
4. **Build command:** `npx pnpm@10.0.0 install --frozen-lockfile && npx pnpm@10.0.0 build:web`
5. **Build output directory:** `apps/web/dist`
6. Abra **Root directory (advanced)** y déjelo vacío.
7. Abra **Environment variables (advanced)** y con **+ Add variable** agregue dos:
   - Variable name `NODE_VERSION`, value `22`
   - Variable name `SKIP_DEPENDENCY_INSTALL`, value `1`
8. Toque **Save and Deploy**.

La primera compilación tarda unos 2 minutos. Cuando diga **Success**, toque **Continue to project** y abra la dirección `https://contador-alevinos.pages.dev`.

## Si Cloudflare abre la pantalla de Workers

Cloudflare ahora muestra primero **Workers**. Se reconoce porque pide **Deploy command** (`npx wrangler deploy`) y **Preview command**. También sirve: el repositorio trae `wrangler.jsonc`, que publica `apps/web/dist` con las mismas reglas (`_headers`, `_redirects` y cualquier dirección abre la app).

| Campo | Valor |
| --- | --- |
| Project name | `conteo-alevinos` (debe ser igual a `name` en `wrangler.jsonc`) |
| Build command | `npx pnpm@10.0.0 install --frozen-lockfile && npx pnpm@10.0.0 build:web` |
| Deploy command | `npx wrangler deploy` |
| Preview command | el que trae Cloudflare |
| Variables (en **Advanced settings** → **Build variables**) | `NODE_VERSION` = `22`, `SKIP_DEPENDENCY_INSTALL` = `1` |

La dirección queda `https://conteo-alevinos.<su-subdominio>.workers.dev`; Cloudflare la muestra al terminar.

## 4. Publicar solo si el CI pasa

La compilación automática de Cloudflare publica cada push sin esperar a GitHub. Por eso la publicación la hace el CI (`.github/workflows/ci.yml`): el trabajo **Publicar en Cloudflare** corre solo en pushes a `main` y solo si **Instalar, revisar y probar** pasó, y publica exactamente la app que se probó. Para dejarlo así:

1. **Crear un token en Cloudflare.** Arriba a la derecha, el ícono de persona → **Profile** → **API Tokens** → **Create Token**. En la plantilla **Edit Cloudflare Workers** toque **Use template**. En **Account Resources** elija **Include** y su cuenta; en **Zone Resources**, **All zones**. Toque **Continue to summary** → **Create Token** y copie el token (solo se muestra una vez).
2. **Copiar el Account ID.** Es el número largo en la dirección del panel (`dash.cloudflare.com/<Account ID>/...`); también aparece en **Workers & Pages**, a la derecha, como **Account ID**.
3. **Guardar los dos en GitHub.** En el repositorio: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Cree `CLOUDFLARE_API_TOKEN` (el token) y `CLOUDFLARE_ACCOUNT_ID` (el Account ID), cada uno con **Add secret**.
4. **Probar.** En GitHub: **Actions** → **CI** → la última ejecución de `main` → **Re-run jobs** → **Re-run all jobs**. Los dos trabajos deben quedar en verde.
5. **Apagar la compilación de Cloudflare.** En Cloudflare: **Workers & Pages** → `conteo-alevinos` → **Settings** → **Build** → en **Git repository**, **Disconnect**. Desde ese momento solo publica el CI.
6. *(Opcional)* Para que un pull request no se pueda unir con pruebas fallando: en GitHub, **Settings** → **Branches** → **Add branch ruleset** (o **Add rule**) para `main`, con **Require status checks to pass** y el chequeo **Instalar, revisar y probar**.

Mientras no estén los secretos, el trabajo **Publicar en Cloudflare** falla con un aviso que lo explica (y la compilación de Cloudflare sigue publicando como antes).

## 5. Desde ahora

- Cada `git push` a `main` que pasa el CI publica una versión nueva sola. En GitHub, **Actions** muestra cada ejecución; en Cloudflare, **Deployments** muestra cada publicación.
- Si el CI falla, no se publica y la versión anterior sigue en línea. En **Actions**, la ejecución en rojo dice qué paso falló; si fue Playwright, descargue **informe-playwright** al final de la página.
- Para volver a una versión anterior: en **Deployments**, en los tres puntos de una publicación buena, **Rollback to this deployment**.
- Los teléfonos que ya tienen la app reciben la versión nueva la próxima vez que la abran con internet; se aplica cuando están en el Inicio sin un conteo abierto.

## Archivos de Cloudflare en el repositorio

- `apps/web/public/_redirects`: `/laboratorio` abre la app (que decide mostrar el laboratorio).
- `apps/web/public/_headers`: `sw.js`, el manifiesto e `index.html` sin caché (para que lleguen las versiones nuevas); `assets/` con caché larga; permiso de cámara solo para la propia app.
- `.node-version`: Node 22.

## Comprobar antes de publicar

El CI lo hace solo, pero se puede correr lo mismo en el computador:

```bash
pnpm test && pnpm typecheck && pnpm e2e
```

`pnpm e2e` incluye las pruebas de la app compilada sin internet (`apps/web/e2e-pwa/`).
