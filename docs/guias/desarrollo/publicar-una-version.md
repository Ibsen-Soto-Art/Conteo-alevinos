# Publicar una versión (Cloudflare Pages)

La app se publica sola en Cloudflare Pages cada vez que se hace `git push` a la rama `main` del repositorio `Ibsen-Soto-Art/Conteo-alevinos`. Cloudflare descarga el código, lo compila y lo publica con HTTPS. Esta guía explica cómo dejarlo configurado la primera vez.

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

## 4. Desde ahora

- Cada `git push` a `main` publica una versión nueva sola. En el proyecto, la pestaña **Deployments** muestra cada publicación y si la compilación salió bien.
- Si una compilación falla, la versión anterior sigue publicada. En **Deployments**, toque la que falló y luego **View details** para ver el error.
- Para volver a una versión anterior: en **Deployments**, en los tres puntos de una publicación buena, **Rollback to this deployment**.
- Los teléfonos que ya tienen la app reciben la versión nueva la próxima vez que la abran con internet; se aplica cuando están en el Inicio sin un conteo abierto.

## Archivos de Cloudflare en el repositorio

- `apps/web/public/_redirects`: `/laboratorio` abre la app (que decide mostrar el laboratorio).
- `apps/web/public/_headers`: `sw.js`, el manifiesto e `index.html` sin caché (para que lleguen las versiones nuevas); `assets/` con caché larga; permiso de cámara solo para la propia app.
- `.node-version`: Node 22.

## Comprobar antes de publicar

```bash
pnpm test && pnpm typecheck && pnpm e2e
```

`pnpm e2e` incluye las pruebas de la app compilada sin internet (`apps/web/e2e-pwa/`).
