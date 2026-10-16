# Publicar una versión

**Dirección:** <https://contador.ibsen-soto.pro> (también <https://contador-alevinos.pages.dev>).

La app se publica sola en **Cloudflare Pages** con cada `git push` a `main`, **solo si pasa la CI** (`.github/workflows/ci.yml`): instalar, tipos, pruebas, compilación, Playwright y pruebas de `ml/`. El trabajo **Publicar en Cloudflare** sube exactamente la app que se probó, con `wrangler pages deploy`, al proyecto `contador-alevinos`. Si el proyecto no existe, lo crea.

> Los nombres de los botones son los de Cloudflare, GitHub y Hostinger en octubre de 2026. Si alguno cambió un poco, busque el más parecido.

## Desde ahora

- `git push` a `main` → en unos 3 minutos la versión nueva está publicada. En GitHub, **Actions** muestra cada ejecución.
- Si la CI falla, no se publica y sigue en línea la versión anterior. La ejecución en rojo dice qué paso falló; si fue Playwright, descargue **informe-playwright** al final de la página.
- Para volver a una versión anterior: en Cloudflare, **Workers & Pages** → `contador-alevinos` → **Deployments** → en una publicación buena, **⋯** → **Rollback to this deployment**.
- Los teléfonos con la app instalada reciben la versión nueva la próxima vez que la abren con internet; se aplica cuando están en el Inicio sin un conteo abierto.

## Cómo quedó configurado (por si hay que repetirlo)

### 1. Token de Cloudflare para GitHub

En Cloudflare: ícono de persona arriba a la derecha → **Profile** → **API Tokens** → **Create Token** → plantilla **Edit Cloudflare Workers** → **Use template**.

- **Token name:** `github-actions-conteo-alevinos`
- **Permissions:** las de la plantilla y, con **+ Add more**, una fila más: **Account** · **Cloudflare Pages** · **Edit**.
- **Account Resources:** **Include** → la cuenta. **Zone Resources:** **Include** → **All zones**.
- **Continue to summary** → **Create Token** → copiar el token.

Para agregarle un permiso a un token que ya existe: en la lista de **API Tokens**, **⋯** del token → **Edit** → **+ Add more** → **Continue to summary** → **Update token**. El valor del token no cambia.

### 2. Secretos en GitHub

En el repositorio: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

- `CLOUDFLARE_API_TOKEN`: el token.
- `CLOUDFLARE_ACCOUNT_ID`: el número largo de la dirección del panel de Cloudflare (`dash.cloudflare.com/<Account ID>/...`).

### 3. Dominio propio en Pages

En Cloudflare: **Workers & Pages** → `contador-alevinos` → pestaña **Custom domains** → **Set up a custom domain** → escribir `contador.ibsen-soto.pro` → **Continue**. Cloudflare dice qué registro CNAME crear; tocar **Activate domain** (o **Begin CNAME setup**). Queda **Verifying** hasta que exista el registro del paso 4.

### 4. Registro CNAME en Hostinger

El DNS de `ibsen-soto.pro` está en Hostinger y **solo** se agrega este registro (no se toca nada más del dominio):

En hPanel: **Dominios** → `ibsen-soto.pro` → **DNS / Nameservers** → **Registros DNS**, en el formulario de arriba:

| Tipo | Nombre | Valor | TTL |
| --- | --- | --- | --- |
| CNAME | `contador` | `contador-alevinos.pages.dev` | 300 |

→ **Añadir registro**.

En minutos (a veces hasta una hora) Cloudflare marca el dominio como **Active** y emite el certificado (el candado).

## Comprobar antes de publicar

La CI lo hace sola, pero se puede correr lo mismo en el computador:

```bash
pnpm test && pnpm typecheck && pnpm e2e
```

`pnpm e2e` incluye las pruebas de la app compilada sin internet (`apps/web/e2e-pwa/`).

## Archivos de Cloudflare en el repositorio

- `apps/web/public/_redirects`: `/laboratorio` abre la app (que decide mostrar el laboratorio). Se reescribe a `/` y no a `/index.html`, porque Cloudflare redirige `/index.html` a `/` y se perdería la ruta.
- `apps/web/public/_headers`: `sw.js`, el manifiesto e `index.html` sin caché (para que lleguen las versiones nuevas); `assets/` con caché larga; permiso de cámara solo para la propia app.
- `.node-version`: Node 22.

## Antes (ya no se usa)

Hasta octubre de 2026 la app estuvo en un Worker de Cloudflare, `conteo-alevinos`, en <https://conteo-alevinos.ibsensotart23.workers.dev>. Ese Worker ya no recibe versiones nuevas; se puede borrar en **Workers & Pages** → `conteo-alevinos` → **Settings** → **Delete**.
