# Contador de alevinos

[![CI](https://github.com/Ibsen-Soto-Art/Conteo-alevinos/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Ibsen-Soto-Art/Conteo-alevinos/actions/workflows/ci.yml)

App web instalable para contar alevinos con la cámara del teléfono, sin internet.

- Diseño completo: [docs/arquitectura.md](docs/arquitectura.md)
- Guía para quien programa (y para Claude Code): [CLAUDE.md](CLAUDE.md)

## Empezar

Necesitas Node 20 o superior y pnpm (`npm i -g pnpm`).

```bash
pnpm install
pnpm test
```

## Publicación

La app se publica sola en Cloudflare Pages con cada `git push` a `main`, **solo si el CI pasa** (instalar, tipos, pruebas, compilación y Playwright): <https://contador.ibsen-soto.pro>.

- Con datos de ejemplo: <https://contador.ibsen-soto.pro/?demo>
- Laboratorio: <https://contador.ibsen-soto.pro/laboratorio>

Configuración y pasos: [docs/guias/desarrollo/publicar-una-version.md](docs/guias/desarrollo/publicar-una-version.md).
